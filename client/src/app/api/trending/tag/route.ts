import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabase-admin';

/**
 * POST /api/trending/tag
 * Body: { product_ids: string[] }  — ordered by score desc (top N first)
 *
 * 1. Takes top N items based on process.env.TRENDING_LIMIT
 * 2. Backfills any missing slots with the newest in-stock products
 * 3. Clears custom_label_0 on all products that currently have it set.
 * 4. Sets custom_label_0 = 'trending' on the final target IDs.
 *
 * Uses the service-role key via supabaseAdmin to bypass RLS.
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
    const { data: newestProducts, error: newestError } = await supabaseAdmin
      .from('products')
      .select('id')
      .gt('stock', 0)
      .order('created_at', { ascending: false })
      .limit(TRENDING_LIMIT);

    if (!newestError && newestProducts) {
      for (const p of newestProducts) {
        const prod = p as any;
        if (!topIds.includes(prod.id)) {
          topIds.push(prod.id);
        }
        if (topIds.length >= TRENDING_LIMIT) break;
      }
    }
  }

  if (topIds.length === 0) {
    return NextResponse.json({ error: 'No valid products found to tag' }, { status: 400 });
  }

  // Step 1: Clear the tag on all products that have it
  const { error: clearError } = await supabaseAdmin
    .from('products')
    // @ts-ignore
    .update({ custom_label_0: null as any })
    .not('custom_label_0', 'is', null);

  if (clearError) {
    console.error('[Trending Tag] Clear error:', clearError.message);
    return NextResponse.json(
      { error: `Failed to clear existing tags: ${clearError.message}` },
      { status: 500 }
    );
  }

  // Step 2: Set 'trending' on the top N products
  const { error: tagError } = await supabaseAdmin
    .from('products')
    // @ts-ignore
    .update({ custom_label_0: 'trending' as any })
    .in('id', topIds);

  if (tagError) {
    console.error('[Trending Tag] Tag error:', tagError.message);
    return NextResponse.json(
      { error: `Failed to apply trending tag: ${tagError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, tagged: topIds.length, tagged_ids: topIds, limit: TRENDING_LIMIT });
}
