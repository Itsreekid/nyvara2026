import type { Product } from '@/types';
import { normalizeProductImageUrl } from '@/lib/r2';

export const DEFAULT_GOOGLE_PRODUCT_CATEGORY =
  'Apparel & Accessories > Clothing Accessories > Sunglasses';

export const DEFAULT_BRAND = 'Nyvara';

export type MetaCatalogProduct = Pick<
  Product,
  | 'id'
  | 'title'
  | 'description'
  | 'price'
  | 'final_price'
  | 'discount'
  | 'stock'
  | 'image_url'
  | 'gender'
  | 'badge'
  | 'brand'
  | 'google_product_category'
  | 'color_options'
> & {
  categories?: Product['categories'] | { name: string | null }[] | null;
};

export function formatMetaPrice(price: number): string {
  return `${price.toFixed(3)} TND`;
}

export function isProductOnSale(product: {
  price: number | null;
  final_price: number | null;
  discount?: number | null;
}): boolean {
  if (product.final_price != null && product.price != null && product.final_price < product.price) {
    return true;
  }
  return (product.discount ?? 0) > 0;
}

export function getProductPricing(product: {
  price: number | null;
  final_price: number | null;
  discount?: number | null;
}): { regularPrice: number; salePrice: number; onSale: boolean } {
  const regularPrice = product.price ?? product.final_price ?? 0;
  const salePrice = product.final_price ?? product.price ?? 0;
  const onSale = isProductOnSale(product);
  return { regularPrice, salePrice, onSale };
}

export function collectAdditionalImageUrls(
  product: Pick<MetaCatalogProduct, 'image_url' | 'color_options'>,
  galleryUrls: string[] = []
): string[] {
  const primary = normalizeProductImageUrl(product.image_url);
  const seen = new Set<string>();
  const additional: string[] = [];

  const add = (url: string | null | undefined) => {
    const normalized = normalizeProductImageUrl(url);
    if (!normalized || normalized === primary || seen.has(normalized)) return;
    seen.add(normalized);
    additional.push(normalized);
  };

  for (const co of product.color_options ?? []) {
    add(co.image_url);
    add(co.image_url2);
  }

  for (const url of galleryUrls) {
    add(url);
  }

  return additional;
}

function escXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function mapGender(gender: MetaCatalogProduct['gender']): string {
  if (gender === 'homme') return 'male';
  if (gender === 'femme') return 'female';
  return 'unisex';
}

export function buildMetaCatalogXmlItem(
  product: MetaCatalogProduct,
  options?: { galleryUrls?: string[]; indent?: string }
): string {
  const indent = options?.indent ?? '    ';
  const { regularPrice, salePrice, onSale } = getProductPricing(product);
  const title = escXml(product.title ?? 'Nyvara Sunglasses');
  const description = escXml(product.description ?? 'Lunettes de soleil de luxe — Nyvara Tunisia');
  const link = `https://nyvara.net/shop/${product.id}`;
  const imageLink = normalizeProductImageUrl(product.image_url);
  const availability = (product.stock ?? 0) > 0 ? 'in stock' : 'out of stock';
  const brand = escXml(product.brand ?? DEFAULT_BRAND);
  const googleCategory = escXml(product.google_product_category ?? DEFAULT_GOOGLE_PRODUCT_CATEGORY);
  const categoryName = Array.isArray(product.categories)
    ? product.categories[0]?.name
    : product.categories?.name;
  const productType = escXml(categoryName ?? 'sunglasses');
  const gender = mapGender(product.gender);
  const additionalImages = collectAdditionalImageUrls(product, options?.galleryUrls ?? []);

  const priceBlock = onSale
    ? `<g:price>${formatMetaPrice(regularPrice)}</g:price>
${indent}  <g:sale_price>${formatMetaPrice(salePrice)}</g:sale_price>`
    : `<g:price>${formatMetaPrice(salePrice)}</g:price>`;

  const additionalImageBlock = additionalImages
    .map(url => `${indent}  <g:additional_image_link>${url}</g:additional_image_link>`)
    .join('\n');

  return `${indent}<item>
${indent}  <g:id>${product.id}</g:id>
${indent}  <g:title>${title}</g:title>
${indent}  <g:description>${description}</g:description>
${indent}  <g:link>${link}</g:link>
${indent}  <g:image_link>${imageLink}</g:image_link>${additionalImageBlock ? `\n${additionalImageBlock}` : ''}
${indent}  <g:availability>${availability}</g:availability>
${indent}  ${priceBlock}
${indent}  <g:brand>${brand}</g:brand>
${indent}  <g:condition>new</g:condition>
${indent}  <g:google_product_category>${googleCategory}</g:google_product_category>
${indent}  <g:product_type>${productType}</g:product_type>
${indent}  <g:gender>${gender}</g:gender>${product.badge ? `\n${indent}  <g:custom_label_0>${escXml(product.badge)}</g:custom_label_0>` : ''}
${indent}</item>`;
}

export function buildMetaCatalogCsvRow(product: MetaCatalogProduct, galleryUrls: string[] = []): string {
  const esc = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const { regularPrice, salePrice, onSale } = getProductPricing(product);
  const additionalImages = collectAdditionalImageUrls(product, galleryUrls);

  return [
    esc(product.id),
    esc(product.title ?? ''),
    esc(product.description ?? 'Lunettes de soleil Nyvara'),
    esc((product.stock ?? 0) > 0 ? 'in stock' : 'out of stock'),
    esc('new'),
    esc(formatMetaPrice(onSale ? regularPrice : salePrice)),
    esc(onSale ? formatMetaPrice(salePrice) : ''),
    esc(`https://nyvara.net/shop/${product.id}`),
    esc(normalizeProductImageUrl(product.image_url)),
    esc(additionalImages.join(',')),
    esc(product.brand ?? DEFAULT_BRAND),
    esc(product.google_product_category ?? DEFAULT_GOOGLE_PRODUCT_CATEGORY),
    esc(product.gender === 'homme' ? 'male' : product.gender === 'femme' ? 'female' : 'unisex'),
  ].join(',');
}
