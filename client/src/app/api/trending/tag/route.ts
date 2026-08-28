import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * POST /api/trending/tag
 * Body: { product_ids: string[] }  — ordered by score desc (top N first)
 *
 * 1. Takes top N items based on the optional `limit` param
 * 2. Backfills any missing slots with the newest in-stock products
 * 3. Clears custom_label_0 on all products that currently have it set.
 * 4. Sets custom_label_0 = 'trending' on the final target IDs.
 */
export async function POST(req: NextRequest) {
  let body: { product_ids?: string[], limit?: number };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { product_ids, limit } = body;
  const TRENDING_LIMIT = Number(limit) || 20;

  if (!Array.isArray(product_ids)) {
    return NextResponse.json({ error: 'product_ids array is required' }, { status: 400 });
  }

  let topIds = product_ids.slice(0, TRENDING_LIMIT);

  // Smart Fallback Rule: Backfill if we are under the TRENDING_LIMIT
  if (topIds.length < TRENDING_LIMIT) {
    try {
      const { rows: newestProducts } = await pool.query(
        `SELECT id FROM products WHERE stock > 0 ORDER BY created_at DESC LIMIT $1`,
        [TRENDING_LIMIT]
      );
      for (const p of newestProducts) {
        if (!topIds.includes(p.id)) topIds.push(p.id);
        if (topIds.length >= TRENDING_LIMIT) break;
      }
    } catch (e) {
      console.error('[Trending Tag] Backfill error:', e);
    }
  }

  if (topIds.length === 0) {
    return NextResponse.json({ error: 'No valid products found to tag' }, { status: 400 });
  }

  try {
    // Step 1: Clear the tag on all products that currently have it
    await pool.query(`UPDATE products SET custom_label_0 = NULL WHERE custom_label_0 IS NOT NULL`);

    // Step 2: Set 'trending' on the top N products
    await pool.query(
      `UPDATE products SET custom_label_0 = 'trending' WHERE id = ANY($1::uuid[])`,
      [topIds]
    );

    return NextResponse.json({ ok: true, tagged: topIds.length, tagged_ids: topIds, limit: TRENDING_LIMIT });
  } catch (err: any) {
    console.error('[Trending Tag] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
