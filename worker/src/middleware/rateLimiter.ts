import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';

export const rateLimiter = (limit: number, windowSeconds: number) => {
  return createMiddleware(async (c: Context, next: Next) => {
    // Basic pass-through for now since Cloudflare Workers don't share memory easily
    // between isolates without KV/Durable Objects. 
    // This resolves the missing module error.
    await next();
  });
};

