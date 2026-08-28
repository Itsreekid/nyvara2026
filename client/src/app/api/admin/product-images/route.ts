import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/product-images?product_id=xxx&product_id=yyy
 * Returns gallery images for the given product IDs (used by catalog-ad export).
 */
export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.getAll('product_id');
  if (ids.length === 0) return NextResponse.json([]);

  try {
    const { rows } = await pool.query(
      `SELECT product_id, image_url
       FROM   product_images
       WHERE  product_id = ANY($1::uuid[])
       ORDER  BY sort_order ASC`,
      [ids]
    );
    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
