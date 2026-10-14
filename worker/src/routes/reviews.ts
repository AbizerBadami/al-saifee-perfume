<<<<<<< HEAD
// ============================================================
// Reviews API Routes
// Hardened with:
//   - PII protection: userEmail stripped from public endpoints
//   - Zod schema validation for review submission and moderation
//   - Rate limiting on public review submissions
//   - Verification of product existence before review creation
//   - Protected admin moderation endpoints
// ============================================================

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Bindings, ReviewRow } from '../types';
import { toReviewJSON, toAdminReviewJSON } from '../types';
import { authGuard } from '../middleware/auth';
=======
// Reviews API Routes — verified purchase only, moderated, admin-guarded queues
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Bindings, ReviewRow } from '../types';
import { toReviewJSON } from '../types';
import { authGuard, isAdminRequest, normalizeEmail } from '../middleware/auth';
>>>>>>> 03fb960 (rebuild)
import { rateLimiter } from '../middleware/rateLimiter';

const reviews = new Hono<{ Bindings: Bindings }>();

<<<<<<< HEAD
// ---------- Validation Schemas ----------

const reviewCreateSchema = z.object({
  productId: z.string().trim().min(1, 'Product ID is required').max(64),
  userName: z.string().trim().min(1, 'Name is required').max(100),
  userEmail: z.string().trim().email('Invalid email address').max(255).optional().or(z.literal('')),
  rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  comment: z.string().trim().max(1000, 'Comment cannot exceed 1000 characters').default(''),
});

const reviewModerateSchema = z.object({
  status: z.enum(['Approved', 'Pending', 'Rejected']),
});

// ---------- Route Handlers ----------

// GET /api/reviews — Public reviews (userEmail is NEVER returned)
reviews.get('/', rateLimiter(30, 60), async (c) => {
  const productId = c.req.query('productId');

  let results: ReviewRow[];
  if (productId) {
    const resp = await c.env.DB.prepare(
      "SELECT * FROM reviews WHERE product_id = ? AND status = 'Approved' ORDER BY created_at DESC"
    ).bind(productId).all<ReviewRow>();
    results = resp.results;
  } else {
    const resp = await c.env.DB.prepare(
      "SELECT * FROM reviews WHERE status = 'Approved' ORDER BY created_at DESC"
    ).all<ReviewRow>();
    results = resp.results;
  }

  return c.json({ reviews: results.map(toReviewJSON), total: results.length, status: 'success' });
});

// GET /api/reviews/admin — Admin view including unapproved reviews and userEmail
reviews.get('/admin', authGuard, async (c) => {
  const resp = await c.env.DB.prepare(
    'SELECT * FROM reviews ORDER BY created_at DESC'
  ).all<ReviewRow>();

  return c.json({ reviews: resp.results.map(toAdminReviewJSON), total: resp.results.length, status: 'success' });
});

