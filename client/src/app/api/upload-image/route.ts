import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client } from '@/lib/r2';
import sharp from 'sharp';

// ─── Constants ────────────────────────────────────────────────────────────────
const ALLOWED_FOLDERS = new Set(['products', 'gallery', 'colors']);
const MAX_WIDTH = 1200;
const WEBP_QUALITY = 80;

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'products';

    // ── Validation ──────────────────────────────────────────────────────────
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Must be an image.` },
        { status: 400 }
      );
    }

    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json(
        { error: `Invalid folder: ${folder}. Allowed: products, gallery, colors` },
        { status: 400 }
      );
    }

    // Read the file into a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ── Image Processing Pipeline (Sharp) ────────────────────────────────────
    const processedBuffer = await sharp(buffer)
      .resize({
        width: MAX_WIDTH,
        withoutEnlargement: true, // Don't scale up smaller images
      })
      .webp({ quality: WEBP_QUALITY }) // Convert to WebP
      .toBuffer();

    // ── Generate a unique object key ─────────────────────────────────────────
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const ext = 'webp'; // Hardcoded since we force convert to WebP

    // R2_KEY_PREFIX is the subfolder inside the bucket (e.g. "nyvarastore").
    const keyPrefix = process.env.R2_KEY_PREFIX ?? '';
    const keyFolder = keyPrefix ? `${keyPrefix}/${folder}` : folder;
    const key = `${keyFolder}/${uniqueId}.${ext}`;

    // ── Upload to Cloudflare R2 ──────────────────────────────────────────────
    const bucket = process.env.R2_BUCKET_NAME ?? 'nyvara';
    const r2PublicUrl = (process.env.R2_PUBLIC_URL ?? 'https://pub-96ecbfcde03642529999eddf062d31f5.r2.dev').replace(/\/$/, '');

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: processedBuffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable', // Permanent edge caching
    });

    await getR2Client().send(command);

    // Encode each path segment individually so spaces → %20
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    const publicUrl = `${r2PublicUrl}/${encodedKey}`;

    return NextResponse.json({ publicUrl }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[upload-image] Error processing/uploading image:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
