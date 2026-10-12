-- ============================================================
-- Migration 001: Security Hardening for Orders and Payments
-- ============================================================

-- Table for pending checkout orders before payment verification
CREATE TABLE IF NOT EXISTS pending_orders (
  id                  TEXT PRIMARY KEY,  -- razorpay_order_id
  amount              INTEGER NOT NULL,  -- in paise
  currency            TEXT NOT NULL DEFAULT 'INR',
  items_json          TEXT NOT NULL,     -- JSON array of verified items
  subtotal            REAL NOT NULL,
  tax                 REAL NOT NULL,
  shipping_fee        REAL NOT NULL DEFAULT 0,
  total               REAL NOT NULL,
  customer_name       TEXT NOT NULL,
  customer_email      TEXT NOT NULL,
  shipping_address    TEXT NOT NULL DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pending_orders_created ON pending_orders(created_at);

-- Prevent replay attacks by making razorpay_payment_id unique across completed orders
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id 
  ON orders(razorpay_payment_id) 
  WHERE razorpay_payment_id IS NOT NULL AND razorpay_payment_id != '';

-- Prevent duplicate order creation for the same razorpay_order_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_order_id 
  ON orders(razorpay_order_id) 
  WHERE razorpay_order_id IS NOT NULL AND razorpay_order_id != '';
