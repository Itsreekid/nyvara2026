import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { rows } = await pool.query(
      `SELECT p.*,
              json_build_object('id', c.id, 'name', c.name) AS categories,
              COALESCE(
                json_agg(
                  json_build_object('id', pi.id, 'image_url', pi.image_url, 'sort_order', pi.sort_order)
                  ORDER BY pi.sort_order
                ) FILTER (WHERE pi.id IS NOT NULL),
                '[]'::json
              ) AS gallery
       FROM   products p
       LEFT JOIN categories  c  ON c.id  = p.category_id
       LEFT JOIN product_images pi ON pi.product_id = p.id
       WHERE  p.id = $1
       GROUP BY p.id, c.id`,
      [id]
    );

    if (!rows[0]) return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
