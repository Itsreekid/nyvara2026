import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabase-admin';

/**
 * POST /api/tracking/stats
 * Body: { product_id: string, event: 'view' | 'cart' | 'order' }
 *
 * Delegates to the PL/pgSQL function `increment_product_stat` which handles
 * the UPSERT + increment atomically — avoids race conditions on concurrent hits.
 *
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

  const { error } = await supabaseAdmin.rpc('increment_product_stat', {
    p_id: product_id,
    event_type: event,
  });

  if (error) {
    console.error('[Tracking Stats] RPC error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
