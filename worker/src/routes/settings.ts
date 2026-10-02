// ============================================================
// Store Settings API Routes
// ============================================================

import { Hono } from 'hono';
import type { Bindings, StoreSettingsRow } from '../types';
import { toSettingsJSON } from '../types';
import { authGuard } from '../middleware/auth';

const settings = new Hono<{ Bindings: Bindings }>();

// GET /api/settings — Get store settings (public)
settings.get('/', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM store_settings WHERE id = 1').first<StoreSettingsRow>();

  if (!row) {
    // Return defaults if no settings row exists
    return c.json({
      storeName: 'Al-Saifee Perfumes',
      supportEmail: 'concierge@alsaifeeperfumes.com',
      currencySymbol: '₹',
      taxRate: 0.10,
      freeShippingThreshold: 999,
      promoMessage: '',
    });
  }

  return c.json(toSettingsJSON(row));
});

// PUT /api/settings — Update store settings (admin only)
settings.put('/', authGuard, async (c) => {
  const body = await c.req.json();

  // Upsert — insert if not exists, update if exists
  await c.env.DB.prepare(`
    INSERT INTO store_settings (id, store_name, support_email, currency_symbol, tax_rate, free_shipping_threshold, promo_message)
    VALUES (1, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      store_name = excluded.store_name,
      support_email = excluded.support_email,
      currency_symbol = excluded.currency_symbol,
      tax_rate = excluded.tax_rate,
      free_shipping_threshold = excluded.free_shipping_threshold,
      promo_message = excluded.promo_message
  `).bind(
    body.storeName || 'Al-Saifee Perfumes',
    body.supportEmail || '',
    body.currencySymbol || '₹',
    body.taxRate ?? 0.10,
    body.freeShippingThreshold ?? 999,
    body.promoMessage || ''
  ).run();

  const updated = await c.env.DB.prepare('SELECT * FROM store_settings WHERE id = 1').first<StoreSettingsRow>();
  return c.json(toSettingsJSON(updated!));
});

export default settings;
