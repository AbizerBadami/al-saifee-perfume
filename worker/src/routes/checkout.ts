<<<<<<< HEAD
// ============================================================
// Checkout API Routes — Razorpay Integration
// Hardened with:
//   - Rate limiting on order creation and verification
//   - Constant-time HMAC signature verification
//   - Pending order storage & server-authoritative item pricing
//   - Guaranteed INR currency enforcement
//   - Replay protection with unique payment ID verification
//   - Stock pre-checks and overselling safeguards
// ============================================================

import { Hono } from 'hono';
import type { Bindings, PendingOrderRow } from '../types';
=======
// Checkout API Routes — Razorpay Integration (hardened)
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Bindings, OrderRow, OrderItemRow } from '../types';
import { toOrderJSON } from '../types';
>>>>>>> 03fb960 (rebuild)
import { rateLimiter } from '../middleware/rateLimiter';

const checkout = new Hono<{ Bindings: Bindings }>();

const itemSchema = z.object({
  productId: z.string().trim().min(1).max(128).optional(),
  quantity: z.number().int().min(1).max(10).default(1),
  selectedSize: z.string().trim().max(60).default(''),
}).passthrough();

const createSchema = z.object({
  items: z.array(itemSchema).min(1).max(50),
  currency: z.string().trim().length(3).default('INR'),
  customerName: z.string().trim().max(120).default(''),
  customerEmail: z.string().trim().email().max(255).optional().or(z.literal('')),
});

const verifySchema = z.object({
  razorpay_order_id: z.string().trim().min(1).max(128),
  razorpay_payment_id: z.string().trim().min(1).max(128),
  razorpay_signature: z.string().trim().min(1).max(512),
  items: z.array(itemSchema).min(1).max(50),
  shippingAddress: z.record(z.string(), z.unknown()).default({}),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(255),
});

function razorpayAuth(keyId: string, keySecret: string): string {
  return 'Basic ' + btoa(`${keyId}:${keySecret}`);
}

<<<<<<< HEAD
/** Constant-time HMAC-SHA256 signature verification */
async function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!orderId || !paymentId || !signature || !secret || signature.length !== 64) {
    return false;
  }

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const message = `${orderId}|${paymentId}`;

    const sigBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      const byte = parseInt(signature.slice(i * 2, i * 2 + 2), 16);
      if (isNaN(byte)) return false;
      sigBytes[i] = byte;
    }

    return await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(message));
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
=======
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
>>>>>>> 03fb960 (rebuild)
}

