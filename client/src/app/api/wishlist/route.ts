import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const deviceId = request.nextUrl.searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    }

    const { rows } = await pool.query(
      `SELECT product_id FROM wishlist_items WHERE device_id = $1`,
      [deviceId]
    );

    return NextResponse.json({
      device_id:   deviceId,
      product_ids: rows.map((r: any) => r.product_id),
      count:       rows.length,
    });
  } catch (error: any) {
    console.error('Wishlist GET error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wishlist' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { device_id, product_id, action } = body;

    if (!device_id || !product_id) {
      return NextResponse.json(
        { error: 'Device ID and Product ID required' },
        { status: 400 }
      );
    }

    if (action === 'add') {
      await pool.query(
        `INSERT INTO wishlist_items (device_id, product_id, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (device_id, product_id) DO NOTHING`,
        [device_id, product_id]
      );
      return NextResponse.json({ success: true, action: 'added' });
    }

    if (action === 'remove') {
      await pool.query(
        `DELETE FROM wishlist_items WHERE device_id = $1 AND product_id = $2`,
        [device_id, product_id]
      );
      return NextResponse.json({ success: true, action: 'removed' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Wishlist POST error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to update wishlist' },
      { status: 500 }
    );
  }
}
