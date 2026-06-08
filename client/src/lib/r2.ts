import { S3Client } from '@aws-sdk/client-s3';

// ─── Cloudflare R2 S3-compatible client ───────────────────────────────────────
// All env vars are server-only (no NEXT_PUBLIC_ prefix).
// This file must never be imported from a 'use client' component.

let _client: S3Client | null = null;

/**
 * Returns a singleton S3Client pointed at the Cloudflare R2 endpoint.
 * Lazily initialized so missing env vars only throw at call time, not at
 * module load, which makes local development without R2 credentials safe.
 */
export function getR2Client(): S3Client {
  if (_client) return _client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      '[R2] Missing credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in .env.local'
    );
  }

  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return _client;
}

// ─── Image URL normalizer ─────────────────────────────────────────────────────
const SUPABASE_BASE =
  'https://vkrgfqjsixjsieqzykcx.supabase.co/storage/v1/object/public/Product/images/';

/**
 * Converts a legacy Supabase Storage URL to its Cloudflare R2 equivalent.
 * Used as a safety net in the Meta feed and anywhere we render old DB rows
 * that haven't been updated by the SQL migration script yet.
 *
 * Supabase URL pattern:
 *   https://vkrgfqjsixjsieqzykcx.supabase.co/storage/v1/object/public/Product/images/<file>
 *
 * R2 URL pattern:
 *   https://assets.nyvara.com/products/<file>
 *
 * Non-Supabase URLs (already R2 or external) are returned unchanged.
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return '';

  if (url.startsWith(SUPABASE_BASE)) {
    const filename = url.slice(SUPABASE_BASE.length);
    const r2Base = process.env.R2_PUBLIC_URL ?? 'https://assets.nyvara.com';
    return `${r2Base}/products/${filename}`;
  }

  return url;
}
