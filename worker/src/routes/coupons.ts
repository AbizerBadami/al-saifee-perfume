// ============================================================
// Coupons API Routes
// Secured with:
//   - Zod schema validation via @hono/zod-validator
//   - Rate limiting on public coupon validation endpoint (anti-enumeration)
//   - Parameterized D1 prepared statements
//   - RBAC authGuard protection on coupon management
// ============================================================

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Bindings, Variables, CouponRow } from '../types';
import { toCouponJSON } from '../types';
import { authGuard } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const coupons = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------- Zod Validation Schemas ----------

const idParamSchema = z.object({
  id: z.string().trim().min(1, 'Coupon ID is required').max(64),
});

const couponValidateSchema = z.object({
  code: z.string().trim().min(1, 'Coupon code is required').max(50),
  cartTotal: z.number().nonnegative('Cart total cannot be negative').default(0),
});

const couponCreateSchema = z.object({
  code: z.string().trim().min(2, 'Code must be at least 2 characters').max(50),
  discountType: z.enum(['percent', 'fixed'], { error: 'discountType must be "percent" or "fixed"' }),
  discountValue: z.number().positive('Discount value must be positive'),
  minOrderAmount: z.number().nonnegative('Minimum order amount cannot be negative').default(0),
  active: z.boolean().default(true),
});

const couponUpdateSchema = couponCreateSchema.partial();

// ---------- Route Handlers ----------

// GET /api/coupons — List all coupons (RBAC: Admin only)
coupons.get('/', authGuard, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM coupons ORDER BY created_at DESC'
  ).all<CouponRow>();

  return c.json({
    coupons: results.map(toCouponJSON),
    total: results.length,
    status: 'success',
  });
});

// POST /api/coupons/validate — Validate promo code at checkout (Rate-limited, Public)
coupons.post(
  '/validate',
  rateLimiter(10, 60), // Max 10 attempts per minute per IP to prevent code guessing
  zValidator('json', couponValidateSchema),
  async (c) => {
    const { code, cartTotal } = c.req.valid('json');
    const normalizedCode = code.toUpperCase();

    const row = await c.env.DB.prepare(
      'SELECT * FROM coupons WHERE code = ?'
    ).bind(normalizedCode).first<CouponRow>();

    if (!row) {
      return c.json({ valid: false, message: 'Invalid promotional code' }, 404);
    }

    if (!row.active) {
      return c.json({ valid: false, message: 'This coupon is no longer active' }, 400);
    }

    if (row.min_order_amount && cartTotal < row.min_order_amount) {
      return c.json(
        {
          valid: false,
          message: `Minimum order of ₹${row.min_order_amount} required to use this code`,
        },
        400
      );
    }

    return c.json({
      valid: true,
      code: row.code,
      discountType: row.discount_type,
      discountValue: row.discount_value,
    });
  }
);

// POST /api/coupons — Create new coupon (RBAC: Admin only)
coupons.post(
  '/',
  authGuard,
  zValidator('json', couponCreateSchema),
  async (c) => {
    const data = c.req.valid('json');
    const normalizedCode = data.code.toUpperCase();
    const id = `coup-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const existing = await c.env.DB.prepare(
      'SELECT id FROM coupons WHERE code = ?'
    ).bind(normalizedCode).first();

    if (existing) {
      return c.json({ error: 'Conflict', message: 'A coupon with this code already exists' }, 409);
    }

    await c.env.DB.prepare(`
      INSERT INTO coupons (id, code, discount_type, discount_value, min_order_amount, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      normalizedCode,
      data.discountType,
      data.discountValue,
      data.minOrderAmount,
      data.active ? 1 : 0,
      now
    ).run();

    const created = await c.env.DB.prepare(
      'SELECT * FROM coupons WHERE id = ?'
    ).bind(id).first<CouponRow>();

    return c.json(toCouponJSON(created!), 201);
  }
);

// PUT /api/coupons/:id — Update coupon (RBAC: Admin only)
coupons.put(
  '/:id',
  authGuard,
  zValidator('param', idParamSchema),
  zValidator('json', couponUpdateSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const updates = c.req.valid('json');

    const existing = await c.env.DB.prepare(
      'SELECT * FROM coupons WHERE id = ?'
    ).bind(id).first<CouponRow>();

    if (!existing) {
      return c.json({ error: 'Not Found', message: 'Coupon not found' }, 404);
    }

    const newCode = updates.code ? updates.code.toUpperCase() : existing.code;

    await c.env.DB.prepare(`
      UPDATE coupons SET
        code = ?,
        discount_type = ?,
        discount_value = ?,
        min_order_amount = ?,
        active = ?
      WHERE id = ?
    `).bind(
      newCode,
      updates.discountType ?? existing.discount_type,
      updates.discountValue ?? existing.discount_value,
      updates.minOrderAmount ?? existing.min_order_amount,
      updates.active !== undefined ? (updates.active ? 1 : 0) : existing.active,
      id
    ).run();

    const updated = await c.env.DB.prepare(
      'SELECT * FROM coupons WHERE id = ?'
    ).bind(id).first<CouponRow>();

    return c.json(toCouponJSON(updated!));
  }
);

// DELETE /api/coupons/:id — Delete coupon (RBAC: Admin only)
coupons.delete(
  '/:id',
  authGuard,
  zValidator('param', idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');

    const existing = await c.env.DB.prepare('SELECT id FROM coupons WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({ error: 'Not Found', message: 'Coupon not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM coupons WHERE id = ?').bind(id).run();
    return c.json({ id, status: 'success', message: 'Coupon deleted successfully' });
  }
);

export default coupons;
