// ============================================================
// Checkout API Routes — Razorpay Integration
// Uses Razorpay REST API directly (no SDK needed in Workers)
// ============================================================

import { Hono } from 'hono';
import type { Bindings } from '../types';

const checkout = new Hono<{ Bindings: Bindings }>();

// ---------- Helpers ----------

function razorpayAuth(keyId: string, keySecret: string): string {
  return 'Basic ' + btoa(`${keyId}:${keySecret}`);
}

async function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const message = `${orderId}|${paymentId}`;
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const hashHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex === signature;
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
      throw new Error(`Invalid item: missing productId or quantity`);
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

checkout.post('/create-order', async (c) => {
  const body = await c.req.json();
  const { items, currency, customerName, customerEmail } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return c.json({ error: 'Cart items are required' }, 400);
  }

  // Normalize item format from frontend cart
  const normalizedItems = items.map((item: any) => ({
    productId: item.product?.id || item.productId,
    quantity: item.quantity || 1,
    selectedSize: item.selectedSize || '',
  }));

  try {
    const { total } = await calculateOrderTotals(c.env.DB, normalizedItems);
    const amountInPaise = Math.round(total * 100);

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: razorpayAuth(c.env.RAZORPAY_KEY_ID, c.env.RAZORPAY_KEY_SECRET),
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: currency || 'INR',
        receipt: `rcpt-${Date.now()}`,
        notes: {
          customerName: customerName || '',
          customerEmail: customerEmail || '',
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Razorpay order creation failed:', err);
      return c.json({ error: 'Failed to create payment order' }, 502);
    }

    const razorpayOrder = (await response.json()) as {
      id: string;
      amount: number;
      currency: string;
      status: string;
    };

    return c.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: c.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    console.error('Checkout create-order error:', err);
    return c.json({ error: err.message || 'Payment gateway unavailable' }, err.message?.includes('not found') || err.message?.includes('stock') ? 409 : 503);
  }
});

checkout.post('/verify', async (c) => {
  const body = await c.req.json();
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    items,
    shippingAddress,
    customerName,
    customerEmail,
  } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return c.json({ error: 'Missing payment verification fields' }, 400);
  }

  const isValid = await verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    c.env.RAZORPAY_KEY_SECRET
  );

  if (!isValid) {
    return c.json({ verified: false, error: 'Payment signature verification failed' }, 400);
  }

  // --- Server-side price recalculation & order creation ---
  if (!items || !Array.isArray(items) || items.length === 0) {
    return c.json({ error: 'Order items are required' }, 400);
  }

  const normalizedItems = items.map((item: any) => ({
    productId: item.product?.id || item.productId,
    quantity: item.quantity || 1,
    selectedSize: item.selectedSize || '',
  }));

  try {
    const { subtotal, tax, shippingFee, total, verifiedItems } = await calculateOrderTotals(
      c.env.DB,
      normalizedItems
    );

    const orderId = `ord-${crypto.randomUUID().slice(0, 12)}`;
    const orderNumber = `ASP-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();

    // Build atomic batch: order + items + stock decrements
    const stmts: D1PreparedStatement[] = [
      c.env.DB.prepare(
        `INSERT INTO orders (id, order_number, customer_name, customer_email, shipping_address,
          subtotal, tax, shipping_fee, total, status, payment_status, payment_method,
          razorpay_order_id, razorpay_payment_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Processing', 'Paid', 'Razorpay', ?, ?, ?)`
      ).bind(
        orderId,
        orderNumber,
        customerName || 'Valued Guest',
        customerEmail || '',
        JSON.stringify(shippingAddress || {}),
        subtotal,
        tax,
        shippingFee,
        total,
        razorpay_order_id,
        razorpay_payment_id,
        now
      ),
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
      subtotal,
      tax,
      shippingFee,
      total,
      message: 'Payment verified and order created',
    });
  } catch (err: any) {
    console.error('Order creation after payment verification failed:', err);
    return c.json({ verified: true, error: `Order creation failed: ${err.message}` }, 500);
  }
});

export default checkout;
