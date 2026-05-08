/**
 * One-time seed script — creates the first admin user.
 * Run from the client folder: node scripts/seed-admin.mjs
 *
 * Edit USERNAME, PASSWORD and FULL_NAME below before running.
 */

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Load .env.local automatically ───────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath   = resolve(__dirname, '../.env.local');

const envVars = {};
try {
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key   = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    envVars[key] = value;
  }
} catch {
  console.error('❌  Could not read .env.local — make sure you run this from the client/ folder.');
  process.exit(1);
}

const SUPABASE_URL     = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || SERVICE_ROLE_KEY === 'your_service_role_key_here') {
  console.error('❌  Add your real SUPABASE_SERVICE_ROLE_KEY to .env.local first.');
  process.exit(1);
}

// ── Edit these ───────────────────────────────────────────────────────────────
const USERNAME  = 'admin';
const PASSWORD  = 'nyvara2026';   // ← change to your desired password
const FULL_NAME = 'Administrateur';
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log(`⏳  Creating admin user "${USERNAME}"...`);
const hash = await bcrypt.hash(PASSWORD, 12);

const { error } = await supabase.from('admin_users').insert({
  username:      USERNAME,
  password_hash: hash,
  role:          'admin',
  full_name:     FULL_NAME,
});

if (error) {
  if (error.code === '23505') {
    console.error(`❌  Username "${USERNAME}" already exists.`);
  } else {
    console.error('❌  Error:', error.message);
  }
} else {
  console.log(`✅  Admin user "${USERNAME}" created!`);
  console.log(`    Login at: http://localhost:3000/admin/login`);
  console.log(`    Username: ${USERNAME}`);
  console.log(`    Password: ${PASSWORD}`);
}
