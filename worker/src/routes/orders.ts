<<<<<<< HEAD
// ============================================================
// Orders API Routes
// Hardened with:
//   - Rate limiting on public order lookups to prevent enumeration
//   - Redacted shipping address on public tracking responses
//   - Cryptographically secure random order numbers
//   - Zod validation for order creation and status updates
//   - RBAC authGuard protection on administrative endpoints
// ============================================================

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
=======
// Orders API Routes — paginated, validated, no client-trusted totals
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
>>>>>>> 03fb960 (rebuild)
import type { Bindings, OrderRow, OrderItemRow } from '../types';
import { toOrderJSON, toPublicOrderJSON } from '../types';
import { authGuard } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const orders = new Hono<{ Bindings: Bindings }>();

<<<<<<< HEAD
// ---------- Validation Schemas ----------

const orderStatusUpdateSchema = z.object({
  status: z.enum(['Processing', 'Shipped', 'Delivered', 'Cancelled']).optional(),
  trackingNumber: z.string().trim().max(100).optional(),
  paymentStatus: z.enum(['Paid', 'Pending', 'Failed']).optional(),
});

const orderCreateSchema = z.object({
  customerName: z.string().trim().min(1).max(100).default('Valued Guest'),
  customerEmail: z.string().trim().email('Invalid customer email').max(100),
  shippingAddress: z.record(z.string(), z.any()).default({}),
  items: z.array(
    z.object({
      product: z.object({ id: z.string(), title: z.string().optional() }).optional(),
      productId: z.string().optional(),
      productTitle: z.string().optional(),
      selectedSize: z.string().default(''),
      quantity: z.number().int().positive().default(1),
      price: z.number().nonnegative().default(0),
    })
  ).min(1, 'Order must contain at least one item'),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative().optional(),
  shippingFee: z.number().nonnegative().optional(),
  total: z.number().nonnegative(),
  paymentStatus: z.enum(['Paid', 'Pending', 'Failed']).default('Paid'),
  paymentMethod: z.string().trim().max(50).default('Razorpay'),
  razorpayOrderId: z.string().max(100).optional().nullable(),
  razorpayPaymentId: z.string().max(100).optional().nullable(),
});

// ---------- Route Handlers ----------

// GET /api/orders — List all orders (admin only)
orders.get('/', authGuard, async (c) => {
  const { results: orderRows } = await c.env.DB.prepare(
    'SELECT * FROM orders ORDER BY created_at DESC'
  ).all<OrderRow>();
=======
const STATUSES = ['Processing', 'Shipped', 'Delivered', 'Cancelled'] as const;
const PAYMENT_STATUSES = ['Paid', 'Pending', 'Failed'] as const;
>>>>>>> 03fb960 (rebuild)

const statusPatchSchema = z.object({
  status: z.enum(STATUSES).optional(),
  trackingNumber: z.string().trim().max(120).nullable().optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
});

<<<<<<< HEAD
// GET /api/orders/lookup — Lookup by order number + email (public, throttled, sanitized PII)
orders.get('/lookup', rateLimiter(10, 60), async (c) => {
  const orderNumber = c.req.query('orderNumber')?.trim();
  const email = c.req.query('email')?.trim();
=======
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
>>>>>>> 03fb960 (rebuild)

  if (!orderNumber || !email) {
    return c.json({ error: 'Both orderNumber and email are required', code: 'BAD_REQUEST' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: 'Valid email is required', code: 'BAD_REQUEST' }, 400);
  }

  const order = await c.env.DB.prepare(
<<<<<<< HEAD
    'SELECT * FROM orders WHERE order_number = ? AND LOWER(customer_email) = LOWER(?)'
=======
    'SELECT * FROM orders WHERE order_number = ? AND lower(customer_email) = ?'
>>>>>>> 03fb960 (rebuild)
  ).bind(orderNumber, email).first<OrderRow>();

  if (!order) return c.json({ error: 'Order not found', code: 'NOT_FOUND' }, 404);

  const { results: items } = await c.env.DB.prepare(
    'SELECT * FROM order_items WHERE order_id = ?'
  ).bind(order.id).all<OrderItemRow>();

<<<<<<< HEAD
  return c.json(toPublicOrderJSON(order, items));
=======
  return c.json({ order: toOrderJSON(order, items) });
>>>>>>> 03fb960 (rebuild)
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

<<<<<<< HEAD
// POST /api/orders — Create a new order (admin only)
orders.post('/', authGuard, zValidator('json', orderCreateSchema), async (c) => {
  const body = c.req.valid('json');
  const id = `ord-${crypto.randomUUID().slice(0, 12)}`;
  const randomSuffix = crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000;
  const orderNumber = `ASP-${randomSuffix}`;
  const now = new Date().toISOString();

  const subtotal: number = body.subtotal;
  const taxRate = 0.10;
  const tax: number = body.tax ?? Math.round(subtotal * taxRate * 100) / 100;
  const shippingFee: number = body.shippingFee ?? 0;
  const total: number = body.total ?? subtotal + tax + shippingFee;

  await c.env.DB.prepare(`
    INSERT INTO orders (id, order_number, customer_name, customer_email, shipping_address,
      subtotal, tax, shipping_fee, total, status, payment_status, payment_method,
      razorpay_order_id, razorpay_payment_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Processing', ?, ?, ?, ?, ?)
  `).bind(
    id, orderNumber,
    body.customerName,
    body.customerEmail,
    JSON.stringify(body.shippingAddress),
    subtotal, tax, shippingFee, total,
    body.paymentStatus,
    body.paymentMethod,
    body.razorpayOrderId || null,
    body.razorpayPaymentId || null,
    now
  ).run();

  // Insert order items
  for (const item of body.items) {
    const prodId = item.product?.id || item.productId || '';
    const prodTitle = item.product?.title || item.productTitle || '';
    await c.env.DB.prepare(`
      INSERT INTO order_items (order_id, product_id, product_title, selected_size, quantity, price)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      prodId,
      prodTitle,
      item.selectedSize || '',
      item.quantity || 1,
      item.price || 0
    ).run();
  }

  const created = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<OrderRow>();
  const { results: items } = await c.env.DB.prepare(
    'SELECT * FROM order_items WHERE order_id = ?'
  ).bind(id).all<OrderItemRow>();

  return c.json({ ...toOrderJSON(created!, items), status: 'success' }, 201);
});

// PATCH /api/orders/:id/status — Update order status (admin only)
orders.patch('/:id/status', authGuard, zValidator('json', orderStatusUpdateSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const existing = await c.env.DB.prepare('SELECT id FROM orders WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Order not found' }, 404);
=======
// PATCH /api/orders/:id/status — admin only, whitelisted fields
orders.patch('/:id/status', authGuard, zValidator('json', statusPatchSchema), async (c) => {
  const id = c.req.param('id').slice(0, 128);
  const body = c.req.valid('json');

  const existing = await c.env.DB.prepare('SELECT id FROM orders WHERE id = ? OR order_number = ?').bind(id, id).first<{ id: string }>();
  if (!existing) return c.json({ error: 'Order not found', code: 'NOT_FOUND' }, 404);
>>>>>>> 03fb960 (rebuild)

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
