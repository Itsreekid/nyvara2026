/**
 * migrate-supabase-images-to-r2.mjs
 * Nyvara — One-time migration: Supabase Storage → Cloudflare R2
 *
 * USAGE:
 *   node --env-file=.env.local scripts/migrate-supabase-images-to-r2.mjs
 *
 * SAFETY FLAGS (env vars):
 *   DRY_RUN=true   (DEFAULT) — prints plan, writes nothing to R2
 *   DRY_RUN=false            — live writes to R2
 *   LIMIT=2        (DEFAULT) — process first N unique URLs; 0 = ALL
 *
 * EXAMPLES:
 *   # Safe preview (no writes, first 2 URLs)
 *   DRY_RUN=true  LIMIT=2 node --env-file=.env.local scripts/migrate-supabase-images-to-r2.mjs
 *
 *   # Live test — copy 2 real files to verify credentials work
 *   DRY_RUN=false LIMIT=2 node --env-file=.env.local scripts/migrate-supabase-images-to-r2.mjs
 *
 *   # Full production run
 *   DRY_RUN=false LIMIT=0 node --env-file=.env.local scripts/migrate-supabase-images-to-r2.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Safety flags ─────────────────────────────────────────────────────────────
const DRY_RUN = (process.env.DRY_RUN ?? 'true') !== 'false';
const LIMIT   = parseInt(process.env.LIMIT ?? '2', 10); // 0 = no limit

// ─── Env validation ───────────────────────────────────────────────────────────
const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
  'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME', 'R2_PUBLIC_URL',
];
for (const v of REQUIRED) {
  if (!process.env[v]) { console.error(`❌ Missing env var: ${v}`); process.exit(1); }
}

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET     = process.env.R2_BUCKET_NAME;
const R2_KEY_PREFIX = process.env.R2_KEY_PREFIX ?? 'nyvara store';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL.replace(/\/$/, '');

// ─── Clients ──────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isSupabaseUrl = (url) =>
  typeof url === 'string' && url.includes('supabase.co');

function buildR2Info(supabaseUrl) {
  const filename = supabaseUrl.split('/images/').pop();
  if (!filename) return null;
  const r2Key      = `${R2_KEY_PREFIX}/products/${filename}`;
  const encodedKey = r2Key.split('/').map(encodeURIComponent).join('/');
  return { r2Key, publicUrl: `${R2_PUBLIC_URL}/${encodedKey}`, filename };
}

function guessContentType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ({ webp:'image/webp', jpg:'image/jpeg', jpeg:'image/jpeg',
            png:'image/png', avif:'image/avif', gif:'image/gif' })[ext] ?? 'image/jpeg';
}

async function existsInR2(r2Key) {
  try { await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: r2Key })); return true; }
  catch { return false; }
}

async function downloadBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} from Supabase`);
  return {
    buffer: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get('content-type') ?? 'image/jpeg',
  };
}

// ─── Collect all Supabase URLs from the database ──────────────────────────────
async function collectUrls() {
  console.log('\n📋  Querying database for Supabase image URLs...\n');
  const urlMap = new Map(); // supabaseUrl → source label

  // 1. products.image_url
  const { data: prods, error: e1 } = await supabase
    .from('products').select('id, title, image_url').like('image_url', '%supabase.co%');
  if (e1) throw new Error(`products query: ${e1.message}`);
  for (const p of prods ?? []) {
    if (isSupabaseUrl(p.image_url))
      urlMap.set(p.image_url, `products/${p.id} — "${p.title}"`);
  }
  console.log(`  [products.image_url]    ${prods?.length ?? 0} row(s)`);

  // 2. product_images.image_url  (gallery)
  const { data: gallery, error: e2 } = await supabase
    .from('product_images').select('id, product_id, image_url').like('image_url', '%supabase.co%');
  if (e2) throw new Error(`product_images query: ${e2.message}`);
  for (const g of gallery ?? []) {
    if (isSupabaseUrl(g.image_url))
      urlMap.set(g.image_url, `gallery/product_id:${g.product_id}`);
  }
  console.log(`  [product_images]        ${gallery?.length ?? 0} row(s)`);

  // 3. products.color_options JSONB (image_url + image_url2 per variant)
  let colorCount = 0;
  const { data: colored, error: e3 } = await supabase
    .from('products').select('id, title, color_options').not('color_options', 'is', null);
  if (e3) throw new Error(`color_options query: ${e3.message}`);
  for (const p of colored ?? []) {
    if (!Array.isArray(p.color_options)) continue;
    for (const opt of p.color_options) {
      if (isSupabaseUrl(opt.image_url))  { urlMap.set(opt.image_url,  `colors/${p.id}/${opt.name ?? '?'} img1`); colorCount++; }
      if (isSupabaseUrl(opt.image_url2)) { urlMap.set(opt.image_url2, `colors/${p.id}/${opt.name ?? '?'} img2`); colorCount++; }
    }
  }
  console.log(`  [color_options JSONB]   ${colorCount} URL(s) across all variants`);
  console.log(`\n  ✅ Total unique Supabase URLs: ${urlMap.size}\n`);
  return urlMap;
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();

  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  Nyvara — Supabase Storage → Cloudflare R2 Migration ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`\n  DRY_RUN  : ${DRY_RUN ? '✅ YES — read-only, nothing written' : '🚀 NO  — LIVE writes to R2'}`);
  console.log(`  LIMIT    : ${LIMIT === 0 ? 'ALL files' : `first ${LIMIT} URL(s)`}`);
  console.log(`  R2 Bucket: ${R2_BUCKET}  prefix: ${R2_KEY_PREFIX}/products/`);

  const urlMap = await collectUrls();
  if (urlMap.size === 0) { console.log('✅  Nothing to migrate.'); return; }

  let entries = [...urlMap.entries()];
  if (LIMIT > 0 && entries.length > LIMIT) {
    console.log(`⚠️  Applying LIMIT=${LIMIT}. ${entries.length - LIMIT} URL(s) will be skipped this run.\n`);
    entries = entries.slice(0, LIMIT);
  }

  // CSV report header
  const report = [['#','source','filename','r2_key','r2_public_url','status','size_kb']];
  let copied = 0, skipped = 0, failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const [supabaseUrl, source] = entries[i];
    const n = `[${String(i+1).padStart(String(entries.length).length)}/${entries.length}]`;
    const info = buildR2Info(supabaseUrl);

    if (!info) {
      console.log(`${n} ⚠️  Could not parse URL:\n     ${supabaseUrl}\n`);
      report.push([i+1, source, '?', '?', '?', 'parse_error', 0]);
      failed++; continue;
    }

    const { r2Key, publicUrl, filename } = info;

    console.log(`${n} 📄  ${filename}`);
    console.log(`     Source  : ${source}`);
    console.log(`     R2 Key  : ${r2Key}`);
    console.log(`     Pub URL : ${publicUrl}`);
    console.log(`     Type    : ${guessContentType(filename)}`);

    try {
      // DRY_RUN — report only
      if (DRY_RUN) {
        console.log(`     Status  : 🔍 DRY_RUN — would upload\n`);
        report.push([i+1, source, filename, r2Key, publicUrl, 'dry_run', 0]);
        skipped++; continue;
      }

      // Idempotency check
      if (await existsInR2(r2Key)) {
        console.log(`     Status  : ⏭  Already exists in R2 — skipped\n`);
        report.push([i+1, source, filename, r2Key, publicUrl, 'already_exists', 0]);
        skipped++; continue;
      }

      // Download from Supabase
      console.log(`     Status  : ⬇️  Downloading from Supabase...`);
      const { buffer, contentType } = await downloadBuffer(supabaseUrl);
      const kb = (buffer.length / 1024).toFixed(1);
      console.log(`              ✅ ${kb} KB  (Content-Type: ${contentType})`);

      // Upload to R2 with correct Content-Type metadata
      console.log(`     Status  : ⬆️  Uploading to R2...`);
      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET, Key: r2Key, Body: buffer, ContentType: contentType,
      }));

      console.log(`     Status  : ✅ Copied successfully\n`);
      report.push([i+1, source, filename, r2Key, publicUrl, 'copied', kb]);
      copied++;

    } catch (err) {
      console.log(`     Status  : ❌ FAILED — ${err.message}\n`);
      report.push([i+1, source, filename, r2Key, publicUrl, `failed: ${err.message}`, 0]);
      failed++;
    }
  }

  // Write CSV
  const csv = report.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const csvPath = path.join(__dirname, 'migration_report.csv');
  await writeFile(csvPath, csv, 'utf-8');

  // Final summary
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                   Summary                             ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  ✅ Copied   : ${String(copied).padEnd(40)}║`);
  console.log(`║  ⏭  Skipped  : ${String(skipped).padEnd(40)}║`);
  console.log(`║  ❌ Failed   : ${String(failed).padEnd(40)}║`);
  console.log(`║  ⏱  Time     : ${(elapsed+'s').padEnd(40)}║`);
  console.log(`║  📄 Report   : scripts/migration_report.csv${' '.repeat(11)}║`);
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('ℹ️  DRY_RUN=true — no files were written.');
    console.log('   Next: run with DRY_RUN=false LIMIT=2 for a live test.\n');
  } else if (failed > 0) {
    console.log('⚠️  Fix the failed items above and re-run (script is idempotent).\n');
    process.exit(1);
  } else if (copied > 0) {
    console.log('🎉 Migration complete! Run supabase_migration_r2_urls.sql next.\n');
  }
}

main().catch(err => { console.error(`\n💥 Fatal: ${err.message}`); process.exit(1); });
