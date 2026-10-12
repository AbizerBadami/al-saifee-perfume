// ============================================================
// Products API Routes
// Hardened with:
//   - Zod schema validation on creation and updates
//   - Rate limiting on public catalog queries
//   - RBAC authGuard protection on administrative CRUD
// ============================================================

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Bindings, ProductRow } from '../types';
import { toProductJSON } from '../types';
import { authGuard } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const products = new Hono<{ Bindings: Bindings }>();

// ---------- Validation Schemas ----------

const productSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  subtitle: z.string().trim().max(200).default(''),
  category: z.enum(['Perfumes', 'Pure Attars', 'Artisanal Extracts', 'Oud Specials']),
  fragranceFamily: z.enum(['Woody', 'Amber', 'Floral', 'Oriental', 'Fresh', 'Spicy']),
  price: z.number().positive('Price must be greater than 0'),
  salePrice: z.number().positive().nullable().optional(),
  stock: z.number().int().nonnegative('Stock cannot be negative').default(0),
  description: z.string().trim().max(4000).default(''),
  topNotes: z.array(z.string()).default([]),
  middleNotes: z.array(z.string()).default([]),
  baseNotes: z.array(z.string()).default([]),
  longevity: z.string().trim().max(100).default(''),
  projection: z.string().trim().max(100).default(''),
  bottleSizes: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  isFeatured: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
});

const productUpdateSchema = productSchema.partial();

// ---------- Route Handlers ----------

// GET /api/products — List all products (public, cached/rate-limited)
products.get('/', rateLimiter(60, 60), async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM products ORDER BY created_at DESC'
  ).all<ProductRow>();

  return c.json({ products: results.map(toProductJSON), total: results.length, status: 'success' });
});

// GET /api/products/:id — Single product (public)
products.get('/:id', rateLimiter(60, 60), async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<ProductRow>();

  if (!row) return c.json({ error: 'Product not found' }, 404);
  return c.json(toProductJSON(row));
});

// POST /api/products — Create product (admin only, validated)
products.post('/', authGuard, zValidator('json', productSchema), async (c) => {
  const body = c.req.valid('json');
  const id = `prod-${crypto.randomUUID().slice(0, 12)}`;
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO products (id, title, subtitle, category, fragrance_family, price, sale_price, stock, description,
      top_notes, middle_notes, base_notes, longevity, projection, bottle_sizes, images,
      is_featured, is_best_seller, rating, review_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5.0, 0, ?)
  `).bind(
    id, body.title, body.subtitle || '', body.category, body.fragranceFamily,
    body.price, body.salePrice ?? null, body.stock ?? 0, body.description || '',
    JSON.stringify(body.topNotes || []), JSON.stringify(body.middleNotes || []), JSON.stringify(body.baseNotes || []),
    body.longevity || '', body.projection || '',
    JSON.stringify(body.bottleSizes || []), JSON.stringify(body.images || []),
    body.isFeatured ? 1 : 0, body.isBestSeller ? 1 : 0, now
  ).run();

  const created = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<ProductRow>();
  return c.json(toProductJSON(created!), 201);
});

// PUT /api/products/:id — Update product (admin only, validated)
products.put('/:id', authGuard, zValidator('json', productUpdateSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const existing = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<ProductRow>();
  if (!existing) return c.json({ error: 'Product not found' }, 404);

  await c.env.DB.prepare(`
    UPDATE products SET
      title = ?, subtitle = ?, category = ?, fragrance_family = ?,
      price = ?, sale_price = ?, stock = ?, description = ?,
      top_notes = ?, middle_notes = ?, base_notes = ?,
      longevity = ?, projection = ?, bottle_sizes = ?, images = ?,
      is_featured = ?, is_best_seller = ?
    WHERE id = ?
  `).bind(
    body.title ?? existing.title, body.subtitle ?? existing.subtitle,
    body.category ?? existing.category, body.fragranceFamily ?? existing.fragrance_family,
    body.price ?? existing.price, body.salePrice !== undefined ? body.salePrice : existing.sale_price,
    body.stock ?? existing.stock, body.description ?? existing.description,
    body.topNotes ? JSON.stringify(body.topNotes) : existing.top_notes,
    body.middleNotes ? JSON.stringify(body.middleNotes) : existing.middle_notes,
    body.baseNotes ? JSON.stringify(body.baseNotes) : existing.base_notes,
    body.longevity ?? existing.longevity, body.projection ?? existing.projection,
    body.bottleSizes ? JSON.stringify(body.bottleSizes) : existing.bottle_sizes,
    body.images ? JSON.stringify(body.images) : existing.images,
    body.isFeatured !== undefined ? (body.isFeatured ? 1 : 0) : existing.is_featured,
    body.isBestSeller !== undefined ? (body.isBestSeller ? 1 : 0) : existing.is_best_seller,
    id
  ).run();

  const updated = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<ProductRow>();
  return c.json(toProductJSON(updated!));
});

// DELETE /api/products/:id — Delete product (admin only)
products.delete('/:id', authGuard, async (c) => {
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Product not found' }, 404);

  await c.env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
  return c.json({ id, status: 'success', message: 'Product deleted' });
});

export default products;
