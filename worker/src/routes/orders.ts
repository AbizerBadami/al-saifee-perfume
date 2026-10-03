// ============================================================
// Orders API Routes
// ============================================================

import { Hono } from 'hono';
import type { Bindings, OrderRow, OrderItemRow } from '../types';
import { toOrderJSON } from '../types';
import { authGuard } from '../middleware/auth';

const orders = new Hono<{ Bindings: Bindings }>();

// GET /api/orders — List all orders (admin only)
orders.get('/', authGuard, async (c) => {
  const { results: orderRows } = await c.env.DB.prepare(
    'SELECT * FROM orders ORDER BY created_at DESC'
  ).all<OrderRow>();

  const ordersWithItems = await Promise.all(
    orderRows.map(async (order) => {
      const { results: items } = await c.env.DB.prepare(
        'SELECT * FROM order_items WHERE order_id = ?'
      ).bind(order.id).all<OrderItemRow>();
      return toOrderJSON(order, items);
    })
  );

  return c.json({ orders: ordersWithItems, total: ordersWithItems.length, status: 'success' });
});

// GET /api/orders/lookup — Lookup by order number + email (public, for order tracking)
orders.get('/lookup', async (c) => {
  const orderNumber = c.req.query('orderNumber');
  const email = c.req.query('email');

  if (!orderNumber || !email) {
    return c.json({ error: 'Both orderNumber and email are required' }, 400);
  }

  const order = await c.env.DB.prepare(
    'SELECT * FROM orders WHERE order_number = ? AND customer_email = ?'
  ).bind(orderNumber, email).first<OrderRow>();

  if (!order) return c.json({ error: 'Order not found' }, 404);

  const { results: items } = await c.env.DB.prepare(
    'SELECT * FROM order_items WHERE order_id = ?'
  ).bind(order.id).all<OrderItemRow>();

  return c.json(toOrderJSON(order, items));
});

// GET /api/orders/:id — Single order (admin only)
orders.get('/:id', authGuard, async (c) => {
  const id = c.req.param('id');
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<OrderRow>();
  if (!order) return c.json({ error: 'Order not found' }, 404);

  const { results: items } = await c.env.DB.prepare(
    'SELECT * FROM order_items WHERE order_id = ?'
  ).bind(order.id).all<OrderItemRow>();

  return c.json(toOrderJSON(order, items));
});

// POST /api/orders — Create a new order (public — called after payment verification)
orders.post('/', async (c) => {
  const body = await c.req.json();
  const id = `ord-${Date.now()}`;
  const orderNumber = `ELE-${Math.floor(100000 + Math.random() * 900000)}`;
  const now = new Date().toISOString();

  const subtotal: number = body.subtotal ?? 0;
  const taxRate = 0.10;
  const taxableAmount = subtotal;
  const tax: number = body.tax ?? Math.round(taxableAmount * taxRate * 100) / 100;
  const shippingFee: number = body.shippingFee ?? 0;
  const total: number = body.total ?? taxableAmount + tax + shippingFee;

  await c.env.DB.prepare(`
    INSERT INTO orders (id, order_number, customer_name, customer_email, shipping_address,
      subtotal, tax, shipping_fee, total, status, payment_status, payment_method,
      razorpay_order_id, razorpay_payment_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Processing', ?, ?, ?, ?, ?)
  `).bind(
    id, orderNumber,
    body.customerName || 'Valued Guest',
    body.customerEmail || '',
    JSON.stringify(body.shippingAddress || {}),
    subtotal, tax, shippingFee, total,
    body.paymentStatus || 'Paid',
    body.paymentMethod || 'Razorpay',
    body.razorpayOrderId || null,
    body.razorpayPaymentId || null,
    now
  ).run();

  // Insert order items
  if (body.items && Array.isArray(body.items)) {
    for (const item of body.items) {
      await c.env.DB.prepare(`
        INSERT INTO order_items (order_id, product_id, product_title, selected_size, quantity, price)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        item.product?.id || item.productId || '',
        item.product?.title || item.productTitle || '',
        item.selectedSize || '',
        item.quantity || 1,
        item.price || 0
      ).run();
    }
  }

  const created = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<OrderRow>();
  const { results: items } = await c.env.DB.prepare(
    'SELECT * FROM order_items WHERE order_id = ?'
  ).bind(id).all<OrderItemRow>();

  return c.json({ ...toOrderJSON(created!, items), status: 'success' }, 201);
});

// PATCH /api/orders/:id/status — Update order status (admin only)
orders.patch('/:id/status', authGuard, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await c.env.DB.prepare('SELECT id FROM orders WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Order not found' }, 404);

  const sets: string[] = [];
  const values: unknown[] = [];

  if (body.status) {
    sets.push('status = ?');
    values.push(body.status);
  }
  if (body.trackingNumber !== undefined) {
    sets.push('tracking_number = ?');
    values.push(body.trackingNumber);
  }
  if (body.paymentStatus) {
    sets.push('payment_status = ?');
    values.push(body.paymentStatus);
  }

  if (sets.length === 0) return c.json({ error: 'Nothing to update' }, 400);

  values.push(id);
  await c.env.DB.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();

  return c.json({ id, status: 'success', message: 'Order updated' });
});

export default orders;
