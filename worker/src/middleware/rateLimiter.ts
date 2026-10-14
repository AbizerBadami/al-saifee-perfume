<<<<<<< HEAD
// ============================================================
// Rate Limiter Middleware for Cloudflare Workers
// Primary: Uses Cloudflare native Rate Limiting binding (c.env.RATE_LIMITER)
// Fallback: Sliding window in-memory limiter per isolate
// ============================================================

import { Context, Next } from 'hono';
=======
// Simple in-memory token-bucket rate limiter for a single Worker isolate.
// NOTE: Workers run on many isolates, so this is best-effort only.
// Production MUST also enable Cloudflare Rate Limiting rules / Turnstile on
// /api/auth/*, /api/checkout/* and /api/reviews (see DEPLOYMENT.md).
>>>>>>> 03fb960 (rebuild)
import { createMiddleware } from 'hono/factory';
import type { Bindings, Variables } from '../types';

// In-memory sliding window fallback
const memoryBuckets = new Map<string, number[]>();

const buckets = new Map<string, { count: number; reset: number }>();

export const rateLimiter = (limit: number, windowSeconds: number) => {
<<<<<<< HEAD
  return createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
    const ip =
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-real-ip') ||
      c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
      '127.0.0.1';

    const route = c.req.path;
    const key = `${route}:${ip}`;

    // 1. Check Cloudflare Native Rate Limiting Binding if available
    if (c.env.RATE_LIMITER) {
      try {
        const outcome = await c.env.RATE_LIMITER.limit({ key });
        if (!outcome.success) {
          c.header('Retry-After', String(windowSeconds));
          return c.json(
            {
              error: 'Too many requests. Please slow down and try again later.',
              retryAfter: windowSeconds,
            },
            429
          );
        }
        await next();
        return;
      } catch (err) {
        console.warn('RateLimiter binding invocation notice, using memory fallback:', err);
      }
    }

    // 2. In-memory sliding window fallback
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const timestamps = (memoryBuckets.get(key) || []).filter((t) => now - t < windowMs);

    if (timestamps.length >= limit) {
      c.header('Retry-After', String(windowSeconds));
      return c.json(
        {
          error: 'Too many requests. Please slow down and try again later.',
          retryAfter: windowSeconds,
        },
        429
      );
    }

    timestamps.push(now);
    memoryBuckets.set(key, timestamps);

    // Periodic sweep of memory buckets if map exceeds threshold
    if (memoryBuckets.size > 1000) {
      for (const [k, v] of memoryBuckets.entries()) {
        const valid = v.filter((t) => now - t < windowMs);
        if (valid.length === 0) memoryBuckets.delete(k);
        else memoryBuckets.set(k, valid);
      }
    }

=======
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
>>>>>>> 03fb960 (rebuild)
    await next();
  });
};
