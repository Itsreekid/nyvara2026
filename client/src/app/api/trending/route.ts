import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabase-admin';

/**
 * GET /api/trending
 *
 * Queries `product_daily_stats` for the last 7 days, joins to `products`
 * (only in-stock: stock > 0), and returns products ranked by:
 *   Trending Score = (orders_count × 5) + (carts_count × 2) + (views_count × 0.5)
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const since = sevenDaysAgo.toISOString().slice(0, 10); // 'YYYY-MM-DD'

  // Aggregate the 7-day window per product
  const { data: stats, error: statsError } = await supabaseAdmin
    .from('product_daily_stats')
    .select('product_id, views_count, carts_count, orders_count')
    .gte('date', since);

  if (statsError) {
    console.error('[Trending] Stats query error:', statsError.message);
    return NextResponse.json({ error: statsError.message }, { status: 500 });
  }

  if (!stats || stats.length === 0) {
    return NextResponse.json([]);
  }

  // Aggregate totals per product_id
  const aggregated: Record<string, { views: number; carts: number; orders: number }> = {};
  for (const row of stats) {
    const pid = row.product_id as string;
    if (!aggregated[pid]) aggregated[pid] = { views: 0, carts: 0, orders: 0 };
    aggregated[pid].views  += (row.views_count  as number) ?? 0;
    aggregated[pid].carts  += (row.carts_count  as number) ?? 0;
    aggregated[pid].orders += (row.orders_count as number) ?? 0;
  }

  const productIds = Object.keys(aggregated);

  // Fetch matching in-stock products
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id, title, image_url, stock, custom_label_0')
    .in('id', productIds)
    .gt('stock', 0);

  if (productsError) {
    console.error('[Trending] Products query error:', productsError.message);
    return NextResponse.json({ error: productsError.message }, { status: 500 });
  }

  // Build ranked list
  const ranked = (products ?? [])
    .map((p) => {
      const agg = aggregated[p.id as string] ?? { views: 0, carts: 0, orders: 0 };
      const trending_score =
        agg.orders * 5 + agg.carts * 2 + agg.views * 0.5;
      return {
        product_id:     p.id as string,
        title:          p.title as string | null,
        image_url:      p.image_url as string | null,
        stock:          p.stock as number | null,
        custom_label_0: p.custom_label_0 as string | null,
        views_7d:       agg.views,
        carts_7d:       agg.carts,
        orders_7d:      agg.orders,
        trending_score,
      };
    })
    .sort((a, b) => b.trending_score - a.trending_score);

  return NextResponse.json(ranked);
}
