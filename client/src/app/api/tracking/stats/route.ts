import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * POST /api/tracking/stats
 * Body: { product_id: string, event: 'view' | 'cart' | 'order' }
 *
 * Calls the PL/pgSQL function `increment_product_stat` which handles
 * the UPSERT + increment atomically.
 * Designed to be called with navigator.sendBeacon so it returns quickly.
 */
export async function POST(req: NextRequest) {
  let body: { product_id?: string; event?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { product_id, event } = body;

  if (!product_id || typeof product_id !== 'string') {
    return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
  }

  const VALID_EVENTS = ['view', 'cart', 'order'] as const;
  if (!event || !VALID_EVENTS.includes(event as typeof VALID_EVENTS[number])) {
    return NextResponse.json(
      { error: `event must be one of: ${VALID_EVENTS.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    await pool.query(
      `SELECT increment_product_stat($1, $2)`,
      [product_id, event]
    );
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error('[Tracking Stats] pg error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
