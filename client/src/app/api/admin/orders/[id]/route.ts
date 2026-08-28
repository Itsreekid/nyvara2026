import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// ─── GET /api/admin/orders/[id] ───────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { rows: [order] } = await pool.query(
      `SELECT
         o.*,
         COALESCE(
           json_agg(
             json_build_object(
               'id',                  oi.id,
               'product_id',          oi.product_id,
               'quantity',            oi.quantity,
               'quantity_break_price',oi.quantity_break_price,
               'selected_color_name', oi.selected_color_name,
               'selected_color_hex1', oi.selected_color_hex1,
               'selected_color_hex2', oi.selected_color_hex2,
               'products', json_build_object(
                 'id',            p.id,
                 'title',         p.title,
                 'price',         p.price,
                 'discount',      p.discount,
                 'image_url',     p.image_url,
                 'color_options', p.color_options,
                 'quantity_breaks',p.quantity_breaks
               )
             )
           ) FILTER (WHERE oi.id IS NOT NULL),
           '[]'
         ) AS order_items
       FROM   orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products     p  ON p.id = oi.product_id
       WHERE  o.id = $1
       GROUP  BY o.id`,
      [id]
    );

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json({ data: order });
  } catch (err: any) {
    console.error(`[Admin/Orders/${id}] GET error:`, err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH /api/admin/orders/[id] — update any order fields ──────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();

    const ALLOWED = [
      'customer_name', 'customer_email', 'phone', 'city', 'address',
      'postal_code', 'country', 'call_status', 'archived', 'private_note',
      'total_price', 'cosmos_barcode', 'cosmos_label_url',
      'cosmos_label_pdf_url', 'cosmos_status',
    ];

    const setClauses: string[] = [];
    const values: any[]        = [];
    let   idx                  = 1;

    for (const key of ALLOWED) {
      if (key in body) {
        setClauses.push(`${key} = $${idx++}`);
        values.push(body[key]);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    values.push(id);
    await pool.query(
      `UPDATE orders SET ${setClauses.join(', ')} WHERE id = $${idx}`,
      values
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(`[Admin/Orders/${id}] PATCH error:`, err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
