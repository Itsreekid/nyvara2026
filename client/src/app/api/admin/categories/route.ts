import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/categories
export async function GET() {
  try {
    const { rows } = await pool.query(`SELECT * FROM categories ORDER BY name ASC`);
    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/categories
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    const { rows: [cat] } = await pool.query(
      `INSERT INTO categories (name) VALUES ($1) RETURNING *`,
      [name.trim()]
    );
    return NextResponse.json(cat, { status: 201 });
  } catch (err: any) {
    if (err.code === '23505') return NextResponse.json({ error: 'Ce nom existe déjà.' }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
