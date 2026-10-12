// ============================================================
// Al-Saifee Perfumes — Cloudflare Worker Entry Point
// Hardened with:
//   - Strict CORS origin filtering (denies arbitrary origins)
//   - OWASP Security Headers & Razorpay-compliant CSP
//   - Sanitized global error handler returning generic message + requestId
//   - Mounted route modules with full RBAC authentication
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
import checkout from './routes/checkout';
import tasks from './routes/tasks';

const app = new Hono<{ Bindings: Bindings }>();

// ---------- Global Middleware ----------

// Request logging (Worker logs / wrangler tail)
app.use('*', logger());

// OWASP Security Headers & CSP
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'SAMEORIGIN');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header('X-Robots-Tag', 'noindex, nofollow');
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://api.razorpay.com; " +
    "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://*.workers.dev; " +
    "frame-src https://api.razorpay.com https://checkout.razorpay.com; " +
    "img-src 'self' data: blob: https://images.unsplash.com https://*.razorpay.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "object-src 'none'; " +
    "base-uri 'self';"
  );
});

// Strict CORS — allow only explicit frontend origin, reject unknown origins
app.use(
  '/api/*',
  cors({
    origin: (origin, c) => {
      if (!origin) return '';
      const allowedOrigin = c.env.FRONTEND_URL?.replace(/\/+$/, '');
      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigin && normalizedOrigin === allowedOrigin) {
        return origin;
      }
      return '';
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
      settings: '/api/settings',
      auth: '/api/auth',
      checkout: '/api/checkout',
      tasks: '/api/tasks',
    },
  });
});

// ---------- Mount route modules ----------

app.route('/api/products', products);
app.route('/api/orders', orders);
app.route('/api/reviews', reviews);
app.route('/api/settings', settings);
app.route('/api/auth', auth);
app.route('/api/checkout', checkout);
app.route('/api/tasks', tasks);

// ---------- 404 fallback ----------

app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// ---------- Global error handler (Sanitized) ----------

app.onError((err, c) => {
  const requestId = c.req.header('cf-ray') || crypto.randomUUID();
  console.error(`[Unhandled error | Request ID ${requestId}]:`, err);
  return c.json(
    {
      error: 'Internal Server Error',
      requestId,
      message: 'An error occurred while processing your request. Please quote the requestId to support.',
    },
    500
  );
});

export default app;
