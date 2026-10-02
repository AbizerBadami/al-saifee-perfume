// ============================================================
// Checkout API Routes — Razorpay Integration
// Uses Razorpay REST API directly (no SDK needed in Workers)
// ============================================================

import { Hono } from 'hono';
import type { Bindings } from '../types';

const checkout = new Hono<{ Bindings: Bindings }>();

// ---------- Helpers ----------

/** Base64-encode credentials for Razorpay Basic Auth */
function razorpayAuth(keyId: string, keySecret: string): string {
  return 'Basic ' + btoa(`${keyId}:${keySecret}`);
}

/** Verify Razorpay payment signature using HMAC-SHA256 */
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

  // Convert to hex
  const hashHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return hashHex === signature;
}

// ---------- Routes ----------

/**
 * POST /api/checkout/create-order
 * Creates a Razorpay Order via the Razorpay Orders API.
 * The frontend then uses this order ID to open the Razorpay Checkout popup.
 */
checkout.post('/create-order', async (c) => {
  const body = await c.req.json();
  const { amount, currency, customerName, customerEmail } = body;

  if (!amount || amount <= 0) {
    return c.json({ error: 'A valid amount is required' }, 400);
  }

  // Razorpay expects amount in the smallest currency unit (paise for INR)
  const amountInPaise = Math.round(amount * 100);

  try {
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
      keyId: c.env.RAZORPAY_KEY_ID, // Frontend needs this to open checkout popup
    });
  } catch (err) {
    console.error('Razorpay API error:', err);
    return c.json({ error: 'Payment gateway unavailable' }, 503);
  }
});

/**
 * POST /api/checkout/verify
 * Verifies the Razorpay payment signature after the user completes payment.
 * Called by the frontend with razorpay_order_id, razorpay_payment_id, razorpay_signature.
 */
checkout.post('/verify', async (c) => {
  const body = await c.req.json();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

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

  return c.json({
    verified: true,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    message: 'Payment verified successfully',
  });
});

export default checkout;
