// Auth API Routes — login only (single admin provisioned directly in D1)
// Admin creation via API is permanently disabled. The one admin row is
// inserted directly in the database (see worker/scripts/create-admin.mjs).
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Bindings, Variables, AdminRow } from '../types';
import { verifyPassword, createJWT, authGuard, normalizeEmail } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
});

function parseExpiry(raw: string | undefined): number {
  const n = parseInt(raw || '86400', 10);
  if (!Number.isFinite(n) || n < 300 || n > 30 * 86400) return 86400;
  return n;
}

// POST /api/auth/register — permanently disabled.
// The single admin is created directly in D1, never through the app.
auth.post('/register', rateLimiter(10, 600), async (c) => {
  return c.json(
    { error: 'Admin registration is disabled. The admin account is provisioned directly in the database.', code: 'REGISTRATION_DISABLED' },
    403
  );
});

// POST /api/auth/login — single admin login (rate-limited, generic errors)
auth.post('/login', rateLimiter(20, 600), zValidator('json', credentialsSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const normalized = normalizeEmail(email);

  const admin = await c.env.DB.prepare('SELECT * FROM admins WHERE email = ?').bind(normalized).first<AdminRow>();
  if (!admin) {
    return c.json({ error: 'Invalid email or password', code: 'UNAUTHORIZED' }, 401);
  }

  const valid = await verifyPassword(password, admin.password_hash);
  if (!valid) {
    return c.json({ error: 'Invalid email or password', code: 'UNAUTHORIZED' }, 401);
  }

  const token = await createJWT({ sub: admin.id, email: admin.email }, c.env.JWT_SECRET, parseExpiry(c.env.JWT_EXPIRES_IN));

  return c.json({ success: true, token, admin: { id: admin.id, email: admin.email } });
});

// GET /api/auth/me — check current token validity (admin only)
auth.get('/me', authGuard, async (c) => {
  return c.json({ id: c.get('adminId'), email: c.get('adminEmail'), isAdmin: true });
});

export default auth;
