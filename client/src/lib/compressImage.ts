/**
 * compressImage.ts
 *
 * Client-side image compression utility.
 * Runs entirely in the browser (zero serverless cost).
 *
 * Uses the Canvas API to:
 *  1. Decode any image format (JPEG, PNG, HEIC via browser, etc.)
 *  2. Resize to at most `maxWidth` pixels wide (never upscales)
 *  3. Encode as image/webp at the given quality (0–1)
 *
 * Returns a Blob ready to be PUT directly to a Cloudflare R2 presigned URL.
 */
export async function compressToWebP(
  file: File,
  maxWidth = 1200,
  quality = 0.82,
): Promise<Blob> {
  // 1. Decode the source image into an HTMLImageElement
  const bitmap = await createImageBitmap(file);

  // 2. Calculate output dimensions — never enlarge
  const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
  const outW = Math.round(bitmap.width * scale);
  const outH = Math.round(bitmap.height * scale);

  // 3. Draw onto a canvas and export as WebP
  const canvas = document.createElement('canvas');
  canvas.width  = outW;
  canvas.height = outH;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.drawImage(bitmap, 0, 0, outW, outH);
  bitmap.close(); // free memory

  // 4. Return a WebP Blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob() returned null — WebP may not be supported.'));
        }
      },
      'image/webp',
      quality,
    );
  });
}
