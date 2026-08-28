import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    
    const category_id = searchParams.get('category_id');
    const gender      = searchParams.get('gender');
    const min_price   = searchParams.get('min_price');
    const max_price   = searchParams.get('max_price');
    const search      = searchParams.get('search');
    const sort        = searchParams.get('sort');

    const conditions: string[] = [];
    const params: any[]        = [];
    let   idx                  = 1;

    if (category_id) { conditions.push(`p.category_id = $${idx++}`); params.push(category_id); }
    if (gender && gender !== 'all') { conditions.push(`p.gender = $${idx++}`); params.push(gender); }
    if (min_price)   { conditions.push(`p.price >= $${idx++}`); params.push(Number(min_price)); }
    if (max_price)   { conditions.push(`p.price <= $${idx++}`); params.push(Number(max_price)); }
    if (search)      { conditions.push(`p.title ILIKE $${idx++}`); params.push(`%${search}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'p.created_at DESC';
    if (sort === 'price_asc')  orderBy = 'p.price ASC';
    if (sort === 'price_desc') orderBy = 'p.price DESC';
    if (sort === 'name_asc')   orderBy = 'p.title ASC';

    const sql = `
      SELECT p.*,
             json_build_object('id', c.id, 'name', c.name) AS categories
      FROM   products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${where}
      ORDER BY ${orderBy}
    `;

    const { rows } = await pool.query(sql, params);
    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
