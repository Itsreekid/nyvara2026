const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_BASE_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || 'https://assets.nyvara.com').replace(/\/+$/, '');

const LEGACY_PRODUCT_IMAGE_URL = /^https:\/\/[^/]+\/storage\/v1\/object\/public\/Product\/(?:images\/)?(.+)$/i;

function assertEnv(value, name) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function normalizeLegacyUrl(url) {
  if (!url) return '';
  if (url.startsWith(R2_PUBLIC_BASE_URL)) return url;

  const match = url.match(LEGACY_PRODUCT_IMAGE_URL);
  if (!match) return url;

  const fileName = path.posix.basename(match[1]);
  return `${R2_PUBLIC_BASE_URL}/products/${fileName}`;
}

function isLegacyUrl(url) {
  return typeof url === 'string' && LEGACY_PRODUCT_IMAGE_URL.test(url);
}

async function uploadToR2(s3, sourceUrl, targetUrl) {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download ${sourceUrl}: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const body = Buffer.from(await response.arrayBuffer());
  const key = `products/${path.posix.basename(new URL(targetUrl).pathname)}`;

  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

async function main() {
  assertEnv(SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL');
  assertEnv(SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY');
  assertEnv(R2_ACCOUNT_ID, 'R2_ACCOUNT_ID');
  assertEnv(R2_ACCESS_KEY_ID, 'R2_ACCESS_KEY_ID');
  assertEnv(R2_SECRET_ACCESS_KEY, 'R2_SECRET_ACCESS_KEY');
  assertEnv(R2_BUCKET_NAME, 'R2_BUCKET_NAME');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });

  const [{ data: products, error: productsError }, { data: galleryImages, error: galleryError }] = await Promise.all([
    supabase.from('products').select('id, image_url, color_options'),
    supabase.from('product_images').select('id, image_url'),
  ]);

  if (productsError) throw productsError;
  if (galleryError) throw galleryError;

  const sourceMap = new Map();

  for (const product of products ?? []) {
    if (isLegacyUrl(product.image_url)) {
      sourceMap.set(product.image_url, normalizeLegacyUrl(product.image_url));
    }

    for (const option of product.color_options ?? []) {
      if (isLegacyUrl(option?.image_url)) {
        sourceMap.set(option.image_url, normalizeLegacyUrl(option.image_url));
      }
      if (isLegacyUrl(option?.image_url2)) {
        sourceMap.set(option.image_url2, normalizeLegacyUrl(option.image_url2));
      }
    }
  }

  for (const image of galleryImages ?? []) {
    if (isLegacyUrl(image.image_url)) {
      sourceMap.set(image.image_url, normalizeLegacyUrl(image.image_url));
    }
  }

  console.log(`Found ${sourceMap.size} legacy image URLs to migrate.`);

  for (const [sourceUrl, targetUrl] of sourceMap.entries()) {
    console.log(`Copying ${sourceUrl} -> ${targetUrl}`);
    await uploadToR2(s3, sourceUrl, targetUrl);
  }

  for (const product of products ?? []) {
    let nextImageUrl = product.image_url;
    let nextColorOptions = product.color_options ?? null;
    let changed = false;

    if (isLegacyUrl(product.image_url)) {
      nextImageUrl = normalizeLegacyUrl(product.image_url);
      changed = true;
    }

    if (Array.isArray(product.color_options) && product.color_options.length > 0) {
      const rewrittenOptions = product.color_options.map((option) => {
        const nextOption = { ...option };
        if (isLegacyUrl(nextOption.image_url)) {
          nextOption.image_url = normalizeLegacyUrl(nextOption.image_url);
          changed = true;
        }
        if (isLegacyUrl(nextOption.image_url2)) {
          nextOption.image_url2 = normalizeLegacyUrl(nextOption.image_url2);
          changed = true;
        }
        return nextOption;
      });

      nextColorOptions = rewrittenOptions;
    }

    if (changed) {
      const { error } = await supabase
        .from('products')
        .update({ image_url: nextImageUrl, color_options: nextColorOptions })
        .eq('id', product.id);

      if (error) {
        throw error;
      }
    }
  }

  for (const image of galleryImages ?? []) {
    if (!isLegacyUrl(image.image_url)) continue;

    const { error } = await supabase
      .from('product_images')
      .update({ image_url: normalizeLegacyUrl(image.image_url) })
      .eq('id', image.id);

    if (error) {
      throw error;
    }
  }

  console.log('Migration complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
