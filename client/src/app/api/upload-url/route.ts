import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { R2_PUBLIC_BASE_URL, getR2Client } from '@/lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type UploadRequest = {
  fileName?: string;
  contentType?: string;
  folder?: 'products' | 'gallery' | 'colors';
};

const ALLOWED_FOLDERS = new Set(['products', 'gallery', 'colors']);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

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

function buildObjectKey(fileName: string, contentType?: string, folder: string = 'products'): string {
  const safeFolder = ALLOWED_FOLDERS.has(folder) ? folder : 'products';
  const sanitizedName = sanitizeFileName(fileName) || 'image';
  const extension = inferExtension(sanitizedName, contentType);
  const stem = sanitizedName.replace(/\.[^.]+$/, '');
  const safeStem = stem || 'image';
  const uniquePart = `${Date.now()}_${crypto.randomUUID()}`;

  return `${safeFolder}/${uniquePart}_${safeStem}.${extension}`;
}

function getPublicUrl(objectKey: string): string {
  return `${R2_PUBLIC_BASE_URL}/${objectKey}`;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('nyvara_admin_session')?.value;

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as UploadRequest;
    const { fileName, contentType, folder = 'products' } = body;

    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid fileName' }, { status: 400 });
    }

    if (!contentType || !ALLOWED_MIME_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: `Unsupported content type: ${contentType}. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}` },
        { status: 400 }
      );
    }

    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) {
      return NextResponse.json({ error: 'R2_BUCKET_NAME is not configured' }, { status: 500 });
    }

    const key = buildObjectKey(fileName, contentType, folder);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 60 * 5 });

    return NextResponse.json({
      uploadUrl,
      publicUrl: getPublicUrl(key),
      key,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate upload URL';
    console.error('[upload-url] Error generating presigned URL:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
