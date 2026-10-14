// Simple in-memory token-bucket rate limiter for a single Worker isolate.
// NOTE: Workers run on many isolates, so this is best-effort only.
// Production MUST also enable Cloudflare Rate Limiting rules / Turnstile on
// /api/auth/*, /api/checkout/* and /api/reviews (see DEPLOYMENT.md).
import { createMiddleware } from 'hono/factory';

const buckets = new Map<string, { count: number; reset: number }>();

export const rateLimiter = (limit: number, windowSeconds: number) => {
  return createMiddleware(async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const key = `${c.req.path}:${ip}`;
    const now = Date.now();
    const entry = buckets.get(key);
    if (!entry || now > entry.reset) {
      buckets.set(key, { count: 1, reset: now + windowSeconds * 1000 });
      await next();
      return;
    }
    entry.count += 1;
    if (entry.count > limit) {
      return c.json({ error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' }, 429);
    }
    await next();
  });
};
