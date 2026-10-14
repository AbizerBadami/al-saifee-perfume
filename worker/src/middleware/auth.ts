// ============================================================
// JWT Authentication Middleware for Hono
// Uses Web Crypto API (native in Workers — no external deps)
// ============================================================

import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { Bindings, Variables } from '../types';

/** Encode bytes to base64url */
function toBase64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decode base64url to bytes */
function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Get HMAC-SHA256 CryptoKey from secret string */
async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/** Create a signed JWT */
export async function createJWT(payload: Record<string, unknown>, secret: string, expiresInSec = 86400): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSec };

  const enc = new TextEncoder();
  const headerB64 = toBase64Url(enc.encode(JSON.stringify(header)));
  const payloadB64 = toBase64Url(enc.encode(JSON.stringify(fullPayload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(signingInput));

  return `${signingInput}.${toBase64Url(sig)}`;
}

/** Verify a JWT and return its payload, or null if invalid */
export async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sigB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await getKey(secret);
  const enc = new TextEncoder();
  const valid = await crypto.subtle.verify('HMAC', key, fromBase64Url(sigB64), enc.encode(signingInput));
  if (!valid) return null;

  const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64)));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

/** Constant-time string comparison to avoid timing side-channels */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
  return `${toBase64Url(salt.buffer)}:${toBase64Url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(':');
  if (!saltB64 || !hashB64) return false;

  const enc = new TextEncoder();
  const salt = fromBase64Url(saltB64);
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);

  return timingSafeEqual(toBase64Url(hash), hashB64);
}

// ---------- Hono middleware ----------

/** Protect routes: requires valid admin JWT in `Authorization: Bearer <token>`.
 *  Customer tokens (role=customer) are rejected here. */
export const authGuard = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized — sign in as admin', code: 'UNAUTHORIZED' }, 401);
  }

  if (!c.env.JWT_SECRET) {
    console.error('JWT_SECRET missing');
    return c.json({ error: 'Server auth is not configured', code: 'CONFIG' }, 500);
  }

  const token = authHeader.slice(7);
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: 'Unauthorized — session expired, please sign in again', code: 'UNAUTHORIZED' }, 401);
  }
  if (payload.role === 'customer') {
    return c.json({ error: 'Forbidden — admin access required', code: 'FORBIDDEN' }, 403);
  }

  // Attach admin info to the context for downstream handlers
  c.set('adminId', payload.sub as string);
  c.set('adminEmail', payload.email as string);

  await next();
});

/** Protect routes: requires valid customer JWT (role=customer). Attaches
 *  customerId + customerEmail to context. Admin tokens are rejected here. */
export const customerGuard = createMiddleware<{ Bindings: Bindings; Variables: Variables & { customerId: string; customerEmail: string } }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Please sign in to continue', code: 'UNAUTHORIZED' }, 401);
  }

  if (!c.env.JWT_SECRET) {
    console.error('JWT_SECRET missing');
    return c.json({ error: 'Server auth is not configured', code: 'CONFIG' }, 500);
  }

  const token = authHeader.slice(7);
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload || payload.role !== 'customer') {
    return c.json({ error: 'Please sign in to continue', code: 'UNAUTHORIZED' }, 401);
  }

  c.set('customerId', payload.sub as string);
  c.set('customerEmail', payload.email as string);

  await next();
});

/** Best-effort admin check for mixed public/admin endpoints (e.g. review moderation queues).
 *  Returns true only when a valid admin JWT is present (customer tokens excluded). Never throws. */
export async function isAdminRequest(c: { req: { header: (n: string) => string | undefined }; env: Bindings }): Promise<boolean> {
  try {
    const h = c.req.header('Authorization');
    if (!h?.startsWith('Bearer ') || !c.env.JWT_SECRET) return false;
    const payload = await verifyJWT(h.slice(7), c.env.JWT_SECRET);
    return Boolean(payload?.sub) && payload?.role !== 'customer';
  } catch {
    return false;
  }
}
