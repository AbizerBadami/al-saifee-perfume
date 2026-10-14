-- Migration 0002 — harden existing databases (idempotent, non-destructive)
-- Apply: wrangler d1 execute al-saifee-db --remote --file=src/db/migration-0002.sql
-- Rollback: no data is deleted; to revert, drop added indexes manually (see ROLLBACK in DEPLOYMENT.md).

-- 1. Idempotency for Razorpay payments
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(razorpay_payment_id);

-- 2. Lookup + admin-list performance
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- 3. Catalog filters
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_family ON products(fragrance_family);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at);

-- 4. Review moderation queries
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_product_status ON reviews(product_id, status);

-- 5. Audit columns (constant default required by D1's SQLite for ADD COLUMN;
-- backfilled from created_at below; app code sets updated_at explicitly on writes)
ALTER TABLE products ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
UPDATE products SET updated_at = created_at WHERE updated_at = '';
UPDATE orders SET updated_at = created_at WHERE updated_at = '';

-- 6. New reviews default to Pending (application enforces; keep DB default Approved for backward compat
-- with old rows, new code always inserts explicit status).
-- No ALTER of defaults here to avoid table rebuild on large datasets.
