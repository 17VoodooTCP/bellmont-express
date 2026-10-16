import { BadRequestException } from '@nestjs/common';

/* Small, explicit input checks. The API takes JSON from public clients, so
   every field is coerced to its type, trimmed and length-capped here rather
   than trusted. Errors name the field so forms can show them. */

type Body = Record<string, unknown> | undefined | null;

/* JSON gives us strings, numbers, booleans — or objects and arrays, which
   String() would silently turn into "[object Object]" and store. Those are
   rejected instead. */
function scalar(raw: unknown, label: string): string {
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  throw new BadRequestException(`${label} has an invalid value.`);
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function str(
  body: Body,
  key: string,
  label: string,
  opts: { required?: boolean; min?: number; max?: number } = {},
): string | null {
  const raw = body?.[key];
  const value = raw == null ? '' : scalar(raw, label).trim();
  if (!value) {
    if (opts.required) throw new BadRequestException(`${label} is required.`);
    return null;
  }
  if (opts.min && value.length < opts.min) {
    throw new BadRequestException(
      `${label} must be at least ${opts.min} characters.`,
    );
  }
  if (value.length > (opts.max ?? 500)) {
    throw new BadRequestException(
      `${label} must be ${opts.max ?? 500} characters or fewer.`,
    );
  }
  return value;
}

export function num(
  body: Body,
  key: string,
  label: string,
  opts: { min?: number; max?: number } = {},
): number | null {
  const raw = body?.[key];
  if (raw == null || raw === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value))
    throw new BadRequestException(`${label} must be a number.`);
  if (opts.min != null && value < opts.min)
    throw new BadRequestException(`${label} must be at least ${opts.min}.`);
  if (opts.max != null && value > opts.max)
    throw new BadRequestException(`${label} must be at most ${opts.max}.`);
  return value;
}

export function date(body: Body, key: string, label: string): Date | null {
  const raw = body?.[key];
  if (raw == null || raw === '') return null;
  const value = new Date(scalar(raw, label));
  if (Number.isNaN(value.getTime()))
    throw new BadRequestException(`${label} is not a valid date.`);
  return value;
}

export function oneOf<T extends string>(
  body: Body,
  key: string,
  label: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = body?.[key];
  if (raw == null || raw === '') return fallback;
  const value = scalar(raw, label) as T;
  if (!allowed.includes(value))
    throw new BadRequestException(`${label} is not a valid option.`);
  return value;
}

/** Password rule: length is what actually resists guessing. */
export function password(
  body: Body,
  key = 'password',
  label = 'Password',
): string {
  const raw = body?.[key];
  const value = raw == null ? '' : scalar(raw, label);
  if (value.length < 8)
    throw new BadRequestException(`${label} must be at least 8 characters.`);
  if (value.length > 200)
    throw new BadRequestException(`${label} is too long.`);
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    throw new BadRequestException(
      `${label} must contain letters and at least one number.`,
    );
  }
  return value;
}

/** Short random code from an unambiguous alphabet (no 0/O, 1/I/L). */
export function shortCode(length: number): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++)
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

/** YYMMDD in UTC, for human references. */
export function ymd(d = new Date()): string {
  return d.toISOString().slice(2, 10).replace(/-/g, '');
}
