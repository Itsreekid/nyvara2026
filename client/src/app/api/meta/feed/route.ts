import { NextResponse } from 'next/server';
import { buildMetaCatalogXmlItem } from '@/lib/meta-catalog';
import type { MetaCatalogProduct } from '@/lib/meta-catalog';
import pool from '@/lib/db';

const SITE_URL = 'https://nyvara.net';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { rows } = await pool.query(
      `SELECT p.*,
              json_build_object('id', c.id, 'name', c.name) AS categories
       FROM   products p
       LEFT JOIN categories c ON c.id = p.category_id
       ORDER BY p.created_at DESC`
    );

    const products: MetaCatalogProduct[] = rows;

    // Filter products that have a valid image and price
    const validProducts = products.filter(product => {
      const hasImage = !!product.image_url;
      const price    = (product as any).price ?? (product as any).final_price ?? 0;
      return hasImage && price > 0;
    });

    console.log(`[Meta Feed] Serving ${validProducts.length} products (${products.length} total)`);

    const items = validProducts
      .map(product => buildMetaCatalogXmlItem(product))
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
  } catch (err) {
    console.error('[Meta Feed] Unexpected error:', err);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
