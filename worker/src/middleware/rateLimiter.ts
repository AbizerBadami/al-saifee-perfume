import { Context, Next } from 'hono';

export const rateLimiter = (limit: number, windowSeconds: number) => {
  return async (c: Context, next: Next) => {
    // Basic pass-through for now since Cloudflare Workers don't share memory easily
    // between isolates without KV/Durable Objects. 
    // This resolves the missing module error.
    await next();
  };
};
