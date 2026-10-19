import { assertHuman, turnstileEnabled } from './turnstile';

const ON = { TURNSTILE_SECRET_KEY: 'test-secret' } as NodeJS.ProcessEnv;
const OFF = {} as NodeJS.ProcessEnv;

/* Stand-in for Cloudflare's siteverify endpoint. */
function cloudflare(...answers: (object | Error)[]) {
  const calls: unknown[] = [];
  const queue = [...answers];
  global.fetch = jest.fn((_url: string, init: { body: string }) => {
    calls.push(JSON.parse(init.body));
    const next = queue.shift() ?? new Error('no more answers');
    return next instanceof Error
      ? Promise.reject(next)
      : Promise.resolve({ ok: true, json: () => Promise.resolve(next) });
  }) as unknown as typeof fetch;
  return calls as {
    secret: string;
    response: string;
    remoteip?: string;
    idempotency_key: string;
  }[];
}

describe('assertHuman', () => {
  it('is off until a secret key is configured', async () => {
    expect(turnstileEnabled(OFF)).toBe(false);
    await expect(
      assertHuman(undefined, '1.2.3.4', 'login', OFF),
    ).resolves.toBeUndefined();
  });

  it('asks for the check when no token is sent', async () => {
    await expect(assertHuman('', '1.2.3.4', 'login', ON)).rejects.toThrow(
      'Please complete the security check.',
    );
  });

  it('passes a token Cloudflare accepts, sending secret, token and IP', async () => {
    const calls = cloudflare({ success: true, action: 'login' });
    await expect(
      assertHuman('tok', '1.2.3.4', 'login', ON),
    ).resolves.toBeUndefined();
    expect(calls[0]).toMatchObject({
      secret: 'test-secret',
      response: 'tok',
      remoteip: '1.2.3.4',
    });
  });

  it('rejects a token Cloudflare refuses', async () => {
    cloudflare({ success: false, 'error-codes': ['invalid-input-response'] });
    await expect(assertHuman('bad', undefined, 'login', ON)).rejects.toThrow(
      'The security check failed.',
    );
  });

  it('explains an expired or reused token', async () => {
    cloudflare({ success: false, 'error-codes': ['timeout-or-duplicate'] });
    await expect(assertHuman('old', undefined, 'login', ON)).rejects.toThrow(
      'expired',
    );
  });

  it('rejects a token solved on a different form', async () => {
    cloudflare({ success: true, action: 'register' });
    await expect(assertHuman('tok', undefined, 'login', ON)).rejects.toThrow(
      'The security check failed.',
    );
  });

  it('retries once with the same idempotency key, then gives up clearly', async () => {
    const calls = cloudflare(new Error('ECONNRESET'), new Error('ECONNRESET'));
    await expect(assertHuman('tok', undefined, 'login', ON)).rejects.toThrow(
      "couldn't be completed",
    );
    expect(calls).toHaveLength(2);
    expect(calls[0].idempotency_key).toBe(calls[1].idempotency_key);
  });

  it('succeeds when the retry gets through', async () => {
    cloudflare(new Error('ECONNRESET'), { success: true });
    await expect(
      assertHuman('tok', undefined, 'login', ON),
    ).resolves.toBeUndefined();
  });
});
