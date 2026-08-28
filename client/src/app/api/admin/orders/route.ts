import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// ─── Helper: normalize Tunisian phone numbers ─────────────────────────────────
function normalizePhone(p: string | null | undefined): string {
  if (!p) return '';
  const num = p.replace(/[^\d+]/g, '');
  if (num.startsWith('+216')) return num.slice(4);
  if (num.startsWith('00216')) return num.slice(5);
  return num;
}

// ─── GET /api/admin/orders ────────────────────────────────────────────────────
// Query params: archived, page, pageSize, search
export async function GET(request: NextRequest) {
  const sp       = request.nextUrl.searchParams;
  const archived  = sp.get('archived') === 'true';
  const page      = Math.max(0, parseInt(sp.get('page')     ?? '0',  10));
  const pageSize  = Math.max(1, parseInt(sp.get('pageSize') ?? '10', 10));
  const search    = sp.get('search')?.trim() || null;
  const offset    = page * pageSize;

  try {
    const conditions: string[] = [`o.archived = $1`];
    const params: any[]        = [archived];
    let   idx                  = 2;

    if (search) {
      conditions.push(`(o.customer_name ILIKE $${idx} OR o.phone ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.join(' AND ');

    // 1. Total count
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(DISTINCT o.id) AS total
       FROM   orders o
       WHERE  ${where}`,
      params
    );
    const total = parseInt(countRows[0]?.total ?? '0', 10);

    // 2. Paginated orders with items + products
    const { rows } = await pool.query(
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
                 'id',             p.id,
                 'title',          p.title,
                 'price',          p.price,
                 'discount',       p.discount,
                 'image_url',      p.image_url,
                 'color_options',  p.color_options,
                 'quantity_breaks',p.quantity_breaks
               )
             )
           ) FILTER (WHERE oi.id IS NOT NULL),
           '[]'
         ) AS order_items
       FROM   orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products     p  ON p.id = oi.product_id
       WHERE  ${where}
       GROUP  BY o.id
       ORDER  BY o.created_at DESC
       LIMIT  $${idx} OFFSET $${idx + 1}`,
      [...params, pageSize, offset]
    );

    // 3. Enrich with customer history (order count / delivered / returned)
    if (rows.length > 0) {
      const phoneSet = new Set<string>();
      rows.forEach((o: any) => {
        const norm = normalizePhone(o.phone);
        if (norm) {
          phoneSet.add(norm);
          phoneSet.add(`+216${norm}`);
          phoneSet.add(`00216${norm}`);
        }
      });
      const phones = Array.from(phoneSet);

      if (phones.length > 0) {
        const { rows: allPhoneOrders } = await pool.query(
          `SELECT phone, call_status
           FROM   orders
           WHERE  phone = ANY($1) AND archived = false`,
          [phones]
        );

        const phoneData: Record<string, { count: number; hasDelivered: boolean; hasReturned: boolean }> = {};
        for (const row of allPhoneOrders) {
          const norm = normalizePhone(row.phone);
          if (!norm) continue;
          if (!phoneData[norm]) phoneData[norm] = { count: 0, hasDelivered: false, hasReturned: false };
          phoneData[norm].count += 1;
          if (row.call_status === 'delivered') phoneData[norm].hasDelivered = true;
          if (row.call_status === 'returned')  phoneData[norm].hasReturned  = true;
        }

        for (const order of rows) {
          const norm = normalizePhone(order.phone);
          order.customer_order_count    = norm ? (phoneData[norm]?.count   ?? 1)     : 1;
          order.customer_has_delivered  = norm ? (phoneData[norm]?.hasDelivered ?? false) : false;
          order.customer_has_returned   = norm ? (phoneData[norm]?.hasReturned  ?? false) : false;
        }
      }
    }

    return NextResponse.json({ data: rows, count: total });
  } catch (err: any) {
    console.error('[Admin/Orders] GET error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST /api/admin/orders — create a new order (from the admin drawer) ─────
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      customer_name, customer_email, phone, city, address,
      postal_code, country, call_status, cosmos_status,
      private_note, total_price, items,
    } = body;

    await client.query('BEGIN');

    const { rows: [order] } = await client.query(
      `INSERT INTO orders
         (customer_name, customer_email, phone, city, address, postal_code,
          country, call_status, cosmos_status, private_note, total_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        customer_name, customer_email ?? null, phone, city, address ?? null,
        postal_code ?? null, country ?? 'TN',
        call_status ?? 'pending', cosmos_status ?? 'pending',
        private_note ?? null, total_price ?? 0,
      ]
    );

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items
             (order_id, product_id, quantity, quantity_break_price,
              selected_color_name, selected_color_hex1, selected_color_hex2)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            order.id,
            item.product_id,
            item.quantity,
            item.quantity_break_price ?? null,
            item.selected_color_name  ?? null,
            item.selected_color_hex1  ?? null,
            item.selected_color_hex2  ?? null,
          ]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ data: order }, { status: 201 });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[Admin/Orders] POST error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}

// ─── PATCH /api/admin/orders — bulk archive / unarchive ──────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const { ids, archived } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 });
    }
    await pool.query(
      `UPDATE orders SET archived = $1 WHERE id = ANY($2::uuid[])`,
      [!!archived, ids]
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Admin/Orders] PATCH bulk error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
