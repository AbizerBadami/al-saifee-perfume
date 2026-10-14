// Orders API Routes — paginated, validated, no client-trusted totals
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Bindings, OrderRow, OrderItemRow } from '../types';
import { toOrderJSON } from '../types';
import { authGuard } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const orders = new Hono<{ Bindings: Bindings }>();

const STATUSES = ['Processing', 'Shipped', 'Delivered', 'Cancelled'] as const;
const PAYMENT_STATUSES = ['Paid', 'Pending', 'Failed'] as const;

const statusPatchSchema = z.object({
  status: z.enum(STATUSES).optional(),
  trackingNumber: z.string().trim().max(120).nullable().optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
});

// GET /api/orders — admin only, paginated
orders.get('/', authGuard, async (c) => {
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50', 10) || 50));
  const offset = Math.max(0, parseInt(c.req.query('offset') || '0', 10) || 0);
  const countRow = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM orders').first<{ cnt: number }>();
  const { results: orderRows } = await c.env.DB.prepare(
    'SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all<OrderRow>();

  if (orderRows.length === 0) return c.json({ orders: [], total: countRow?.cnt ?? 0, limit, offset });

  const ids = orderRows.map((o) => o.id);
  const placeholders = ids.map(() => '?').join(',');
  const { results: allItems } = await c.env.DB.prepare(
    `SELECT * FROM order_items WHERE order_id IN (${placeholders})`
  ).bind(...ids).all<OrderItemRow>();
  const byOrder = new Map<string, OrderItemRow[]>();
  for (const it of allItems) {
    const arr = byOrder.get(it.order_id) || [];
    arr.push(it);
    byOrder.set(it.order_id, arr);
  }

  return c.json({
    orders: orderRows.map((o) => toOrderJSON(o, byOrder.get(o.id) || [])),
    total: countRow?.cnt ?? orderRows.length,
    limit,
    offset,
  });
});

// GET /api/orders/lookup — public tracking, requires both fields (rate-limited: PII-adjacent)
orders.get('/lookup', rateLimiter(30, 600), async (c) => {
  const orderNumber = (c.req.query('orderNumber') || '').trim().slice(0, 64);
  const email = (c.req.query('email') || '').trim().toLowerCase().slice(0, 255);

  if (!orderNumber || !email) {
    return c.json({ error: 'Both orderNumber and email are required', code: 'BAD_REQUEST' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: 'Valid email is required', code: 'BAD_REQUEST' }, 400);
  }

  const order = await c.env.DB.prepare(
    'SELECT * FROM orders WHERE order_number = ? AND lower(customer_email) = ?'
  ).bind(orderNumber, email).first<OrderRow>();

  if (!order) return c.json({ error: 'Order not found', code: 'NOT_FOUND' }, 404);

  const { results: items } = await c.env.DB.prepare(
    'SELECT * FROM order_items WHERE order_id = ?'
  ).bind(order.id).all<OrderItemRow>();

  return c.json({ order: toOrderJSON(order, items) });
});

// GET /api/orders/:id — admin only (supports id or order_number)
orders.get('/:id', authGuard, async (c) => {
  const id = c.req.param('id').slice(0, 128);
  const order = await c.env.DB.prepare(
    'SELECT * FROM orders WHERE id = ? OR order_number = ?'
  ).bind(id, id).first<OrderRow>();
  if (!order) return c.json({ error: 'Order not found', code: 'NOT_FOUND' }, 404);

  const { results: items } = await c.env.DB.prepare(
    'SELECT * FROM order_items WHERE order_id = ?'
  ).bind(order.id).all<OrderItemRow>();

  return c.json({ order: toOrderJSON(order, items) });
});

// PATCH /api/orders/:id/status — admin only, whitelisted fields
orders.patch('/:id/status', authGuard, zValidator('json', statusPatchSchema), async (c) => {
  const id = c.req.param('id').slice(0, 128);
  const body = c.req.valid('json');

  const existing = await c.env.DB.prepare('SELECT id FROM orders WHERE id = ? OR order_number = ?').bind(id, id).first<{ id: string }>();
  if (!existing) return c.json({ error: 'Order not found', code: 'NOT_FOUND' }, 404);

  const sets: string[] = [];
  const values: unknown[] = [];
  if (body.status) { sets.push('status = ?'); values.push(body.status); }
  if (body.trackingNumber !== undefined) { sets.push('tracking_number = ?'); values.push(body.trackingNumber); }
  if (body.paymentStatus) { sets.push('payment_status = ?'); values.push(body.paymentStatus); }
  if (sets.length === 0) return c.json({ error: 'Nothing to update', code: 'BAD_REQUEST' }, 400);

  sets.push("updated_at = datetime('now')");
  values.push(existing.id);
  await c.env.DB.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();

  return c.json({ id: existing.id, status: 'success' });
});

export default orders;