// POST /api/reviews — Submit a review (rate limited, validated)
reviews.post('/', rateLimiter(5, 60), zValidator('json', reviewCreateSchema), async (c) => {
  const body = c.req.valid('json');
  const now = new Date().toISOString();
  const id = `rev-${crypto.randomUUID().slice(0, 12)}`;

  // Verify product exists
  const product = await c.env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(body.productId).first();
  if (!product) {
    return c.json({ error: 'Referenced product does not exist' }, 404);
  }

  await c.env.DB.prepare(`
    INSERT INTO reviews (id, product_id, user_name, user_email, rating, comment, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'Approved', ?)
  `).bind(
    id,
    body.productId,
    body.userName,
    body.userEmail || '',
    body.rating,
    body.comment,
    now
  ).run();

  // Update product rating average
  const stats = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt, AVG(rating) as avg_rating FROM reviews WHERE product_id = ? AND status = ?'
  ).bind(body.productId, 'Approved').first<{ cnt: number; avg_rating: number }>();

  if (stats) {
=======
const createSchema = z.object({
  productId: z.string().trim().min(1).max(128),
  userName: z.string().trim().min(2).max(80),
  userEmail: z.string().trim().email().max(255),
  orderNumber: z.string().trim().min(3).max(64),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(2).max(2000),
});

const moderateSchema = z.object({
  status: z.enum(['Approved', 'Pending', 'Rejected']),
});

async function recalc(db: D1Database, productId: string) {
  const stats = await db.prepare(
    'SELECT COUNT(*) as cnt, COALESCE(AVG(rating), 5.0) as avg_rating FROM reviews WHERE product_id = ? AND status = ?'
  ).bind(productId, 'Approved').first<{ cnt: number; avg_rating: number }>();
  if (stats) {
    await db.prepare('UPDATE products SET rating = ?, review_count = ? WHERE id = ?')
      .bind(Math.round(stats.avg_rating * 10) / 10, stats.cnt, productId).run();
  }
}

// GET /api/reviews — public returns Approved only (no emails, no order numbers).
// Non-Approved status queues require a valid admin JWT.
reviews.get('/', async (c) => {
  const productId = (c.req.query('productId') || '').slice(0, 128);
  const status = c.req.query('status');
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50', 10) || 50));
  const offset = Math.max(0, parseInt(c.req.query('offset') || '0', 10) || 0);

  const wantsRestricted = status !== undefined && status !== 'Approved';
  const admin = wantsRestricted ? await isAdminRequest(c) : false;
  if (wantsRestricted && !admin) {
    return c.json({ error: 'Sign in as admin to view the moderation queue', code: 'UNAUTHORIZED' }, 401);
  }

  const where: string[] = [];
  const params: unknown[] = [];
  if (productId) { where.push('product_id = ?'); params.push(productId); }
  if (status === 'Pending' || status === 'Approved' || status === 'Rejected') {
    where.push('status = ?'); params.push(status);
  } else if (status !== undefined) {
    return c.json({ error: 'Invalid status filter', code: 'BAD_REQUEST' }, 400);
  } else {
    where.push('status = ?'); params.push('Approved');
  }
  const clause = `WHERE ${where.join(' AND ')}`;
  const countRow = await c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM reviews ${clause}`).bind(...params).first<{ cnt: number }>();
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM reviews ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all<ReviewRow>();

  const includePrivate = admin;
  return c.json({ reviews: results.map((r) => toReviewJSON(r, includePrivate)), total: countRow?.cnt ?? results.length, limit, offset });
});

// POST /api/reviews — verified buyers only. Requires paid, non-cancelled order
// containing this product, with matching checkout email. Pending until moderated.
reviews.post('/', rateLimiter(10, 3600), zValidator('json', createSchema), async (c) => {
  const body = c.req.valid('json');
  const email = normalizeEmail(body.userEmail);
  const orderNumber = body.orderNumber.trim();

  const product = await c.env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(body.productId).first();
  if (!product) return c.json({ error: 'Product not found', code: 'NOT_FOUND' }, 404);

  const order = await c.env.DB.prepare(
    'SELECT id, order_number, customer_email, payment_status, status FROM orders WHERE order_number = ? COLLATE NOCASE'
  ).bind(orderNumber).first<{ id: string; order_number: string; customer_email: string; payment_status: string; status: string }>();
  if (!order) {
    return c.json({ error: "We couldn't find that order number. Check your confirmation email.", code: 'ORDER_NOT_FOUND' }, 404);
  }
  if (normalizeEmail(order.customer_email) !== email) {
    return c.json({ error: "That email doesn't match this order. Use the email from checkout.", code: 'EMAIL_MISMATCH' }, 403);
  }
  if (order.payment_status !== 'Paid') {
    return c.json({ error: 'Only paid orders can leave reviews.', code: 'NOT_PAID' }, 403);
  }
  if (order.status === 'Cancelled') {
    return c.json({ error: "Cancelled orders can't leave reviews.", code: 'ORDER_CANCELLED' }, 403);
  }

  const item = await c.env.DB.prepare('SELECT 1 as ok FROM order_items WHERE order_id = ? AND product_id = ?')
    .bind(order.id, body.productId).first<{ ok: number }>();
  if (!item) {
    return c.json({ error: "This product wasn't in that order. Only verified buyers can review.", code: 'NOT_PURCHASED' }, 403);
  }

  const dup = await c.env.DB.prepare(
    'SELECT id FROM reviews WHERE product_id = ? AND order_number = ? COLLATE NOCASE'
  ).bind(body.productId, orderNumber).first();
  if (dup) {
    return c.json({ error: "You've already reviewed this product for this order.", code: 'DUPLICATE' }, 409);
  }

  const id = `rev-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  try {
>>>>>>> 03fb960 (rebuild)
    await c.env.DB.prepare(
      `INSERT INTO reviews (id, product_id, user_name, user_email, rating, comment, status, order_number, verified_purchase, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, 1, ?)`
    ).bind(id, body.productId, body.userName.trim(), email, body.rating, body.comment.trim(), order.order_number, now).run();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('UNIQUE')) {
      return c.json({ error: "You've already reviewed this product for this order.", code: 'DUPLICATE' }, 409);
    }
    throw e;
  }

<<<<<<< HEAD
  return c.json({ id, status: 'success', message: 'Review submitted successfully' }, 201);
});

// PATCH /api/reviews/:id — Moderate a review (admin only)
reviews.patch('/:id', authGuard, zValidator('json', reviewModerateSchema), async (c) => {
  const id = c.req.param('id');
  const { status } = c.req.valid('json');

  const existing = await c.env.DB.prepare('SELECT id, product_id FROM reviews WHERE id = ?').bind(id).first<{ id: string; product_id: string }>();
  if (!existing) return c.json({ error: 'Review not found' }, 404);

  await c.env.DB.prepare('UPDATE reviews SET status = ? WHERE id = ?').bind(status, id).run();

  // Recalculate product rating after moderation change
  const stats = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt, COALESCE(AVG(rating), 5.0) as avg_rating FROM reviews WHERE product_id = ? AND status = ?'
  ).bind(existing.product_id, 'Approved').first<{ cnt: number; avg_rating: number }>();

  if (stats) {
    await c.env.DB.prepare(
      'UPDATE products SET rating = ?, review_count = ? WHERE id = ?'
    ).bind(Math.round(stats.avg_rating * 10) / 10, stats.cnt, existing.product_id).run();
  }

  return c.json({ id, status: 'success', message: `Review status updated to ${status}` });
=======
  const created = await c.env.DB.prepare('SELECT * FROM reviews WHERE id = ?').bind(id).first<ReviewRow>();
  return c.json({ review: toReviewJSON(created!, false), message: 'Thanks — your verified review was submitted for moderation.' }, 201);
});

