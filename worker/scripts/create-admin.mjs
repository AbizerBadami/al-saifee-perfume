// Create the single admin directly in D1 — API registration is disabled.
// Usage:
//   node worker/scripts/create-admin.mjs admin@example.com 'StrongPassword123'
// Output: a ready-to-run wrangler INSERT command. The password is never stored;
// only the PBKDF2-SHA256 hash (100k iterations, 16-byte salt) compatible with
// worker/src/middleware/auth.ts verifyPassword().
import { pbkdf2Sync, randomBytes } from 'node:crypto';

function toBase64Url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const [emailRaw, password] = process.argv.slice(2);
if (!emailRaw || !password) {
  console.error("Usage: node worker/scripts/create-admin.mjs <email> <password (min 12 chars recommended)>");
  process.exit(1);
}
const email = emailRaw.trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Invalid email address.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters (12+ recommended).');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, 100000, 32, 'sha256');
const passwordHash = `${toBase64Url(salt)}:${toBase64Url(hash)}`;
const id = `admin-${randomBytes(8).toString('hex')}`;
const now = new Date().toISOString();
const sql = `INSERT INTO admins (id, email, password_hash, created_at) VALUES ('${id}', '${email.replace(/'/g, "''")}', '${passwordHash}', '${now}');`;

console.log('\nRun this against D1 (only once — a second INSERT is rejected by trg_single_admin):\n');
console.log(`wrangler d1 execute al-saifee-db --remote --command "${sql}"`);
console.log('\nLocal dev:\n');
console.log(`wrangler d1 execute al-saifee-db --local --command "${sql}"\n`);
