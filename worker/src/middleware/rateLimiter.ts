// ============================================================
// Rate Limiter Middleware for Cloudflare Workers
// Primary: Uses Cloudflare native Rate Limiting binding (c.env.RATE_LIMITER)
// Fallback: Sliding window in-memory limiter per isolate
// ============================================================

import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { Bindings, Variables } from '../types';

// In-memory sliding window fallback
const memoryBuckets = new Map<string, number[]>();

export const rateLimiter = (limit: number, windowSeconds: number) => {
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

    await next();
  });
};
