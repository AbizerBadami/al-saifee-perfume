// ============================================================
// Coupons API Routes
// ============================================================

import { Hono } from 'hono';
import type { Bindings, CouponRow } from '../types';
import { toCouponJSON } from '../types';
import { authGuard } from '../middleware/auth';

const coupons = new Hono<{ Bindings: Bindings }>();

// GET /api/coupons — List all coupons (admin only)
coupons.get('/', authGuard, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM coupons ORDER BY created_at DESC'
  ).all<CouponRow>();

  return c.json({ coupons: results.map(toCouponJSON), total: results.length, status: 'success' });
});

// POST /api/coupons/validate — Validate a coupon code (public)
coupons.post('/validate', async (c) => {
  const body = await c.req.json();
  const code = (body.code || '').trim().toUpperCase();
  const cartTotal: number = body.cartTotal ?? 0;

  if (!code) return c.json({ valid: false, message: 'Coupon code required' });

  const row = await c.env.DB.prepare(
    'SELECT * FROM coupons WHERE code = ?'
  ).bind(code).first<CouponRow>();

  if (!row) return c.json({ valid: false, message: 'Invalid promotional code' });
  if (!row.active) return c.json({ valid: false, message: 'This coupon has expired' });
  if (row.min_order_amount && cartTotal < row.min_order_amount) {
    return c.json({ valid: false, message: `Minimum order of ₹${row.min_order_amount} required for this code` });
  }

  return c.json({
    valid: true,
    code: row.code,
    discountType: row.discount_type,
    discountValue: row.discount_value,
  });
});

// POST /api/coupons — Create coupon (admin only)
coupons.post('/', authGuard, async (c) => {
  const body = await c.req.json();
  const id = `coup-${Date.now()}`;
  const now = new Date().toISOString();

  if (!body.code || !body.discountType) {
    return c.json({ error: 'code and discountType are required' }, 400);
  }

  await c.env.DB.prepare(`
    INSERT INTO coupons (id, code, discount_type, discount_value, min_order_amount, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, body.code.toUpperCase(), body.discountType,
    body.discountValue || 0, body.minOrderAmount || 0,
    body.active !== false ? 1 : 0, now
  ).run();

  const created = await c.env.DB.prepare('SELECT * FROM coupons WHERE id = ?').bind(id).first<CouponRow>();
  return c.json(toCouponJSON(created!), 201);
});

// PUT /api/coupons/:id — Update coupon (admin only)
coupons.put('/:id', authGuard, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await c.env.DB.prepare('SELECT id FROM coupons WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Coupon not found' }, 404);

  await c.env.DB.prepare(`
    UPDATE coupons SET code = ?, discount_type = ?, discount_value = ?,
      min_order_amount = ?, active = ?
    WHERE id = ?
  `).bind(
    body.code?.toUpperCase(), body.discountType, body.discountValue,
    body.minOrderAmount || 0, body.active !== false ? 1 : 0, id
  ).run();

  const updated = await c.env.DB.prepare('SELECT * FROM coupons WHERE id = ?').bind(id).first<CouponRow>();
  return c.json(toCouponJSON(updated!));
});

// DELETE /api/coupons/:id — Delete coupon (admin only)
coupons.delete('/:id', authGuard, async (c) => {
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT id FROM coupons WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Coupon not found' }, 404);

  await c.env.DB.prepare('DELETE FROM coupons WHERE id = ?').bind(id).run();
  return c.json({ id, status: 'success', message: 'Coupon deleted' });
});

export default coupons;