async function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${orderId}|${paymentId}`));
    const hashHex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
    return timingSafeEqualHex(hashHex, signature.toLowerCase());
  } catch {
    return false;
  }
}

type NormalizedItem = { productId: string; quantity: number; selectedSize: string };

function normalizeItems(items: Array<Record<string, unknown>>): NormalizedItem[] {
  return items.map((item) => {
    const nested = item.product as Record<string, unknown> | undefined;
    const productId = String(item.productId || nested?.id || '').slice(0, 128);
    const quantity = Math.min(10, Math.max(1, Number(item.quantity) || 1));
    const selectedSize = String(item.selectedSize || '').slice(0, 60);
    return { productId, quantity, selectedSize };
  }).filter((i) => i.productId);
}

async function calculateOrderTotals(db: D1Database, items: NormalizedItem[]) {
  let subtotal = 0;
  const verifiedItems: Array<{ productId: string; title: string; size: string; qty: number; unitPrice: number }> = [];

  for (const item of items) {
<<<<<<< HEAD
    if (!item.productId || !item.quantity || item.quantity < 1) {
      throw new Error('Invalid item: missing productId or quantity');
    }
    const row = await db
      .prepare('SELECT id, title, price, sale_price, stock FROM products WHERE id = ?')
      .bind(item.productId)
      .first<{ id: string; title: string; price: number; sale_price: number | null; stock: number }>();

    if (!row) throw new Error(`Product ${item.productId} not found`);
=======
    const row = await db.prepare('SELECT id, title, price, sale_price, stock FROM products WHERE id = ?')
      .bind(item.productId)
      .first<{ id: string; title: string; price: number; sale_price: number | null; stock: number }>();
    if (!row) throw Object.assign(new Error(`Product not found`), { status: 409 });
    if (!Number.isFinite(row.price) || row.price < 0) throw Object.assign(new Error(`Invalid price for "${row.title}"`), { status: 409 });
>>>>>>> 03fb960 (rebuild)
    if (row.stock < item.quantity) {
      throw Object.assign(new Error(`Insufficient stock for "${row.title}" (available: ${row.stock})`), { status: 409 });
    }

    const unitPrice = row.sale_price && row.sale_price > 0 ? row.sale_price : row.price;
    subtotal += unitPrice * item.quantity;
    verifiedItems.push({ productId: row.id, title: row.title, size: item.selectedSize, qty: item.quantity, unitPrice });
  }

  const settings = await db.prepare('SELECT tax_rate, free_shipping_threshold FROM store_settings WHERE id = 1')
    .first<{ tax_rate: number; free_shipping_threshold: number }>();
<<<<<<< HEAD

  const taxRate = settings?.tax_rate ?? 0.10;
  const freeThreshold = settings?.free_shipping_threshold ?? 999;
=======
  const taxRate = Number.isFinite(settings?.tax_rate) ? settings!.tax_rate : 0.1;
  const freeThreshold = Number.isFinite(settings?.free_shipping_threshold) ? settings!.free_shipping_threshold : 999;
>>>>>>> 03fb960 (rebuild)
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const shippingFee = subtotal >= freeThreshold ? 0 : 49;
  const total = Math.round((subtotal + tax + shippingFee) * 100) / 100;

  return { subtotal, tax, shippingFee, total, taxRate, verifiedItems };
}

function newOrderNumber(): string {
  return `ASP-${Math.floor(100000 + Math.random() * 900000)}`;
}

<<<<<<< HEAD
// POST /api/checkout/create-order
checkout.post('/create-order', rateLimiter(15, 60), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { items, customerName, customerEmail, shippingAddress } = body;
=======
checkout.post('/create-order', rateLimiter(30, 600), zValidator('json', createSchema), async (c) => {
  const body = c.req.valid('json');
  const normalized = normalizeItems(body.items as Array<Record<string, unknown>>);
  if (normalized.length === 0) return c.json({ error: 'Valid cart items are required', code: 'BAD_REQUEST' }, 400);
>>>>>>> 03fb960 (rebuild)

  if (!c.env.RAZORPAY_KEY_ID || !c.env.RAZORPAY_KEY_SECRET) {
    console.error('Razorpay keys missing');
    return c.json({ error: 'Payment gateway is not configured', code: 'CONFIG' }, 503);
  }

<<<<<<< HEAD
  // Normalize item format from frontend cart
  const normalizedItems = items.map((item: any) => ({
    productId: item.product?.id || item.productId,
    quantity: Math.max(1, parseInt(item.quantity || 1, 10)),
    selectedSize: String(item.selectedSize || '').slice(0, 50),
  }));

  try {
    const { subtotal, tax, shippingFee, total, verifiedItems } = await calculateOrderTotals(c.env.DB, normalizedItems);
=======
  try {
    const { total } = await calculateOrderTotals(c.env.DB, normalized);
>>>>>>> 03fb960 (rebuild)
    const amountInPaise = Math.round(total * 100);
    if (amountInPaise < 100) return c.json({ error: 'Order total is too small', code: 'BAD_REQUEST' }, 400);

    // Force INR currency unconditionally
    const currency = 'INR';

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: razorpayAuth(c.env.RAZORPAY_KEY_ID, c.env.RAZORPAY_KEY_SECRET),
      },
      body: JSON.stringify({
        amount: amountInPaise,
<<<<<<< HEAD
        currency,
        receipt: `rcpt-${Date.now()}`,
        notes: {
          customerName: String(customerName || '').slice(0, 100),
          customerEmail: String(customerEmail || '').slice(0, 100),
        },
=======
        currency: body.currency,
        receipt: `rcpt-${crypto.randomUUID()}`,
        notes: { customerName: body.customerName, customerEmail: body.customerEmail || '' },
>>>>>>> 03fb960 (rebuild)
      }),
    });

    if (!response.ok) {
<<<<<<< HEAD
      console.error('Razorpay order creation returned non-200');
      return c.json({ error: 'Failed to create payment order with gateway' }, 502);
=======
      console.error('Razorpay order creation failed:', await response.text().catch(() => response.statusText));
      return c.json({ error: 'Failed to create payment order', code: 'GATEWAY' }, 502);
>>>>>>> 03fb960 (rebuild)
    }

    const rz = (await response.json()) as { id: string; amount: number; currency: string };
    if (rz.amount !== amountInPaise) {
      console.error(`Razorpay amount mismatch: expected ${amountInPaise}, got ${rz.amount}`);
      return c.json({ error: 'Payment gateway amount mismatch', code: 'GATEWAY' }, 502);
    }

<<<<<<< HEAD
    // Store pending order in D1 to link payment ID with verified items and amount
    await c.env.DB.prepare(`
      INSERT INTO pending_orders (
        id, amount, currency, items_json, subtotal, tax, shipping_fee, total,
        customer_name, customer_email, shipping_address, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).bind(
      razorpayOrder.id,
      amountInPaise,
      currency,
      JSON.stringify(verifiedItems),
      subtotal,
      tax,
      shippingFee,
      total,
      String(customerName || 'Valued Guest').slice(0, 100),
      String(customerEmail || '').slice(0, 100),
      JSON.stringify(shippingAddress || {}),
      new Date().toISOString()
    ).run();

    return c.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: c.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    console.error('Checkout create-order error:', err);
    const isClientError = err.message?.includes('not found') || err.message?.includes('stock');
    return c.json(
      { error: isClientError ? err.message : 'Payment gateway unavailable. Please try again.' },
      isClientError ? 409 : 503
    );
  }
});

