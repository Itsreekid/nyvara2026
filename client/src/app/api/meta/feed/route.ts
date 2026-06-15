import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildMetaCatalogXmlItem } from '@/lib/meta-catalog';
import type { MetaCatalogProduct } from '@/lib/meta-catalog';

const SITE_URL = 'https://nyvara.net';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Validate env vars at request time so missing vars produce a clear log
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      '[Meta Feed] Missing env vars:',
      !supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : '',
      !supabaseServiceKey ? 'SUPABASE_SERVICE_ROLE_KEY' : ''
    );
    return new NextResponse('Server misconfiguration: missing environment variables', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: products, error } = await supabase
    .from('products')
    .select('id, title, description, price, final_price, discount, stock, image_url, gender')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Meta Feed] Supabase query error:', error.message, error.code);
    return new NextResponse(`Supabase error: ${error.message}`, { status: 500 });
  }

  // Filter products to exclude those without a primary image or without a valid price
  const validProducts = (products ?? []).filter(product => {
    const hasImage = !!product.image_url;
    const price = product.price ?? product.final_price ?? 0;
    const hasPrice = price > 0;
    return hasImage && hasPrice;
  });

  console.log(`[Meta Feed] Serving ${validProducts.length} products (${(products ?? []).length} total)`);

  const items = validProducts
    .map(product =>
      buildMetaCatalogXmlItem(product as MetaCatalogProduct)
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
