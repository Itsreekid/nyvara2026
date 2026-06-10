import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client } from '@/lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('nyvara_admin_session')?.value;

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { fileName, contentType, folder = 'products' } = body;

    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid fileName' }, { status: 400 });
    }

    if (!contentType || !ALLOWED_MIME_TYPES.has(contentType)) {
      return NextResponse.json({ error: `Unsupported content type: ${contentType}` }, { status: 400 });
    }

    const bucket = process.env.R2_BUCKET_NAME;
    const keyPrefix = process.env.R2_KEY_PREFIX || 'nyvarastore';
    const publicBase = process.env.R2_PUBLIC_URL || 'https://pub-96ecbfcde03642529999eddf062d31f5.r2.dev';

    if (!bucket) {
      return NextResponse.json({ error: 'R2_BUCKET_NAME is not configured' }, { status: 500 });
    }

    // Simple key: prefix/folder/filename
    const key = `${keyPrefix}/${folder}/${fileName}`;

    // Public URL: base/prefix/folder/filename
    const publicUrl = `${publicBase}/${key}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 300 });

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate upload URL';
    console.error('[upload-url] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
