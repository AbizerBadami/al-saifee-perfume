# Al-Saifee Perfumes — Production Deployment, Operations & Rollback

## Architecture
- Frontend: Vite + React SPA on Cloudflare Pages (`frontend/`, SPA fallback via `public/_redirects`).
- API: Hono Worker (`worker/src/index.ts`) + D1 (`al-saifee-db`).
- Payments: Razorpay Orders API + Checkout.js + HMAC verification (`worker/src/routes/checkout.ts`).
- No guest checkout: shopper accounts (`customers`), customer JWTs (`/api/customer/*`),
  server-side wishlist, orders linked to `customer_id`. Single admin JWT (`/api/auth/*`).
- Tax is 0 store-wide (hardcoded in checkout totals; `store_settings.tax_rate = 0`).

## 1. Environment & secrets
| Key | Where | Notes |
|---|---|---|
| `VITE_API_URL` | Pages env | Worker `/api` base URL. Dev can omit (Vite proxies `/api` → `localhost:8787`). |
| `FRONTEND_URL` | Worker `vars` | Exact Pages/custom-domain origin, e.g. `https://alsaifeeperfumes.com`. No trailing slash. |
| `JWT_SECRET` | `wrangler secret` | Min 32 random bytes. `openssl rand -base64 48`. Rotate if the old example secret was ever used. |
| `RAZORPAY_KEY_ID/SECRET` | `wrangler secret` | Live keys only in production. Test keys only in dev. |
| `JWT_EXPIRES_IN` | Worker `vars` | Seconds, clamped 300–2592000. Default 86400. |

```bash
cd worker
wrangler secret put JWT_SECRET
wrangler secret put RAZORPAY_KEY_ID
wrangler secret put RAZORPAY_KEY_SECRET
wrangler deploy --var FRONTEND_URL:https://alsaifeeperfumes.com
```

## 2. Database (D1)
Fresh:
```bash
npm run db:init:remote --workspace=worker  # runs schema.sql (v3: verified reviews + single-admin trigger)
npm run db:seed:remote --workspace=worker  # seed.sql (catalog + settings, no admin)
```
Single admin (provisioned directly in D1 — there is no API/UI to create one):
```bash
node worker/scripts/create-admin.mjs admin@example.com 'StrongPassword123'
# then run the printed INSERT (only once — a 2nd INSERT is rejected by trg_single_admin)
wrangler d1 execute al-saifee-db --remote --command "INSERT INTO admins ..."
```
Existing production DB — apply non-destructive migrations in order:
```bash
wrangler d1 execute al-saifee-db --remote --file=src/db/migration-0002.sql
wrangler d1 execute al-saifee-db --remote --file=src/db/migration-0003.sql
wrangler d1 execute al-saifee-db --remote --file=src/db/migration-0004.sql
wrangler d1 execute al-saifee-db --remote --file=src/db/migration-0005.sql
```
Backup before every migration:
```bash
wrangler d1 export al-saifee-db --remote --output=backup-$(date +%F).sql
# Restore (destructive — requires confirmation + maintenance window):
# wrangler d1 execute al-saifee-db --remote --file=backup-YYYY-MM-DD.sql
```
Verify:
```sql
SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';
SELECT order_number, razorpay_payment_id FROM orders LIMIT 5;
```

## 3. Deploy order
1. `cd worker && npm run typecheck && wrangler deploy`
2. `cd frontend && npm run lint && npm run build` → deploy `dist/` to Pages, set `VITE_API_URL`.
3. Smoke test (Section 5) before announcing release.

## 4. Monitoring
- Worker Observability is enabled in `wrangler.jsonc`; tail with `wrangler tail`.
- Recommended: Cloudflare Rate Limiting rules on `/api/auth/*` (20/min), `/api/checkout/*` (30/10min), `/api/reviews` POST (10/hr/IP) — the in-code `rateLimiter` is best-effort per isolate only.
- Uptime: add a monitor on `GET /` and `GET /api/products?limit=1`.
- Alerts: Razorpay webhook failures / `verify` 409 spikes indicate stock or fraud issues.

## 5. Production smoke test (must pass)
- [x] Guest walls: wishlist/cart/checkout/review without customer JWT → 401 (verified live).
- [x] Register → wishlist add/list, `me`, my-orders, customer-on-admin-route → 403 (verified live).
- [x] Review without purchase → 404/403 (verified live); `taxRate: 0` in `/api/settings` (verified live).
- [ ] Checkout `create-order` amount check (₹2499 for prod-001 × 1 with zero tax) — BLOCKED: Razorpay returns non-OK (see §6).
- [ ] Home, Shop, Product, Wishlist render on mobile 360px + desktop 1440px, no horizontal scroll.
- [ ] Search, category filter, sort, “in stock only”, pagination work; empty state shows.
- [ ] Out-of-stock product: Add disabled on card + detail; cart caps quantity at stock.
- [ ] Full Razorpay test payment → `/success` with order number; cancel → stays on checkout, no order; duplicate `verify` with same `razorpay_payment_id` returns same order.
- [ ] Tracking with order number + email works; wrong email is rejected with a clear message.
- [ ] Admin login (single DB-provisioned admin), product CRUD, order status update work.
- [ ] Review moderation: verified buyer submits with order number → Pending; admin approves → visible with ✓ Verified purchase.
- [ ] No secrets in `dist/` (only publishable `keyId` is exposed by design).
- [ ] `robots.txt`, `sitemap.xml`, OG tags, canonical URL correct.

## 6. Incident response
- Payment deducted, no order: look up Razorpay payment ID in D1 `orders.razorpay_payment_id`. If missing, ask customer for `razorpay_payment_id` + `razorpay_order_id`, verify signature manually, then create the order via a reviewed script — never trust client totals; always recalculate from `products`.
- Duplicate orders: `SELECT razorpay_payment_id, COUNT(*) c FROM orders GROUP BY 1 HAVING c > 1;` — the `UNIQUE` constraint + idempotent `verify` should prevent new cases; refund extras in Razorpay dashboard and cancel duplicates.
- Oversell: `SELECT id, title, stock FROM products WHERE stock < 0;` — restock, cancel/notify affected orders.

## 7. Rollback
- Worker: `wrangler rollback` (or redeploy previous version from deployments list).
- Frontend: Pages → Deployments → Roll back to last known-good.
- DB: restore from the pre-migration `backup-*.sql` export. Migrations 0002–0004 add only indexes,
  columns and a guard trigger, and are safe to leave in place during a code rollback.
- After rollback, re-run the smoke test and note remaining blockers — never declare production-ready with failing critical paths.