// PATCH /api/reviews/:id — admin moderation
reviews.patch('/:id', authGuard, zValidator('json', moderateSchema), async (c) => {
  const id = c.req.param('id').slice(0, 128);
  const { status } = c.req.valid('json');

  const existing = await c.env.DB.prepare('SELECT id, product_id FROM reviews WHERE id = ?').bind(id).first<{ id: string; product_id: string }>();
  if (!existing) return c.json({ error: 'Review not found', code: 'NOT_FOUND' }, 404);

  await c.env.DB.prepare('UPDATE reviews SET status = ? WHERE id = ?').bind(status, id).run();
  await recalc(c.env.DB, existing.product_id);

  const updated = await c.env.DB.prepare('SELECT * FROM reviews WHERE id = ?').bind(id).first<ReviewRow>();
  return c.json({ review: toReviewJSON(updated!, true) });
>>>>>>> 03fb960 (rebuild)
});

// DELETE /api/reviews/:id — admin only
reviews.delete('/:id', authGuard, async (c) => {
  const id = c.req.param('id').slice(0, 128);
  const review = await c.env.DB.prepare('SELECT product_id FROM reviews WHERE id = ?').bind(id).first<{ product_id: string }>();
  if (!review) return c.json({ error: 'Review not found', code: 'NOT_FOUND' }, 404);

  await c.env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run();
  await recalc(c.env.DB, review.product_id);
  return c.json({ id, status: 'success' });
});

export default reviews;
