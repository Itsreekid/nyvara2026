import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client } from '@/lib/r2';

// ─── Types ────────────────────────────────────────────────────────────────────
interface UploadUrlRequest {
  filename: string;    // original filename, used to extract the extension
  contentType: string; // MIME type, e.g. "image/webp"
  folder?: string;     // "products" | "gallery" | "colors" — defaults to "products"
}

// ─── Constants ────────────────────────────────────────────────────────────────
// Only WebP is accepted — the Admin browser compresses & converts before uploading.
const ALLOWED_MIME_TYPES = new Set(['image/webp']);

const PRESIGN_EXPIRES_IN = 15 * 60; // 15 minutes in seconds

const ALLOWED_FOLDERS = new Set(['products', 'gallery', 'colors']);

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body: UploadUrlRequest = await request.json();
    const { filename, contentType, folder = 'products' } = body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid filename' }, { status: 400 });
    }

    if (!contentType || !ALLOWED_MIME_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: `Unsupported content type: ${contentType}. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}` },
        { status: 400 }
      );
    }

    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json(
        { error: `Invalid folder: ${folder}. Allowed: products, gallery, colors` },
        { status: 400 }
      );
    }

    // ── Generate a unique object key ─────────────────────────────────────────
    // Extension is always .webp — the client-side compressor guarantees this.
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // R2_KEY_PREFIX is the subfolder inside the bucket (e.g. "nyvarastore").
    // The S3 key uses the raw name (spaces are valid in S3 keys).
    // The public URL must percent-encode the prefix so browsers resolve it.
    const keyPrefix = process.env.R2_KEY_PREFIX ?? '';
    const keyFolder = keyPrefix ? `${keyPrefix}/${folder}` : folder;
    const key = `${keyFolder}/${uniqueId}.webp`;

    // ── Issue presigned PUT URL ──────────────────────────────────────────────
    const bucket = process.env.R2_BUCKET_NAME ?? 'nyvara';
    const r2PublicUrl = (process.env.R2_PUBLIC_URL ?? 'https://pub-96ecbfcde03642529999eddf062d31f5.r2.dev').replace(/\/$/, '');

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(getR2Client(), command, {
      expiresIn: PRESIGN_EXPIRES_IN,
    });

    // Encode each path segment individually so spaces → %20
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    const publicUrl = `${r2PublicUrl}/${encodedKey}`;

    return NextResponse.json({ uploadUrl, publicUrl }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[upload-url] Error generating presigned URL:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
