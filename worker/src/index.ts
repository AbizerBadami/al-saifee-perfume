// ============================================================
// Al-Saifee Perfumes — Cloudflare Worker Entry Point
// ============================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Bindings } from './types';

import products from './routes/products';
import orders from './routes/orders';
import reviews from './routes/reviews';
import settings from './routes/settings';
import auth from './routes/auth';
import customer from './routes/customer';
import checkout from './routes/checkout';

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', logger());

// Security headers on every response
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
});

// CORS — strict allowlist, no open reflector
app.use(
  '/api/*',
  cors({
    origin: (origin, c) => {
      if (!origin) return null;
      const configured = c.env.FRONTEND_URL?.replace(/\/$/, '');
      const allowed = new Set<string>([
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
      ]);
      if (configured) allowed.add(configured);
      if (allowed.has(origin)) return origin;
      // Preview deployments: allow only our Pages project subdomains
      try {
        const u = new URL(origin);
        if (u.hostname.endsWith('.pages.dev') && u.hostname.includes('al-saifee')) return origin;
      } catch {}
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

app.get('/', (c) => {
  return c.json({
    name: 'Al-Saifee Perfumes API',
    status: 'running',
    version: '1.1.0',
    endpoints: {
      products: '/api/products',
      orders: '/api/orders',
      reviews: '/api/reviews',
      settings: '/api/settings',
      auth: '/api/auth',
      customer: '/api/customer',
      checkout: '/api/checkout',
    },
  });
});

app.route('/api/products', products);
app.route('/api/orders', orders);
app.route('/api/reviews', reviews);
app.route('/api/settings', settings);
app.route('/api/auth', auth);
app.route('/api/customer', customer);
app.route('/api/checkout', checkout);

app.notFound((c) => {
  return c.json({ error: 'Not Found', code: 'NOT_FOUND' }, 404);
});

app.onError((err, c) => {
  console.error('Unhandled error:', err instanceof Error ? err.stack || err.message : err);
  // Never leak internal messages to clients
  return c.json({ error: 'Internal Server Error', code: 'INTERNAL' }, 500);
});

export default app;
