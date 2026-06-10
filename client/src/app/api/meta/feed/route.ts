import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildMetaCatalogXmlItem } from '@/lib/meta-catalog';
import type { MetaCatalogProduct } from '@/lib/meta-catalog';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SITE_URL = 'https://nyvara.net';

type GalleryRow = { product_id: string; image_url: string };

export const dynamic = 'force-dynamic';

export async function GET() {
  const [{ data: products, error }, { data: galleryRows, error: galleryError }] = await Promise.all([
    supabase
      .from('products')
      .select('id, title, description, price, final_price, discount, stock, image_url, gender, badge, brand, google_product_category, color_options, categories(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('product_images')
      .select('product_id, image_url')
      .order('sort_order', { ascending: true }),
  ]);

  if (error || galleryError) {
    console.error('[Meta Feed] Supabase error:', error?.message ?? galleryError?.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }

  const galleryByProduct = (galleryRows ?? []).reduce<Record<string, string[]>>((acc, row: GalleryRow) => {
    if (!acc[row.product_id]) acc[row.product_id] = [];
    acc[row.product_id].push(row.image_url);
    return acc;
  }, {});

  const items = (products ?? [])
    .map(product =>
      buildMetaCatalogXmlItem(product as MetaCatalogProduct, {
        galleryUrls: galleryByProduct[product.id] ?? [],
      })
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Nyvara — Catalogue Produits</title>
    <link>${SITE_URL}</link>
    <description>Meta Dynamic Ads Catalog — Nyvara Sunglasses Tunisia</description>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
