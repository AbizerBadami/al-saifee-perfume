-- Migration 0003 — verified-purchase reviews (idempotent, non-destructive)
-- Apply: wrangler d1 execute al-saifee-db --remote --file=src/db/migration-0003.sql
-- Legacy rows keep order_number NULL + verified_purchase 0 and remain visible if Approved.

ALTER TABLE reviews ADD COLUMN order_number TEXT;
ALTER TABLE reviews ADD COLUMN verified_purchase INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_product_order
  ON reviews(product_id, order_number);
CREATE INDEX IF NOT EXISTS idx_reviews_order
  ON reviews(order_number);
