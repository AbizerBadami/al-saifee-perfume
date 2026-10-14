-- Migration 0005 — customer accounts + zero tax (idempotent, non-destructive)
-- Apply: wrangler d1 execute al-saifee-db --remote --file=src/db/migration-0005.sql

-- 1. Customer accounts
CREATE TABLE IF NOT EXISTS customers (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- 2. Server-side wishlist
CREATE TABLE IF NOT EXISTS wishlist (
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (customer_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_wishlist_customer ON wishlist(customer_id);

-- 3. Link orders to the customer who placed them (NULL for legacy guest orders)
ALTER TABLE orders ADD COLUMN customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);

-- 4. Zero tax: store-wide rate to 0 (existing row; INSERT OR IGNORE is a no-op if present)
UPDATE store_settings SET tax_rate = 0 WHERE id = 1;
INSERT OR IGNORE INTO store_settings (id, store_name, support_email, currency_symbol, tax_rate, free_shipping_threshold, promo_message)
VALUES (1, 'Al-Saifee Perfumes', 'concierge@alsaifeeperfumes.com', '₹', 0, 999, '');
