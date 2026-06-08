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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
