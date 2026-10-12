// ============================================================
// Auth API Routes (Admin Registration + Login)
// Hardened with:
//   - Rate limiting on login and registration
//   - Minimum 8-character password enforcement with complexity check
//   - Atomic conditional INSERT to eliminate check-then-insert race conditions
//   - Optional ADMIN_SETUP_TOKEN support for bootstrap security
//   - RBAC verification on /me
// ============================================================

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Bindings, Variables, AdminRow } from '../types';
import { hashPassword, verifyPassword, createJWT, authGuard } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------- Validation Schemas ----------

const registerSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters')
    .refine((p) => /[A-Za-z]/.test(p) && /[0-9]/.test(p), {
      message: 'Password must contain at least one letter and one number',
    }),
  setupToken: z.string().trim().optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required').max(128),
});

// ---------- Route Handlers ----------

// POST /api/auth/register — Register first admin (strictly one-time, race-condition immune)
auth.post('/register', rateLimiter(5, 60), zValidator('json', registerSchema), async (c) => {
  const { email, password, setupToken } = c.req.valid('json');

  // If ADMIN_SETUP_TOKEN is configured in environment, require it
  if (c.env.ADMIN_SETUP_TOKEN) {
    if (!setupToken || setupToken !== c.env.ADMIN_SETUP_TOKEN) {
      return c.json({ error: 'Unauthorized: invalid or missing setup token' }, 403);
    }
  }

  // Pre-check if admins already exist
  const existingCount = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM admins').first<{ cnt: number }>();
  if (existingCount && existingCount.cnt > 0) {
    return c.json({ error: 'Admin registration is closed. Please sign in or contact the administrator.' }, 403);
  }

  const id = `admin-${crypto.randomUUID().slice(0, 12)}`;
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  // Atomic conditional INSERT: Only inserts if COUNT(*) is STILL 0 inside the transaction
  // Eliminates race conditions if two registration requests occur concurrently
  const res = await c.env.DB.prepare(`
    INSERT INTO admins (id, email, password_hash, created_at)
    SELECT ?, ?, ?, ?
    WHERE (SELECT COUNT(*) FROM admins) = 0
  `).bind(id, email.toLowerCase(), passwordHash, now).run();

  if (res.meta.changes === 0) {
    return c.json({ error: 'Admin registration was already claimed by another session.' }, 403);
  }

  // Issue JWT
  const expiresIn = parseInt(c.env.JWT_EXPIRES_IN || '86400', 10);
  const token = await createJWT({ sub: id, email: email.toLowerCase() }, c.env.JWT_SECRET, expiresIn);

  return c.json(
    {
      success: true,
      message: `Admin account successfully created for ${email}`,
      token,
      admin: { id, email: email.toLowerCase() },
    },
    201
  );
});

// POST /api/auth/login — Admin login (rate limited to prevent brute force)
auth.post('/login', rateLimiter(10, 60), zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  const admin = await c.env.DB.prepare(
    'SELECT * FROM admins WHERE LOWER(email) = LOWER(?)'
  ).bind(email).first<AdminRow>();

  if (!admin) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const valid = await verifyPassword(password, admin.password_hash);
  if (!valid) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const expiresIn = parseInt(c.env.JWT_EXPIRES_IN || '86400', 10);
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
