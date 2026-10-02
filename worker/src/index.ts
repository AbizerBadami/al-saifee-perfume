// ============================================================
// Al-Saifee Perfumes — Cloudflare Worker Entry Point
// Hono app that mounts all route modules and CORS middleware
// ============================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Bindings } from './types';

import products from './routes/products';
import orders from './routes/orders';
import reviews from './routes/reviews';
import coupons from './routes/coupons';
import settings from './routes/settings';
import auth from './routes/auth';
import checkout from './routes/checkout';

const app = new Hono<{ Bindings: Bindings }>();

// ---------- Middleware ----------

// Request logging (shows in wrangler dev / Worker logs)
app.use('*', logger());

// CORS — allow the frontend origin
app.use(
  '/api/*',
  cors({
    origin: (origin, c) => {
      const allowed = [
        c.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'http://localhost:5173',
      ];
      return allowed.includes(origin) ? origin : allowed[0];
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

// ---------- Health check ----------

app.get('/', (c) => {
  return c.json({
    name: 'Al-Saifee Perfumes API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      products: '/api/products',
      orders: '/api/orders',
      reviews: '/api/reviews',
      coupons: '/api/coupons',
      settings: '/api/settings',
      auth: '/api/auth',
      checkout: '/api/checkout',
    },
  });
});

// ---------- Mount route modules ----------

app.route('/api/products', products);
app.route('/api/orders', orders);
app.route('/api/reviews', reviews);
app.route('/api/coupons', coupons);
app.route('/api/settings', settings);
app.route('/api/auth', auth);
app.route('/api/checkout', checkout);

// ---------- 404 fallback ----------

app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// ---------- Global error handler ----------

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

// Native Worker fetch export
export default app;
