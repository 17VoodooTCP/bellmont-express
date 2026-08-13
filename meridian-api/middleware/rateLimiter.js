const rateLimit = require('express-rate-limit');

/* ─── General public rate limit: 100 req / 15 min ─────────────── */
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please try again in a few minutes.',
    retryAfter: '15 minutes'
  }
});

/* ─── Strict auth limit: 30 req / 15 min ──────────────────────── */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts. Please try again in 15 minutes.'
  }
});

/* ─── Tracking limit: 60 req / 10 min ─────────────────────────── */
const trackingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many tracking requests. Please slow down.'
  }
});

module.exports = { publicLimiter, authLimiter, trackingLimiter };
