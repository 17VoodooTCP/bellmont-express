import {
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

/**
 * Cloudflare Turnstile (captcha) verification for public forms.
 *
 * Off until TURNSTILE_SECRET_KEY is set, so the code can ship before the
 * keys exist without locking anyone out. Once set, every protected request
 * must carry a token from the widget, and Cloudflare must confirm it.
 *
 * Tokens are single-use and live 5 minutes; the frontend resets the widget
 * after each attempt.
 */
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 8_000;
const ATTEMPTS = 2;
const logger = new Logger('Turnstile');

type SiteverifyResult = {
  success: boolean;
  'error-codes'?: string[];
  action?: string;
  hostname?: string;
};

export function turnstileEnabled(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.TURNSTILE_SECRET_KEY?.trim());
}

async function siteverify(
  secret: string,
  token: string,
  ip: string | undefined,
): Promise<SiteverifyResult | null> {
  /* The same key on a retry tells Cloudflare it's one validation, so a
     retry after a dropped response doesn't fail as "already used". */
  const idempotencyKey = randomUUID();
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(SITEVERIFY, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          secret,
          response: token,
          remoteip: ip,
          idempotency_key: idempotencyKey,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) return (await res.json()) as SiteverifyResult;
      logger.warn(`siteverify HTTP ${res.status} (attempt ${attempt})`);
    } catch (err) {
      logger.warn(
        `siteverify unreachable (attempt ${attempt}): ${(err as Error).message}`,
      );
    }
  }
  return null;
}

/**
 * Throws unless `token` passes Turnstile. `action` must match the action
 * the widget was rendered with, so a token solved on one form can't be
 * replayed against another.
 */
export async function assertHuman(
  token: unknown,
  ip: string | undefined,
  action: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return;

  if (typeof token !== 'string' || !token || token.length > 2048) {
    throw new BadRequestException('Please complete the security check.');
  }

  const result = await siteverify(secret, token, ip);
  /* Cloudflare's guidance: if verification can't be done, treat it as
     failed. Logins stay possible as soon as Cloudflare answers again. */
  if (!result) {
    throw new ServiceUnavailableException(
      "The security check couldn't be completed. Please try again in a moment.",
    );
  }
  if (!result.success) {
    const codes = result['error-codes'] ?? [];
    logger.warn(`rejected (${action}): ${codes.join(', ') || 'no code'}`);
    throw new BadRequestException(
      codes.includes('timeout-or-duplicate')
        ? 'The security check expired. Please try again.'
        : 'The security check failed. Please try again.',
    );
  }
  if (result.action && result.action !== action) {
    logger.warn(`action mismatch: expected ${action}, got ${result.action}`);
    throw new BadRequestException(
      'The security check failed. Please try again.',
    );
  }
}
