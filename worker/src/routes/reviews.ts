// Reviews API Routes — verified purchase only, moderated, admin-guarded queues
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Bindings, Variables, ReviewRow } from '../types';
import { toReviewJSON } from '../types';
import { authGuard, customerGuard, isAdminRequest, normalizeEmail } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const reviews = new Hono<{ Bindings: Bindings; Variables: Variables & { customerId: string; customerEmail: string } }>();

const createSchema = z.object({
  productId: z.string().trim().min(1).max(128),
  userName: z.string().trim().min(2).max(80),
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

// POST /api/reviews — signed-in verified buyers only. Email comes from the
// customer JWT; order must be paid, non-cancelled, and contain this product.
// Pending until moderated.
reviews.post('/', customerGuard, rateLimiter(10, 3600), zValidator('json', createSchema), async (c) => {
  const body = c.req.valid('json');
  const email = c.get('customerEmail');
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
