import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeProductImageUrl } from '@/lib/r2';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SITE_URL = 'https://nyvara.net';
const GOOGLE_CATEGORY = 'Apparel &amp; Accessories &gt; Clothing Accessories &gt; Sunglasses';

type MetaCategory = { name: string | null } | { name: string | null }[] | null;

type MetaProductRow = {
  id: string;
  title: string | null;
  description: string | null;
  price: number | null;
  final_price: number | null;
  stock: number | null;
  image_url: string | null;
  gender: string | null;
  badge: string | null;
  categories: MetaCategory;
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatPrice(p: number): string {
  return `${p.toFixed(3)} TND`;
}

function mapGender(g: string | null): string {
  if (g === 'homme') return 'male';
  if (g === 'femme') return 'female';
  return 'unisex';
}

function productToItem(p: MetaProductRow): string {
  const id = p.id;
  const title = esc(p.title ?? 'Nyvara Sunglasses');
  const description = esc(p.description ?? 'Lunettes de soleil de luxe — Nyvara Tunisia');
  const price = formatPrice(p.final_price ?? p.price ?? 0);
  const link = `${SITE_URL}/shop/${p.id}`;
  const imageLink = normalizeProductImageUrl(p.image_url);
  const availability = (p.stock ?? 0) > 0 ? 'in stock' : 'out of stock';
  const gender = mapGender(p.gender);

  let categoryName = 'sunglasses';
  if (p.categories) {
    if (Array.isArray(p.categories)) {
      categoryName = p.categories[0]?.name ?? 'sunglasses';
    } else {
      categoryName = p.categories.name ?? 'sunglasses';
    }
  }

  const productType = esc(categoryName);
  const brand = 'Nyvara';

  return `    <item>
      <g:id>${id}</g:id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${link}</g:link>
      <g:image_link>${imageLink}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${price}</g:price>
      <g:brand>${brand}</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>${GOOGLE_CATEGORY}</g:google_product_category>
      <g:product_type>${productType}</g:product_type>
      <g:gender>${gender}</g:gender>${p.badge ? `\n      <g:custom_label_0>${esc(p.badge)}</g:custom_label_0>` : ''}
    </item>`;
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, title, description, price, final_price, stock, image_url, gender, badge, categories(name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Meta Feed] Supabase error:', error.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }

  const items = (products ?? []).map(productToItem).join('\n');

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
