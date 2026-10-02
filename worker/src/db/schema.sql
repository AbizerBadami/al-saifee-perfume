-- ============================================================
-- Al-Saifee Perfumes — Cloudflare D1 Schema
-- ============================================================

-- Products catalog
CREATE TABLE IF NOT EXISTS products (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  subtitle        TEXT NOT NULL DEFAULT '',
  category        TEXT NOT NULL CHECK (category IN ('Perfumes', 'Pure Attars', 'Artisanal Extracts', 'Oud Specials')),
  fragrance_family TEXT NOT NULL CHECK (fragrance_family IN ('Woody', 'Amber', 'Floral', 'Oriental', 'Fresh', 'Spicy')),
  price           REAL NOT NULL,
  sale_price      REAL,
  stock           INTEGER NOT NULL DEFAULT 0,
  description     TEXT NOT NULL DEFAULT '',
  top_notes       TEXT NOT NULL DEFAULT '[]',      -- JSON array
  middle_notes    TEXT NOT NULL DEFAULT '[]',      -- JSON array
  base_notes      TEXT NOT NULL DEFAULT '[]',      -- JSON array
  longevity       TEXT NOT NULL DEFAULT '',
  projection      TEXT NOT NULL DEFAULT '',
  bottle_sizes    TEXT NOT NULL DEFAULT '[]',      -- JSON array
  images          TEXT NOT NULL DEFAULT '[]',      -- JSON array
  is_featured     INTEGER NOT NULL DEFAULT 0,
  is_best_seller  INTEGER NOT NULL DEFAULT 0,
  rating          REAL NOT NULL DEFAULT 5.0,
  review_count    INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id                  TEXT PRIMARY KEY,
  order_number        TEXT UNIQUE NOT NULL,
  customer_name       TEXT NOT NULL,
  customer_email      TEXT NOT NULL,
  shipping_address    TEXT NOT NULL DEFAULT '{}',   -- JSON object
  subtotal            REAL NOT NULL,
  discount            REAL NOT NULL DEFAULT 0,
  tax                 REAL NOT NULL,
  shipping_fee        REAL NOT NULL DEFAULT 0,
  total               REAL NOT NULL,
  status              TEXT NOT NULL DEFAULT 'Processing' CHECK (status IN ('Processing', 'Shipped', 'Delivered', 'Cancelled')),
  payment_status      TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Paid', 'Pending', 'Failed')),
  payment_method      TEXT NOT NULL DEFAULT '',
  tracking_number     TEXT,
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Order line items (normalized from the orders.items array)
CREATE TABLE IF NOT EXISTS order_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    TEXT NOT NULL,
  product_title TEXT NOT NULL,
  selected_size TEXT NOT NULL DEFAULT '',
  quantity      INTEGER NOT NULL DEFAULT 1,
  price         REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Product reviews
CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY,
  product_id  TEXT NOT NULL,
  user_name   TEXT NOT NULL,
  user_email  TEXT NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Approved' CHECK (status IN ('Approved', 'Pending', 'Rejected')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

-- Coupon / promo codes
CREATE TABLE IF NOT EXISTS coupons (
  id               TEXT PRIMARY KEY,
  code             TEXT UNIQUE NOT NULL,
  discount_type    TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value   REAL NOT NULL,
  min_order_amount REAL NOT NULL DEFAULT 0,
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Store-wide settings (single-row table)
CREATE TABLE IF NOT EXISTS store_settings (
  id                      INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name              TEXT NOT NULL DEFAULT 'Al-Saifee Perfumes',
  support_email           TEXT NOT NULL DEFAULT 'concierge@alsaifeeperfumes.com',
  currency_symbol         TEXT NOT NULL DEFAULT '₹',
  tax_rate                REAL NOT NULL DEFAULT 0.10,
  free_shipping_threshold REAL NOT NULL DEFAULT 999,
  promo_message           TEXT NOT NULL DEFAULT ''
);

-- Admin users (JWT-based authentication)
CREATE TABLE IF NOT EXISTS admins (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
