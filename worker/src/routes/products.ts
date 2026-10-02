// ============================================================
// Products API Routes
// ============================================================

import { Hono } from 'hono';
import type { Bindings, ProductRow } from '../types';
import { toProductJSON } from '../types';
import { authGuard } from '../middleware/auth';

const products = new Hono<{ Bindings: Bindings }>();

// GET /api/products — List all products (public)
products.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM products ORDER BY created_at DESC'
  ).all<ProductRow>();

  return c.json({ products: results.map(toProductJSON), total: results.length, status: 'success' });
});

// GET /api/products/:id — Single product (public)
products.get('/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<ProductRow>();

  if (!row) return c.json({ error: 'Product not found' }, 404);
  return c.json(toProductJSON(row));
});

// POST /api/products — Create product (admin only)
products.post('/', authGuard, async (c) => {
  const body = await c.req.json();
  const id = `prod-${Date.now()}`;
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

// PUT /api/products/:id — Update product (admin only)
products.put('/:id', authGuard, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

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
