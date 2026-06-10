'use client';

type PresignResponse = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
};

type UploadFolder = 'products' | 'gallery' | 'colors';

/**
 * Upload an image file directly to Cloudflare R2.
 * No compression, no conversion — just upload the file as-is.
 */
export async function uploadImageToR2(
  file: File,
  folder: UploadFolder = 'products',
): Promise<string> {
  await validateSquareImage(file);

  const fileName = `${Date.now()}_${crypto.randomUUID()}.${getExtension(file)}`;

  // 1. Get pre-signed upload URL
  const presignRes = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, contentType: file.type, folder }),
  });

  if (!presignRes.ok) {
    const errorText = await presignRes.text();
    throw new Error(errorText || 'Unable to create upload URL');
  }

  const { uploadUrl, publicUrl } = (await presignRes.json()) as PresignResponse;

  // 2. Upload file directly to R2
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(`R2 upload failed with status ${uploadRes.status}`);
  }

  return publicUrl;
}

async function validateSquareImage(file: File): Promise<void> {
  const dimensions = await loadImageDimensions(file);

  if (dimensions.width !== dimensions.height) {
    throw new Error('Image must be square (1:1 ratio)');
  }
}

function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    image.onload = () => {
      const { naturalWidth, naturalHeight } = image;
      cleanup();
      resolve({ width: naturalWidth, height: naturalHeight });
    };

    image.onerror = () => {
      cleanup();
      reject(new Error('Unable to read image dimensions'));
    };

    image.src = objectUrl;
  });
}

function getExtension(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext && ext.length <= 5) return ext;
  switch (file.type) {
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'image/gif': return 'gif';
    default: return 'jpg';
  }
}
