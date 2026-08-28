import { NextResponse } from 'next/server';
import pool from '@/lib/db';

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

  try {
    const { rows: stats } = await pool.query(
      `SELECT product_id, views_count, carts_count, orders_count
       FROM   product_daily_stats
       WHERE  date >= $1`,
      [since]
    );

    if (!stats || stats.length === 0) {
      return NextResponse.json([]);
    }

    // Aggregate totals per product_id
    const aggregated: Record<string, { views: number; carts: number; orders: number }> = {};
    for (const row of stats) {
      const pid = row.product_id as string;
      if (!aggregated[pid]) aggregated[pid] = { views: 0, carts: 0, orders: 0 };
      aggregated[pid].views  += Number(row.views_count)  || 0;
      aggregated[pid].carts  += Number(row.carts_count)  || 0;
      aggregated[pid].orders += Number(row.orders_count) || 0;
    }

    const productIds = Object.keys(aggregated);
    if (productIds.length === 0) return NextResponse.json([]);

    const { rows: products } = await pool.query(
      `SELECT id, title, image_url, stock, custom_label_0
       FROM   products
       WHERE  id = ANY($1::uuid[]) AND stock > 0`,
      [productIds]
    );

    const ranked = products
      .map((prod: any) => {
        const agg = aggregated[prod.id] ?? { views: 0, carts: 0, orders: 0 };
        return {
          product_id:     prod.id,
          title:          prod.title,
          image_url:      prod.image_url,
          stock:          prod.stock,
          custom_label_0: prod.custom_label_0,
          views_7d:       agg.views,
          carts_7d:       agg.carts,
          orders_7d:      agg.orders,
          trending_score: agg.orders * 5 + agg.carts * 2 + agg.views * 0.5,
        };
      })
      .sort((a: any, b: any) => b.trending_score - a.trending_score);

    return NextResponse.json(ranked);
  } catch (err: any) {
    console.error('[Trending] query error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
