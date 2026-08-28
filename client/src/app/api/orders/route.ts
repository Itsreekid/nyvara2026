import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/orders
 *
 * Customer-facing checkout order creation.
 * Validates prices server-side (discounts + quantity breaks) — never trusts the client.
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      customer_name, customer_email, phone,
      city, postal_code, country, address, items,
    } = body;

    if (!customer_name || !phone || !city || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'customer_name, phone, city and items are required.' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // 1. Fetch authoritative product data (price, discount, quantity_breaks, stock)
    const productIds = [...new Set<string>(items.map((i: any) => i.product_id))];
    const { rows: products } = await client.query(
      `SELECT id, price, discount, quantity_breaks, stock, allow_unlimited_stock
       FROM   products
       WHERE  id = ANY($1::uuid[])`,
      [productIds]
    );

    type ProductRow = {
      id: string; price: number | null; discount: number | null;
      quantity_breaks: any[] | null; stock: number | null; allow_unlimited_stock: boolean | null;
    };
    const productMap = Object.fromEntries((products as ProductRow[]).map(p => [p.id, p]));

    // Calculate total quantity per product (for quantity-break logic)
    const productTotals: Record<string, number> = {};
    for (const item of items) {
      productTotals[item.product_id] = (productTotals[item.product_id] || 0) + item.quantity;
    }

    // Compute server-side unit price per line item
    const itemPrices = items.map((item: any) => {
      const p = productMap[item.product_id];
      if (!p) return { product_id: item.product_id, price: 0 };

      const totalQty = productTotals[item.product_id];
      const breaks   = (p.quantity_breaks || []) as Array<{ min_qty: number; total_price: number }>;
      const applicableBreak = [...breaks]
        .sort((a, b) => b.min_qty - a.min_qty)
        .find(qb => totalQty >= qb.min_qty);

      if (applicableBreak) {
        return { product_id: item.product_id, price: applicableBreak.total_price / totalQty };
      }
      const hasDiscount = p.discount != null && p.discount > 0;
      const finalPrice  = hasDiscount
        ? Math.round((p.price ?? 0) * (1 - (p.discount || 0) / 100))
        : (p.price ?? 0);
      return { product_id: item.product_id, price: finalPrice };
    });

    const total_price = items.reduce(
      (sum: number, item: any, idx: number) => sum + itemPrices[idx].price * item.quantity,
      0
    );

    // 2. Insert order
    const { rows: [order] } = await client.query(
      `INSERT INTO orders
         (customer_name, customer_email, phone, city, postal_code, country, address, total_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        customer_name, customer_email ?? null, phone,
        city, postal_code ?? null, country ?? 'TN',
        address ?? null, total_price,
      ]
    );

    // 3. Insert order items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await client.query(
        `INSERT INTO order_items
           (order_id, product_id, quantity, quantity_break_price,
            selected_color_name, selected_color_hex1, selected_color_hex2)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          order.id,
          item.product_id,
          item.quantity,
          itemPrices[i].price,
          item.selected_color?.name  ?? null,
          item.selected_color?.hex1  ?? null,
          item.selected_color?.hex2  ?? null,
        ]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ order, total_price }, { status: 201 });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[Orders] POST error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
