import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/orders/[id]/items
 *
 * Replaces all order items for a given order in a single transaction.
 * Body: {
 *   deleted_ids: string[],
 *   upsert_items: Array<{
 *     id?: string,
 *     product_id: string,
 *     quantity: number,
 *     quantity_break_price: number | null,
 *     selected_color_name: string | null,
 *     selected_color_hex1: string | null,
 *     selected_color_hex2: string | null,
 *   }>
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = await pool.connect();
  try {
    const { deleted_ids = [], upsert_items = [] } = await request.json();

    await client.query('BEGIN');

    // 1. Delete removed items
    if (deleted_ids.length > 0) {
      await client.query(
        `DELETE FROM order_items WHERE id = ANY($1::uuid[]) AND order_id = $2`,
        [deleted_ids, id]
      );
    }

    // 2. Upsert items
    for (const item of upsert_items) {
      const isTemp = !item.id || String(item.id).startsWith('temp_');
      if (isTemp) {
        await client.query(
          `INSERT INTO order_items
             (order_id, product_id, quantity, quantity_break_price,
              selected_color_name, selected_color_hex1, selected_color_hex2)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            id,
            item.product_id,
            item.quantity,
            item.quantity_break_price ?? null,
            item.selected_color_name  ?? null,
            item.selected_color_hex1  ?? null,
            item.selected_color_hex2  ?? null,
          ]
        );
      } else {
        await client.query(
          `UPDATE order_items
           SET quantity             = $1,
               quantity_break_price = $2,
               selected_color_name  = $3,
               selected_color_hex1  = $4,
               selected_color_hex2  = $5
           WHERE id = $6 AND order_id = $7`,
          [
            item.quantity,
            item.quantity_break_price ?? null,
            item.selected_color_name  ?? null,
            item.selected_color_hex1  ?? null,
            item.selected_color_hex2  ?? null,
            item.id,
            id,
          ]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error(`[Admin/Orders/${id}/Items] PUT error:`, err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
