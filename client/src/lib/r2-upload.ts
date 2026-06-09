'use client';

type PresignResponse = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
};

type UploadFolder = 'products' | 'gallery' | 'colors';

// ─── Client-side image optimisation ──────────────────────────────────────────
// Resize to at most MAX_WIDTH and convert to WebP before uploading.
// GIF files are uploaded as-is to preserve animation.
const MAX_WIDTH  = 1400;   // px — enough for any storefront display
const QUALITY    = 0.82;   // 0–1 WebP quality

async function compressToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale  = Math.min(1, MAX_WIDTH / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return; }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => blob
          ? resolve(blob)
          : reject(new Error('canvas.toBlob() returned null')),
        'image/webp',
        QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode image'));
    };

    img.src = objectUrl;
  });
}

function buildWebPFileName(): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 12);
  return `${Date.now()}_${uuid}.webp`;
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * 1. Compress + convert the image to WebP on the client.
 * 2. Get a pre-signed PUT URL from the Next.js API route.
 * 3. Stream the optimised blob directly to Cloudflare R2.
 * 4. Return the public `assets.nyvara.com` URL to be saved in the DB.
 */
export async function uploadImageToR2(
  file: File,
  folder: UploadFolder = 'products',
): Promise<string> {
  // GIF: keep as-is (preserve animation); everything else → WebP
  const isGif = file.type === 'image/gif';
  const blob        = isGif ? file : await compressToWebP(file);
  const contentType = isGif ? 'image/gif' : 'image/webp';
  const fileName    = isGif ? `${Date.now()}_${crypto.randomUUID()}.gif` : buildWebPFileName();

  // 1. Get pre-signed upload URL
  const presignRes = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, contentType, folder }),
  });

  if (!presignRes.ok) {
    const errorText = await presignRes.text();
    throw new Error(errorText || 'Unable to create upload URL');
  }

  const { uploadUrl, publicUrl } = (await presignRes.json()) as PresignResponse;

  // 2. Stream optimised blob to R2
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });

  if (!uploadRes.ok) {
    throw new Error(`R2 upload failed with status ${uploadRes.status}`);
  }

  return publicUrl;
}
