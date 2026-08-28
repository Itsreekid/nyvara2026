import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/orders/history?phone=...&excludeId=...
 * Returns previous orders for a customer phone (for the history tab in the drawer).
 */
export async function GET(request: NextRequest) {
  const phone     = request.nextUrl.searchParams.get('phone');
  const excludeId = request.nextUrl.searchParams.get('excludeId');

  if (!phone) {
    return NextResponse.json({ error: 'phone is required' }, { status: 400 });
  }

  try {
    const params: any[] = [phone];
    let paramIdx = 2;

    let excludeClause = '';
    if (excludeId) {
      excludeClause = `AND o.id != $${paramIdx++}`;
      params.push(excludeId);
    }

    const { rows } = await pool.query(
      `SELECT
         o.id,
         o.created_at,
         o.total_price,
         o.call_status,
         COALESCE(
           json_agg(
             json_build_object(
               'quantity',            oi.quantity,
               'quantity_break_price',oi.quantity_break_price,
               'selected_color_name', oi.selected_color_name,
               'products', json_build_object(
                 'id',        p.id,
                 'title',     p.title,
                 'price',     p.price,
                 'discount',  p.discount,
                 'image_url', p.image_url
               )
             )
           ) FILTER (WHERE oi.id IS NOT NULL),
           '[]'
         ) AS order_items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products     p  ON p.id = oi.product_id
       WHERE o.phone = $1
         ${excludeClause}
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      params
    );

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('[Admin/Orders/History] GET error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
