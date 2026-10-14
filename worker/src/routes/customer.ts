// Customer API — shopper accounts, wishlist, order history.
// All routes except register/login require a customer JWT (customerGuard).
// Admin JWTs are rejected by customerGuard; admin routes reject customer JWTs.
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Bindings, Variables, CustomerRow, ProductRow, OrderRow, OrderItemRow } from '../types';
import { toProductJSON, toOrderJSON } from '../types';
import { hashPassword, verifyPassword, createJWT, normalizeEmail, customerGuard } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const customer = new Hono<{ Bindings: Bindings; Variables: Variables & { customerId: string; customerEmail: string } }>();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(128),
});

function parseExpiry(raw: string | undefined): number {
  const n = parseInt(raw || '86400', 10);
  if (!Number.isFinite(n) || n < 300 || n > 30 * 86400) return 86400;
  return n;
}

function customerToken(c: { env: Bindings }, id: string, email: string) {
  return createJWT({ sub: id, email, role: 'customer' }, c.env.JWT_SECRET, parseExpiry(c.env.JWT_EXPIRES_IN));
}

// POST /api/customer/register — create shopper account
customer.post('/register', rateLimiter(10, 600), zValidator('json', registerSchema), async (c) => {
  const { name, email, password } = c.req.valid('json');
  const normalized = normalizeEmail(email);

  const existing = await c.env.DB.prepare('SELECT id FROM customers WHERE email = ?').bind(normalized).first();
  if (existing) {
    return c.json({ error: 'An account with this email already exists. Please sign in.', code: 'CONFLICT' }, 409);
  }

  const id = `cus-${crypto.randomUUID()}`;
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  await c.env.DB.prepare('INSERT INTO customers (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, name.trim(), normalized, passwordHash, now).run();

  const token = await customerToken(c, id, normalized);
  return c.json({ success: true, token, customer: { id, name: name.trim(), email: normalized } }, 201);
});

// POST /api/customer/login — shopper sign in (generic errors)
customer.post('/login', rateLimiter(20, 600), zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const normalized = normalizeEmail(email);

  const row = await c.env.DB.prepare('SELECT * FROM customers WHERE email = ?').bind(normalized).first<CustomerRow>();
  if (!row) {
    return c.json({ error: 'Invalid email or password', code: 'UNAUTHORIZED' }, 401);
  }
  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) {
    return c.json({ error: 'Invalid email or password', code: 'UNAUTHORIZED' }, 401);
  }

  const token = await customerToken(c, row.id, row.email);
  return c.json({ success: true, token, customer: { id: row.id, name: row.name, email: row.email } });
});

// GET /api/customer/me — profile (customer only)
customer.get('/me', customerGuard, async (c) => {
  const row = await c.env.DB.prepare('SELECT id, name, email, created_at FROM customers WHERE id = ?')
    .bind(c.get('customerId')).first<{ id: string; name: string; email: string; created_at: string }>();
  if (!row) return c.json({ error: 'Account not found', code: 'NOT_FOUND' }, 404);
  return c.json({ id: row.id, name: row.name, email: row.email, createdAt: row.created_at });
});

// GET /api/customer/wishlist — full product cards (customer only)
customer.get('/wishlist', customerGuard, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT p.* FROM products p INNER JOIN wishlist w
     ON w.product_id = p.id WHERE w.customer_id = ? ORDER BY w.created_at DESC`
  ).bind(c.get('customerId')).all<ProductRow>();
  return c.json({ products: results.map(toProductJSON), total: results.length });
});

// POST /api/customer/wishlist — save a product (customer only, idempotent)
customer.post('/wishlist', customerGuard, zValidator('json', z.object({ productId: z.string().trim().min(1).max(128) })), async (c) => {
  const { productId } = c.req.valid('json');
  const product = await c.env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(productId).first();
  if (!product) return c.json({ error: 'Product not found', code: 'NOT_FOUND' }, 404);
  await c.env.DB.prepare('INSERT OR IGNORE INTO wishlist (customer_id, product_id, created_at) VALUES (?, ?, ?)')
    .bind(c.get('customerId'), productId, new Date().toISOString()).run();
  return c.json({ productId, status: 'saved' }, 201);
});

// DELETE /api/customer/wishlist/:productId — remove (customer only)
customer.delete('/wishlist/:productId', customerGuard, async (c) => {
  const productId = c.req.param('productId').slice(0, 128);
  await c.env.DB.prepare('DELETE FROM wishlist WHERE customer_id = ? AND product_id = ?')
    .bind(c.get('customerId'), productId).run();
  return c.json({ productId, status: 'removed' });
});

// GET /api/customer/orders — my order history, newest first (customer only)
customer.get('/orders', customerGuard, async (c) => {
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20));
  const offset = Math.max(0, parseInt(c.req.query('offset') || '0', 10) || 0);
  const countRow = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM orders WHERE customer_id = ?')
    .bind(c.get('customerId')).first<{ cnt: number }>();
  const { results: rows } = await c.env.DB.prepare(
    'SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(c.get('customerId'), limit, offset).all<OrderRow>();
  if (rows.length === 0) return c.json({ orders: [], total: countRow?.cnt ?? 0, limit, offset });
  const ids = rows.map((o) => o.id);
  const { results: items } = await c.env.DB.prepare(
    `SELECT * FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')})`
  ).bind(...ids).all<OrderItemRow>();
  const byOrder = new Map<string, OrderItemRow[]>();
  for (const it of items) {
    const arr = byOrder.get(it.order_id) || [];
    arr.push(it);
    byOrder.set(it.order_id, arr);
  }
  return c.json({ orders: rows.map((o) => toOrderJSON(o, byOrder.get(o.id) || [])), total: countRow?.cnt ?? rows.length, limit, offset });
});

export default customer;
