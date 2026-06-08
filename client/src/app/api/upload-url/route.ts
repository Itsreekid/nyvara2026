<<<<<<< HEAD
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { R2_PRODUCTS_PUBLIC_URL } from '@/lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type UploadRequest = {
  fileName?: string;
  contentType?: string;
};

function sanitizeFileName(fileName: string): string {
  const baseName = fileName.split(/[\\/]/).pop() ?? '';
  return baseName.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
}

function inferExtension(fileName: string, contentType?: string): string {
  const fromName = fileName.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;

  switch (contentType) {
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'image/avif': return 'avif';
    case 'image/gif': return 'gif';
    default: return 'bin';
  }
}

function buildObjectKey(fileName: string, contentType?: string): string {
  const sanitizedName = sanitizeFileName(fileName) || 'image';
  const extension = inferExtension(sanitizedName, contentType);
  const stem = sanitizedName.replace(/\.[^.]+$/, '');
  const safeStem = stem || 'image';
  const uniquePart = `${Date.now()}_${crypto.randomUUID()}`;

  return `products/${uniquePart}_${safeStem}.${extension}`;
}

function getPublicUrl(objectKey: string): string {
  return `${R2_PRODUCTS_PUBLIC_URL}/${objectKey.replace(/^products\//, '')}`;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const role = cookieStore.get('nyvara_admin_session')?.value;

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return NextResponse.json({ error: 'R2 environment variables are not configured' }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as UploadRequest;
  if (!body.fileName || !body.contentType) {
    return NextResponse.json({ error: 'Missing fileName or contentType' }, { status: 400 });
  }

  const objectKey = buildObjectKey(body.fileName, body.contentType);

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: body.contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 5 });

    return NextResponse.json({
      uploadUrl,
      publicUrl: getPublicUrl(objectKey),
      key: objectKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate upload URL';
=======
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
>>>>>>> a87fb02a84b1924bceb700243511fa91618d07e0
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
