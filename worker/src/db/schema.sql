-- ============================================================
-- Al-Saifee Perfumes — Cloudflare D1 Schema (v4: customer accounts)
-- Fresh DB: schema.sql. Existing DB: migrations 0002→0005 in order.
-- ============================================================

-- Products catalog
CREATE TABLE IF NOT EXISTS products (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  subtitle        TEXT NOT NULL DEFAULT '',
  category        TEXT NOT NULL CHECK (category IN ('Perfumes', 'Pure Attars', 'Artisanal Extracts', 'Oud Specials')),
  fragrance_family TEXT NOT NULL CHECK (fragrance_family IN ('Woody', 'Amber', 'Floral', 'Oriental', 'Fresh', 'Spicy')),
  price           REAL NOT NULL CHECK (price >= 0),
  sale_price      REAL CHECK (sale_price IS NULL OR sale_price >= 0),
  stock           INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  description     TEXT NOT NULL DEFAULT '',
  top_notes       TEXT NOT NULL DEFAULT '[]',
  middle_notes    TEXT NOT NULL DEFAULT '[]',
  base_notes      TEXT NOT NULL DEFAULT '[]',
  longevity       TEXT NOT NULL DEFAULT '',
  projection      TEXT NOT NULL DEFAULT '',
  bottle_sizes    TEXT NOT NULL DEFAULT '[]',
  images          TEXT NOT NULL DEFAULT '[]',
  is_featured     INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  is_best_seller  INTEGER NOT NULL DEFAULT 0 CHECK (is_best_seller IN (0, 1)),
  rating          REAL NOT NULL DEFAULT 5.0 CHECK (rating BETWEEN 0 AND 5),
  review_count    INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_family ON products(fragrance_family);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id                  TEXT PRIMARY KEY,
  order_number        TEXT UNIQUE NOT NULL,
  customer_name       TEXT NOT NULL,
  customer_email      TEXT NOT NULL,
  customer_id         TEXT REFERENCES customers(id) ON DELETE SET NULL,
  shipping_address    TEXT NOT NULL DEFAULT '{}',
  subtotal            REAL NOT NULL CHECK (subtotal >= 0),
  tax                 REAL NOT NULL CHECK (tax >= 0),
  shipping_fee        REAL NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  total               REAL NOT NULL CHECK (total >= 0),
  status              TEXT NOT NULL DEFAULT 'Processing' CHECK (status IN ('Processing', 'Shipped', 'Delivered', 'Cancelled')),
  payment_status      TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Paid', 'Pending', 'Failed')),
  payment_method      TEXT NOT NULL DEFAULT '',
  tracking_number     TEXT,
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT UNIQUE,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Order line items
CREATE TABLE IF NOT EXISTS order_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    TEXT NOT NULL,
  product_title TEXT NOT NULL,
  selected_size TEXT NOT NULL DEFAULT '',
  quantity      INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price         REAL NOT NULL CHECK (price >= 0)
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- Product reviews (verified purchase only — order_number required for new rows)
CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY,
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_name   TEXT NOT NULL,
  user_email  TEXT NOT NULL DEFAULT '',
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Approved', 'Pending', 'Rejected')),
  order_number TEXT,
  verified_purchase INTEGER NOT NULL DEFAULT 0 CHECK (verified_purchase IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_product_status ON reviews(product_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_product_order ON reviews(product_id, order_number);
CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_number);

-- Store-wide settings (single-row table)
CREATE TABLE IF NOT EXISTS store_settings (
  id                      INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name              TEXT NOT NULL DEFAULT 'Al-Saifee Perfumes',
  support_email           TEXT NOT NULL DEFAULT 'concierge@alsaifeeperfumes.com',
  currency_symbol         TEXT NOT NULL DEFAULT '₹',
  tax_rate                REAL NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 1),
  free_shipping_threshold REAL NOT NULL DEFAULT 999 CHECK (free_shipping_threshold >= 0),
  promo_message           TEXT NOT NULL DEFAULT ''
);

-- Customer accounts (shopper login; wishlist/cart/orders require auth)
CREATE TABLE IF NOT EXISTS customers (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Server-side wishlist (one row per customer+product)
CREATE TABLE IF NOT EXISTS wishlist (
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (customer_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_wishlist_customer ON wishlist(customer_id);

-- Admin users — exactly ONE row, provisioned directly in D1 (never via API).
-- Create it with: node worker/scripts/create-admin.mjs admin@example.com 'StrongPass...'
-- then run the printed INSERT via `wrangler d1 execute`.
CREATE TABLE IF NOT EXISTS admins (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Enforce single-admin at the database level (INSERT of a 2nd row aborts).
CREATE TRIGGER IF NOT EXISTS trg_single_admin
BEFORE INSERT ON admins
WHEN (SELECT COUNT(*) FROM admins) >= 1
BEGIN
  SELECT RAISE(ABORT, 'Only one admin allowed');
END;
