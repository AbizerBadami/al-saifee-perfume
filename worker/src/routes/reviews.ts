// ============================================================
// Reviews API Routes
// ============================================================

import { Hono } from 'hono';
import type { Bindings, ReviewRow } from '../types';
import { toReviewJSON } from '../types';
import { authGuard } from '../middleware/auth';

const reviews = new Hono<{ Bindings: Bindings }>();

// GET /api/reviews — All reviews (optionally filter by productId)
reviews.get('/', async (c) => {
  const productId = c.req.query('productId');

  let results: ReviewRow[];
  if (productId) {
    const resp = await c.env.DB.prepare(
      'SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC'
    ).bind(productId).all<ReviewRow>();
    results = resp.results;
  } else {
    const resp = await c.env.DB.prepare(
      'SELECT * FROM reviews ORDER BY created_at DESC'
    ).all<ReviewRow>();
    results = resp.results;
  }

  return c.json({ reviews: results.map(toReviewJSON), total: results.length, status: 'success' });
});

// POST /api/reviews — Submit a review (public)
reviews.post('/', async (c) => {
  const body = await c.req.json();
  const id = `rev-${Date.now()}`;
  const now = new Date().toISOString();

  if (!body.productId || !body.userName || !body.rating) {
    return c.json({ error: 'productId, userName, and rating are required' }, 400);
  }

  await c.env.DB.prepare(`
    INSERT INTO reviews (id, product_id, user_name, user_email, rating, comment, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'Approved', ?)
  `).bind(id, body.productId, body.userName, body.userEmail || '', body.rating, body.comment || '', now).run();

  // Update product rating average
  const stats = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt, AVG(rating) as avg_rating FROM reviews WHERE product_id = ? AND status = ?'
  ).bind(body.productId, 'Approved').first<{ cnt: number; avg_rating: number }>();

  if (stats) {
    await c.env.DB.prepare(
      'UPDATE products SET rating = ?, review_count = ? WHERE id = ?'
    ).bind(Math.round(stats.avg_rating * 10) / 10, stats.cnt, body.productId).run();
  }

  return c.json({ id, status: 'success', message: 'Review submitted' }, 201);
});

// PATCH /api/reviews/:id — Moderate a review (admin only)
reviews.patch('/:id', authGuard, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await c.env.DB.prepare('SELECT id FROM reviews WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Review not found' }, 404);

  if (body.status && ['Approved', 'Pending', 'Rejected'].includes(body.status)) {
    await c.env.DB.prepare('UPDATE reviews SET status = ? WHERE id = ?').bind(body.status, id).run();
  }

  return c.json({ id, status: 'success', message: 'Review updated' });
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
