// ============================================================
// Auth API Routes (Admin Registration + Login)
// ============================================================

import { Hono } from 'hono';
import type { Bindings, Variables, AdminRow } from '../types';
import { hashPassword, verifyPassword, createJWT, authGuard } from '../middleware/auth';

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /api/auth/register — Register first admin (or additional admins)
auth.post('/register', async (c) => {
  const body = await c.req.json();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }
  if (password.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400);
  }

  // SECURITY: Only allow registration when no admins exist (first-time setup)
  const adminCount = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM admins').first<{ cnt: number }>();
  if (adminCount && adminCount.cnt > 0) {
    return c.json({ error: 'Admin registration is closed. Contact the existing administrator.' }, 403);
  }

  // Check if this email is already registered
  const existing = await c.env.DB.prepare('SELECT id FROM admins WHERE email = ?').bind(email).first();
  if (existing) {
    return c.json({ error: 'An admin with this email already exists' }, 409);
  }

  const id = `admin-${Date.now()}`;
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO admins (id, email, password_hash, created_at)
    VALUES (?, ?, ?, ?)
  `).bind(id, email, passwordHash, now).run();

  // Issue JWT
  const expiresIn = parseInt(c.env.JWT_EXPIRES_IN || '86400');
  const token = await createJWT({ sub: id, email }, c.env.JWT_SECRET, expiresIn);

  return c.json({
    success: true,
    message: `Admin account created for ${email}`,
    token,
    admin: { id, email },
  }, 201);
});

// POST /api/auth/login — Admin login
auth.post('/login', async (c) => {
  const body = await c.req.json();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const admin = await c.env.DB.prepare(
    'SELECT * FROM admins WHERE email = ?'
  ).bind(email).first<AdminRow>();

  if (!admin) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const valid = await verifyPassword(password, admin.password_hash);
  if (!valid) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const expiresIn = parseInt(c.env.JWT_EXPIRES_IN || '86400');
  const token = await createJWT({ sub: admin.id, email: admin.email }, c.env.JWT_SECRET, expiresIn);

  return c.json({
    success: true,
    token,
    admin: { id: admin.id, email: admin.email },
  });
});

// GET /api/auth/me — Check current token validity (admin only)
auth.get('/me', authGuard, async (c) => {
  const adminId = c.get('adminId');
  const adminEmail = c.get('adminEmail');
  return c.json({ id: adminId, email: adminEmail, isAdmin: true });
});

export default auth;
