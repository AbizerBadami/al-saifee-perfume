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
import { rateLimiter } from '../middleware/rateLimiter';

const reviews = new Hono<{ Bindings: Bindings }>();

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
    await c.env.DB.prepare(
      'UPDATE products SET rating = ?, review_count = ? WHERE id = ?'
    ).bind(Math.round(stats.avg_rating * 10) / 10, stats.cnt, body.productId).run();
  }

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
});

// DELETE /api/reviews/:id — Delete a review (admin only)
reviews.delete('/:id', authGuard, async (c) => {
  const id = c.req.param('id');

  const review = await c.env.DB.prepare('SELECT product_id FROM reviews WHERE id = ?').bind(id).first<{ product_id: string }>();
  if (!review) return c.json({ error: 'Review not found' }, 404);

  await c.env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run();

  // Recalculate product rating
  const stats = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt, COALESCE(AVG(rating), 5.0) as avg_rating FROM reviews WHERE product_id = ? AND status = ?'
  ).bind(review.product_id, 'Approved').first<{ cnt: number; avg_rating: number }>();

  if (stats) {
    await c.env.DB.prepare(
      'UPDATE products SET rating = ?, review_count = ? WHERE id = ?'
    ).bind(Math.round(stats.avg_rating * 10) / 10, stats.cnt, review.product_id).run();
  }

  return c.json({ id, status: 'success', message: 'Review deleted' });
});

export default reviews;
