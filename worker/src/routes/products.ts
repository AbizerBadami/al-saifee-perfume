// Products API Routes — validated, paginated
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Bindings, ProductRow } from '../types';
import { toProductJSON } from '../types';
import { authGuard } from '../middleware/auth';

const products = new Hono<{ Bindings: Bindings }>();

const CATEGORIES = ['Perfumes', 'Pure Attars', 'Artisanal Extracts', 'Oud Specials'] as const;
const FAMILIES = ['Woody', 'Amber', 'Floral', 'Oriental', 'Fresh', 'Spicy'] as const;

const productSchema = z.object({
  title: z.string().trim().min(2).max(160),
  subtitle: z.string().trim().max(240).default(''),
  category: z.enum(CATEGORIES),
  fragranceFamily: z.enum(FAMILIES),
  price: z.number().nonnegative().max(1000000),
  salePrice: z.number().nonnegative().max(1000000).nullable().optional(),
  stock: z.number().int().min(0).max(100000).default(0),
  description: z.string().trim().max(5000).default(''),
  topNotes: z.array(z.string().trim().max(60)).max(20).default([]),
  middleNotes: z.array(z.string().trim().max(60)).max(20).default([]),
  baseNotes: z.array(z.string().trim().max(60)).max(20).default([]),
  longevity: z.string().trim().max(120).default(''),
  projection: z.string().trim().max(120).default(''),
  bottleSizes: z.array(z.string().trim().max(40)).max(12).default([]),
  images: z.array(z.string().trim().url().max(2000)).max(12).default([]),
  isFeatured: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
});

const productPatchSchema = productSchema.partial();

// GET /api/products — public, paginated + filterable
products.get('/', async (c) => {
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50', 10) || 50));
  const offset = Math.max(0, parseInt(c.req.query('offset') || '0', 10) || 0);
  const category = c.req.query('category');
  const family = c.req.query('family');
  const q = (c.req.query('q') || '').trim();

  const where: string[] = [];
  const params: unknown[] = [];
  if (category && (CATEGORIES as readonly string[]).includes(category)) { where.push('category = ?'); params.push(category); }
  if (family && (FAMILIES as readonly string[]).includes(family)) { where.push('fragrance_family = ?'); params.push(family); }
  if (q) { where.push('(title LIKE ? OR description LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRow = await c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM products ${clause}`).bind(...params).first<{ cnt: number }>();
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM products ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all<ProductRow>();

  return c.json({ products: results.map(toProductJSON), total: countRow?.cnt ?? results.length, limit, offset });
});

// GET /api/products/:id — public
products.get('/:id', async (c) => {
  const id = c.req.param('id').slice(0, 128);
  const row = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<ProductRow>();
  if (!row) return c.json({ error: 'Product not found', code: 'NOT_FOUND' }, 404);
  return c.json({ product: toProductJSON(row) });
});

// POST /api/products — admin only
products.post('/', authGuard, zValidator('json', productSchema), async (c) => {
  const body = c.req.valid('json');
  const id = `prod-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO products (id, title, subtitle, category, fragrance_family, price, sale_price, stock, description,
      top_notes, middle_notes, base_notes, longevity, projection, bottle_sizes, images,
      is_featured, is_best_seller, rating, review_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5.0, 0, ?, ?)`
  ).bind(
    id, body.title, body.subtitle, body.category, body.fragranceFamily,
    body.price, body.salePrice ?? null, body.stock, body.description,
    JSON.stringify(body.topNotes), JSON.stringify(body.middleNotes), JSON.stringify(body.baseNotes),
    body.longevity, body.projection,
    JSON.stringify(body.bottleSizes), JSON.stringify(body.images),
    body.isFeatured ? 1 : 0, body.isBestSeller ? 1 : 0, now, now
  ).run();

  const created = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<ProductRow>();
  return c.json({ product: toProductJSON(created!) }, 201);
});

// PUT /api/products/:id — admin only
products.put('/:id', authGuard, zValidator('json', productPatchSchema), async (c) => {
  const id = c.req.param('id').slice(0, 128);
  const body = c.req.valid('json');

  const existing = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<ProductRow>();
  if (!existing) return c.json({ error: 'Product not found', code: 'NOT_FOUND' }, 404);

  await c.env.DB.prepare(
    `UPDATE products SET
      title = ?, subtitle = ?, category = ?, fragrance_family = ?,
      price = ?, sale_price = ?, stock = ?, description = ?,
      top_notes = ?, middle_notes = ?, base_notes = ?,
      longevity = ?, projection = ?, bottle_sizes = ?, images = ?,
      is_featured = ?, is_best_seller = ?, updated_at = datetime('now')
    WHERE id = ?`
  ).bind(
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
  return c.json({ product: toProductJSON(updated!) });
});

// DELETE /api/products/:id — admin only
products.delete('/:id', authGuard, async (c) => {
  const id = c.req.param('id').slice(0, 128);
  const existing = await c.env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Product not found', code: 'NOT_FOUND' }, 404);

  await c.env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
  return c.json({ id, status: 'success' });
});

export default products;
