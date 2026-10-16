import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Fixed-window rate limiter, held in memory.
 *
 * Enough for a single API instance, which is what the free Render plan runs;
 * a second instance would need a shared store. Used on the endpoints worth
 * guessing at — sign-in and registration — so a password cannot be
 * brute-forced and accounts cannot be mass-created.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Counts a hit for `key`, throwing 429 once the window's limit is passed. */
  check(key: string) {
    const now = Date.now();
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      this.sweep(now);
      return;
    }
    entry.count += 1;
    if (entry.count > this.limit) {
      const minutes = Math.max(1, Math.ceil((entry.resetAt - now) / 60_000));
      throw new HttpException(
        `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Forgets `key` — called after a successful sign-in. */
  reset(key: string) {
    this.hits.delete(key);
  }

  /* Bounded memory: drop expired windows now and then. */
  private sweep(now: number) {
    if (this.hits.size < 5000) return;
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
  }
}
