'use client';

type PresignResponse = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
};

function getFileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;

  switch (file.type) {
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'image/avif': return 'avif';
    case 'image/gif': return 'gif';
    default: return 'bin';
  }
}

function buildUniqueFileName(file: File): string {
  const extension = getFileExtension(file);
  const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 12);

  return `${Date.now()}_${randomPart}.${extension}`;
}

export async function uploadImageToR2(file: File): Promise<string> {
  const response = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: buildUniqueFileName(file),
      contentType: file.type || 'application/octet-stream',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Unable to create upload URL');
  }

  const { uploadUrl, publicUrl } = (await response.json()) as PresignResponse;

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error(`R2 upload failed with status ${uploadResponse.status}`);
  }

  return publicUrl;
}
