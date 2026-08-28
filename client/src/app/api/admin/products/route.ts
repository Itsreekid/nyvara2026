import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/products
 * Returns a lightweight product list for the admin order drawer's product picker.
 */
export async function GET() {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, price, discount, image_url, color_options
       FROM   products
       ORDER  BY title ASC`
    );
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('[Admin/Products] GET error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
