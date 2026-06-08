const DEFAULT_PUBLIC_BASE_URL = 'https://assets.nyvara.com';
const LEGACY_SUPABASE_PRODUCT_IMAGE_URL = /^https:\/\/[^/]+\/storage\/v1\/object\/public\/Product\/(?:images\/)?(.+)$/i;

const trimmedPublicBaseUrl = (process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ?? DEFAULT_PUBLIC_BASE_URL).replace(/\/+$/, '');

export const R2_PUBLIC_BASE_URL = trimmedPublicBaseUrl;
export const R2_PRODUCTS_PUBLIC_URL = `${R2_PUBLIC_BASE_URL}/products`;

export function normalizeProductImageUrl(value: string | null | undefined): string {
  if (!value) return '';
  if (value.startsWith(R2_PUBLIC_BASE_URL)) return value;

  const legacyMatch = value.match(LEGACY_SUPABASE_PRODUCT_IMAGE_URL);
  if (legacyMatch) {
    return `${R2_PRODUCTS_PUBLIC_URL}/${legacyMatch[1].replace(/^\/+/, '')}`;
  }

  return value;
}
