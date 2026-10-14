// ============================================================
// Al-Saifee Perfumes — Cloudflare Worker Entry Point
<<<<<<< HEAD
// Hardened with:
//   - Strict CORS origin filtering (denies arbitrary origins)
//   - OWASP Security Headers & Razorpay-compliant CSP
//   - Sanitized global error handler returning generic message + requestId
//   - Mounted route modules with full RBAC authentication
=======
>>>>>>> 03fb960 (rebuild)
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
import tasks from './routes/tasks';

const app = new Hono<{ Bindings: Bindings }>();

<<<<<<< HEAD
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
=======
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
>>>>>>> 03fb960 (rebuild)
app.use(
  '/api/*',
  cors({
    origin: (origin, c) => {
<<<<<<< HEAD
      if (!origin) return '';
      const allowedOrigin = c.env.FRONTEND_URL?.replace(/\/+$/, '');
      const normalizedOrigin = origin.replace(/\/+$/, '');
      // Allow production frontend
      if (allowedOrigin && normalizedOrigin === allowedOrigin) {
        return origin;
      }
      // Allow local development origins (Vite / localhost)
      if (
        normalizedOrigin === 'http://localhost:3000' ||
        normalizedOrigin === 'http://localhost:5173' ||
        normalizedOrigin === 'http://localhost:4173' ||
        normalizedOrigin === 'http://127.0.0.1:3000' ||
        normalizedOrigin === 'http://127.0.0.1:5173'
      ) {
        return origin;
      }
      return '';
=======
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
>>>>>>> 03fb960 (rebuild)
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
      tasks: '/api/tasks',
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
app.route('/api/tasks', tasks);

app.notFound((c) => {
  return c.json({ error: 'Not Found', code: 'NOT_FOUND' }, 404);
});

<<<<<<< HEAD
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
=======
app.onError((err, c) => {
  console.error('Unhandled error:', err instanceof Error ? err.stack || err.message : err);
  // Never leak internal messages to clients
  return c.json({ error: 'Internal Server Error', code: 'INTERNAL' }, 500);
>>>>>>> 03fb960 (rebuild)
});

export default app;
