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
import { rateLimiter } from '../middleware/rateLimiter';

const checkout = new Hono<{ Bindings: Bindings }>();

// ---------- Helpers ----------

function razorpayAuth(keyId: string, keySecret: string): string {
  return 'Basic ' + btoa(`${keyId}:${keySecret}`);
}

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
}

/** Calculate order totals from D1 product prices */
async function calculateOrderTotals(
  db: D1Database,
  items: Array<{ productId: string; quantity: number; selectedSize?: string }>
) {
  let subtotal = 0;
  const verifiedItems: Array<{
    productId: string;
    title: string;
    size: string;
    qty: number;
    unitPrice: number;
    stock: number;
  }> = [];

  for (const item of items) {
    if (!item.productId || !item.quantity || item.quantity < 1) {
      throw new Error('Invalid item: missing productId or quantity');
    }
    const row = await db
      .prepare('SELECT id, title, price, sale_price, stock FROM products WHERE id = ?')
      .bind(item.productId)
      .first<{ id: string; title: string; price: number; sale_price: number | null; stock: number }>();

    if (!row) throw new Error(`Product ${item.productId} not found`);
    if (row.stock < item.quantity) {
      throw new Error(`Insufficient stock for "${row.title}" (available: ${row.stock}, requested: ${item.quantity})`);
    }

    const unitPrice = row.sale_price && row.sale_price > 0 ? row.sale_price : row.price;
    subtotal += unitPrice * item.quantity;
    verifiedItems.push({
      productId: row.id,
      title: row.title,
      size: item.selectedSize || '',
      qty: item.quantity,
      unitPrice,
      stock: row.stock,
    });
  }

  const settings = await db
    .prepare('SELECT tax_rate, free_shipping_threshold FROM store_settings WHERE id = 1')
    .first<{ tax_rate: number; free_shipping_threshold: number }>();

  const taxRate = settings?.tax_rate ?? 0.10;
  const freeThreshold = settings?.free_shipping_threshold ?? 999;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const shippingFee = subtotal >= freeThreshold ? 0 : 49;
  const total = subtotal + tax + shippingFee;

  return { subtotal, tax, shippingFee, total, taxRate, verifiedItems };
}

// ---------- Routes ----------

// POST /api/checkout/create-order
checkout.post('/create-order', rateLimiter(15, 60), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { items, customerName, customerEmail, shippingAddress } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return c.json({ error: 'Cart items are required' }, 400);
  }

  // Normalize item format from frontend cart
  const normalizedItems = items.map((item: any) => ({
    productId: item.product?.id || item.productId,
    quantity: Math.max(1, parseInt(item.quantity || 1, 10)),
    selectedSize: String(item.selectedSize || '').slice(0, 50),
  }));

  try {
    const { subtotal, tax, shippingFee, total, verifiedItems } = await calculateOrderTotals(c.env.DB, normalizedItems);
    const amountInPaise = Math.round(total * 100);

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
        currency,
        receipt: `rcpt-${Date.now()}`,
        notes: {
          customerName: String(customerName || '').slice(0, 100),
          customerEmail: String(customerEmail || '').slice(0, 100),
        },
      }),
    });

    if (!response.ok) {
      console.error('Razorpay order creation returned non-200');
      return c.json({ error: 'Failed to create payment order with gateway' }, 502);
    }

    const razorpayOrder = (await response.json()) as {
      id: string;
      amount: number;
      currency: string;
      status: string;
    };

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

  // 1. Verify cryptographic signature in constant time
  const isValid = await verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    c.env.RAZORPAY_KEY_SECRET
  );

  if (!isValid) {
    return c.json({ verified: false, error: 'Payment signature verification failed' }, 400);
  }

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
    }

    await c.env.DB.batch(stmts);

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

export default checkout;
