import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { rows: [product] } = await pool.query(
      'SELECT category_id FROM products WHERE id = $1', [id]
    );
    if (!product) return NextResponse.json([]);

    const { rows } = await pool.query(
      `SELECT p.*, json_build_object('id', c.id, 'name', c.name) AS categories
       FROM   products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE  p.category_id = $1 AND p.id != $2
       ORDER BY p.created_at DESC
       LIMIT 4`,
      [product.category_id, id]
    );
    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