// POST /api/checkout/verify
checkout.post('/verify', rateLimiter(15, 60), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    shippingAddress,
    customerName,
    customerEmail,
  } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return c.json({ verified: false, error: 'Missing payment verification fields' }, 400);
  }
=======
    return c.json({ orderId: rz.id, amount: rz.amount, currency: rz.currency, keyId: c.env.RAZORPAY_KEY_ID });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    const status = e.status === 409 ? 409 : 503;
    return c.json({ error: status === 409 ? e.message || 'Item unavailable' : 'Payment gateway unavailable', code: status === 409 ? 'CONFLICT' : 'GATEWAY' }, status as 409 | 503);
  }
});

checkout.post('/verify', rateLimiter(30, 600), zValidator('json', verifySchema), async (c) => {
  const body = c.req.valid('json');
>>>>>>> 03fb960 (rebuild)

  // 1. Verify cryptographic signature in constant time
  const isValid = await verifyRazorpaySignature(
    body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature, c.env.RAZORPAY_KEY_SECRET
  );
  if (!isValid) {
    return c.json({ verified: false, error: 'Payment signature verification failed', code: 'BAD_SIGNATURE' }, 400);
  }

<<<<<<< HEAD
  // 2. Load stored pending order from D1
  const pending = await c.env.DB.prepare(
    'SELECT * FROM pending_orders WHERE id = ?'
  ).bind(razorpay_order_id).first<PendingOrderRow>();

  if (!pending) {
    return c.json({ verified: false, error: 'No associated pending order found' }, 404);
  }

  if (pending.status === 'completed') {
    return c.json({ verified: false, error: 'Order has already been processed' }, 409);
  }

  // 3. Replay protection: verify razorpay_payment_id has never been used
  const existingPayment = await c.env.DB.prepare(
    'SELECT id FROM orders WHERE razorpay_payment_id = ?'
  ).bind(razorpay_payment_id).first();

  if (existingPayment) {
    return c.json({ verified: false, error: 'Duplicate payment detected' }, 409);
  }

  // 4. Parse stored, verified items
  let verifiedItems: Array<{
    productId: string;
    title: string;
    size: string;
    qty: number;
    unitPrice: number;
    stock: number;
  }> = [];

  try {
    verifiedItems = JSON.parse(pending.items_json);
  } catch {
    return c.json({ verified: false, error: 'Corrupted pending order data' }, 500);
  }

  // 5. Pre-check stock levels to prevent overselling
  for (const vi of verifiedItems) {
    const product = await c.env.DB.prepare(
      'SELECT id, title, stock FROM products WHERE id = ?'
    ).bind(vi.productId).first<{ id: string; title: string; stock: number }>();

    if (!product || product.stock < vi.qty) {
      return c.json({
        verified: true,
        error: `Insufficient stock for "${product?.title || vi.title}". Please contact support with payment ID ${razorpay_payment_id}.`,
      }, 409);
    }
  }

  try {
    const orderId = `ord-${crypto.randomUUID().slice(0, 12)}`;
    const randomSuffix = crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000;
    const orderNumber = `ASP-${randomSuffix}`;
    const now = new Date().toISOString();

    const finalShippingAddress = shippingAddress || JSON.parse(pending.shipping_address || '{}');
    const finalCustomerName = customerName || pending.customer_name || 'Valued Guest';
    const finalCustomerEmail = customerEmail || pending.customer_email || '';

    // Atomic D1 batch execution:
    // 1. Insert order
    // 2. Mark pending order completed
    // 3. Insert order items
    // 4. Decrement stock
    const stmts: D1PreparedStatement[] = [
      c.env.DB.prepare(
        `INSERT INTO orders (
          id, order_number, customer_name, customer_email, shipping_address,
          subtotal, tax, shipping_fee, total, status, payment_status, payment_method,
          razorpay_order_id, razorpay_payment_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Processing', 'Paid', 'Razorpay', ?, ?, ?)`
      ).bind(
        orderId,
        orderNumber,
        finalCustomerName,
        finalCustomerEmail,
        JSON.stringify(finalShippingAddress),
        pending.subtotal,
        pending.tax,
        pending.shipping_fee,
        pending.total,
        razorpay_order_id,
        razorpay_payment_id,
        now
      ),
      c.env.DB.prepare(
        "UPDATE pending_orders SET status = 'completed' WHERE id = ?"
      ).bind(razorpay_order_id),
    ];

    for (const vi of verifiedItems) {
      stmts.push(
        c.env.DB.prepare(
          `INSERT INTO order_items (order_id, product_id, product_title, selected_size, quantity, price)
          VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(orderId, vi.productId, vi.title, vi.size, vi.qty, vi.unitPrice),
        c.env.DB.prepare(
          `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`
        ).bind(vi.qty, vi.productId, vi.qty)
      );
=======
  // Idempotency: return existing order if this payment was already processed
  const existing = await c.env.DB.prepare('SELECT * FROM orders WHERE razorpay_payment_id = ?')
    .bind(body.razorpay_payment_id).first<OrderRow>();
  if (existing) {
    const { results: items } = await c.env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?')
      .bind(existing.id).all<OrderItemRow>();
    const json = toOrderJSON(existing, items) as { orderNumber: string; subtotal: number; tax: number; shippingFee: number; total: number };
    return c.json({ verified: true, orderId: existing.id, orderNumber: json.orderNumber, subtotal: json.subtotal, tax: json.tax, shippingFee: json.shippingFee, total: json.total, duplicate: true });
  }

  const normalized = normalizeItems(body.items as Array<Record<string, unknown>>);
  if (normalized.length === 0) return c.json({ error: 'Order items are required', code: 'BAD_REQUEST' }, 400);

  try {
    const { subtotal, tax, shippingFee, total, verifiedItems } = await calculateOrderTotals(c.env.DB, normalized);

    // Optional: cross-check Razorpay payment amount covers our total
    try {
      const payRes = await fetch(`https://api.razorpay.com/v1/payments/${body.razorpay_payment_id}`, {
        headers: { Authorization: razorpayAuth(c.env.RAZORPAY_KEY_ID, c.env.RAZORPAY_KEY_SECRET) },
      });
      if (payRes.ok) {
        const pay = (await payRes.json()) as { amount?: number; status?: string };
        if (typeof pay.amount === 'number' && pay.amount < Math.round(total * 100)) {
          console.error(`Paid amount ${pay.amount} < order total ${Math.round(total * 100)}`);
          return c.json({ verified: false, error: 'Paid amount does not cover order total', code: 'AMOUNT_MISMATCH' }, 402);
        }
      }
    } catch (e) {
      console.error('Razorpay payment fetch failed (non-blocking):', e);
>>>>>>> 03fb960 (rebuild)
    }

    const orderId = `ord-${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    const addr = body.shippingAddress as Record<string, unknown>;

<<<<<<< HEAD
    return c.json({
      verified: true,
      orderId,
      orderNumber,
      subtotal: pending.subtotal,
      tax: pending.tax,
      shippingFee: pending.shipping_fee,
      total: pending.total,
      message: 'Payment verified and order created',
    });
  } catch (err: any) {
    console.error('Order creation transaction failed:', err);
    return c.json({ verified: true, error: 'Order completion encountered an internal error' }, 500);
  }
});

// POST /api/checkout/webhook — Razorpay Webhook endpoint
checkout.post('/webhook', async (c) => {
  const signature = c.req.header('x-razorpay-signature');
  const bodyText = await c.req.text();

  if (c.env.RAZORPAY_WEBHOOK_SECRET) {
    if (!signature) {
      return c.json({ error: 'Missing webhook signature' }, 400);
    }
    try {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(c.env.RAZORPAY_WEBHOOK_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );
      const sigBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        const byte = parseInt(signature.slice(i * 2, i * 2 + 2), 16);
        if (isNaN(byte)) return c.json({ error: 'Malformed signature' }, 400);
        sigBytes[i] = byte;
      }
      const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(bodyText));
      if (!valid) {
        return c.json({ error: 'Invalid webhook signature' }, 400);
      }
    } catch {
      return c.json({ error: 'Signature verification error' }, 400);
    }
  }

  try {
    const payload = JSON.parse(bodyText);
    console.log(`Razorpay Webhook Event: ${payload.event}`);
    return c.json({ received: true, event: payload.event });
  } catch {
    return c.json({ error: 'Invalid JSON payload' }, 400);
=======
    // Retry on rare order_number collision (UNIQUE constraint)
    let orderNumber = newOrderNumber();
    let inserted = false;
    for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
      try {
        const stmts: D1PreparedStatement[] = [
          c.env.DB.prepare(
            `INSERT INTO orders (id, order_number, customer_name, customer_email, shipping_address,
              subtotal, tax, shipping_fee, total, status, payment_status, payment_method,
              razorpay_order_id, razorpay_payment_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Processing', 'Paid', 'Razorpay', ?, ?, ?, ?)`
          ).bind(
            orderId, orderNumber,
            String(body.customerName).slice(0, 120),
            String(body.customerEmail).toLowerCase().slice(0, 255),
            JSON.stringify({
              fullName: String(addr.fullName || body.customerName || '').slice(0, 120),
              phone: String(addr.phone || '').slice(0, 24),
              addressLine1: String(addr.addressLine1 || '').slice(0, 200),
              addressLine2: String(addr.addressLine2 || '').slice(0, 200),
              city: String(addr.city || '').slice(0, 80),
              state: String(addr.state || '').slice(0, 80),
              postalCode: String(addr.postalCode || '').slice(0, 16),
              country: String(addr.country || '').slice(0, 80),
            }),
            subtotal, tax, shippingFee, total,
            body.razorpay_order_id, body.razorpay_payment_id, now, now
          ),
        ];
        for (const vi of verifiedItems) {
          stmts.push(
            c.env.DB.prepare(
              `INSERT INTO order_items (order_id, product_id, product_title, selected_size, quantity, price)
               VALUES (?, ?, ?, ?, ?, ?)`
            ).bind(orderId, vi.productId, vi.title, vi.size, vi.qty, vi.unitPrice),
            c.env.DB.prepare(`UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`)
              .bind(vi.qty, vi.productId, vi.qty)
          );
        }
        const results = await c.env.DB.batch(stmts);
        // Verify conditional stock decrements actually changed a row
        const stockResults = results.slice(1).filter((_, i) => i % 2 === 1);
        const failed = stockResults.some((r) => (r.meta?.changes ?? 0) === 0);
        if (failed) {
          // Compensate: remove the partially created order so retry/payment reconciliation is clean
          await c.env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(orderId).run().catch(() => {});
          return c.json({ verified: false, error: 'Insufficient stock — order was not created. Please adjust quantities.', code: 'CONFLICT' }, 409);
        }
        inserted = true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('UNIQUE') && msg.includes('order_number')) {
          orderNumber = newOrderNumber();
          continue;
        }
        if (msg.includes('UNIQUE') && msg.includes('razorpay_payment_id')) {
          const dup = await c.env.DB.prepare('SELECT * FROM orders WHERE razorpay_payment_id = ?')
            .bind(body.razorpay_payment_id).first<OrderRow>();
          if (dup) {
            return c.json({ verified: true, orderId: dup.id, orderNumber: dup.order_number, duplicate: true });
          }
        }
        throw e;
      }
    }
    if (!inserted) return c.json({ verified: false, error: 'Could not create order. Contact support with your payment ID.', code: 'INTERNAL' }, 500);

    return c.json({ verified: true, orderId, orderNumber, subtotal, tax, shippingFee, total });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    console.error('Order creation after verification failed:', e.message || err);
    if (e.status === 409) return c.json({ verified: false, error: e.message, code: 'CONFLICT' }, 409);
    return c.json({ verified: false, error: 'Order could not be created. If money was deducted, contact support with your payment ID.', code: 'INTERNAL' }, 500);
>>>>>>> 03fb960 (rebuild)
  }
});

export default checkout;
