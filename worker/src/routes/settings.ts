// ============================================================
// Store Settings API Routes
// Secured with:
//   - Zod schema validation via @hono/zod-validator
//   - Parameterized D1 prepared statements
//   - RBAC authGuard protection on store settings updates
// ============================================================

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Bindings, Variables, StoreSettingsRow } from '../types';
import { toSettingsJSON } from '../types';
import { authGuard } from '../middleware/auth';

const settings = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------- Zod Validation Schema ----------

const settingsUpdateSchema = z.object({
  storeName: z.string().trim().min(1, 'Store name is required').max(100),
  supportEmail: z.string().trim().email('Invalid support email address').max(255),
  currencySymbol: z.string().trim().min(1, 'Currency symbol is required').max(10),
  taxRate: z.number().min(0, 'Tax rate cannot be negative').max(1, 'Tax rate must be decimal between 0 and 1'),
  freeShippingThreshold: z.number().nonnegative('Threshold cannot be negative'),
  promoMessage: z.string().trim().max(500).default(''),
});

// ---------- Route Handlers ----------

// GET /api/settings — Retrieve global store settings (public)
settings.get('/', async (c) => {
  const row = await c.env.DB.prepare(
    'SELECT * FROM store_settings WHERE id = 1'
  ).first<StoreSettingsRow>();

  if (!row) {
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

// PUT /api/settings — Update store settings (RBAC: Admin only)
settings.put(
  '/',
  authGuard,
  zValidator('json', settingsUpdateSchema),
  async (c) => {
    const data = c.req.valid('json');

    await c.env.DB.prepare(`
      INSERT INTO store_settings (
        id, store_name, support_email, currency_symbol, tax_rate, free_shipping_threshold, promo_message
      ) VALUES (1, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        store_name = excluded.store_name,
        support_email = excluded.support_email,
        currency_symbol = excluded.currency_symbol,
        tax_rate = excluded.tax_rate,
        free_shipping_threshold = excluded.free_shipping_threshold,
        promo_message = excluded.promo_message
    `).bind(
      data.storeName,
      data.supportEmail,
      data.currencySymbol,
      data.taxRate,
      data.freeShippingThreshold,
      data.promoMessage
    ).run();

    const updated = await c.env.DB.prepare(
      'SELECT * FROM store_settings WHERE id = 1'
    ).first<StoreSettingsRow>();

    return c.json(toSettingsJSON(updated!));
  }
);

export default settings;
