import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const COSMOS_BASE  = 'https://api.cosmos.tn/api/v1';
const COSMOS_TOKEN = process.env.COSMOS_API_TOKEN!;

// Terminal call_status values — stop syncing once reached
const TERMINAL_CALL_STATUSES = new Set(['delivered', 'returned']);

/**
 * Resolves the new call_status value for an order given:
 * - rawCosmosStatus  : the latest status string returned by the Cosmos API
 * - currentCallStatus: the existing call_status value stored in our DB
 */
function resolveCallStatus(rawCosmosStatus: string, currentCallStatus: string | null): string {
  const cosmos  = rawCosmosStatus?.toLowerCase().trim();
  const current = currentCallStatus || 'pending';

  let terminalOutcome: 'delivered' | 'returned' | null = null;
  if (cosmos === 'delivered') {
    terminalOutcome = 'delivered';
  } else if (
    cosmos === 'return-stock' ||
    cosmos === 'received-return' ||
    cosmos === 'return-in-transfer'
  ) {
    terminalOutcome = 'returned';
  }

  const isManualCallCenterState =
    current === 'pending'    ||
    current === 'attempt_1'  ||
    current === 'attempt_2'  ||
    current === 'rejected';

  if (isManualCallCenterState) {
    return terminalOutcome ? terminalOutcome : current;
  }

  if (current === 'confirmed' || current === 'packed') {
    if (terminalOutcome) return terminalOutcome;
    if (
      cosmos === 'in-depot'       ||
      cosmos === 'in-delivery'    ||
      cosmos === 'to-be-verified' ||
      cosmos === 'in-transfer'
    ) {
      return 'packed';
    }
    return current;
  }

  return terminalOutcome ? terminalOutcome : current;
}

export async function POST(_req: NextRequest) {
  try {
    // ── Step A: Fetch orders that have a cosmos barcode ───────────────────────
    const { rows: rawOrders } = await pool.query(
      `SELECT id, cosmos_barcode, call_status, cosmos_status, last_synced_at
       FROM   orders
       WHERE  cosmos_barcode IS NOT NULL`
    );

    if (!rawOrders || rawOrders.length === 0) {
      return NextResponse.json({ ok: true, message: 'No shipments found.', updatedCount: 0 });
    }

    // ── Step B: Filter terminal states & 12-hour cooldown guard ───────────────
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const ordersToSync = rawOrders.filter((o: any) => {
      const barcode = o.cosmos_barcode?.trim();
      if (!barcode) return false;
      if (TERMINAL_CALL_STATUSES.has(o.call_status ?? '')) return false;
      if (o.last_synced_at && new Date(o.last_synced_at) > twelveHoursAgo) return false;
      return true;
    });

    if (ordersToSync.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'All shipments are terminal or recently cached within the 12-hour safety window.',
        updatedCount: 0,
      });
    }

    // Build barcode lookup map
    const barcodeToOrder: Record<string, { id: string; call_status: string | null }> = {};
    const barcodes: string[] = [];
    for (const o of ordersToSync) {
      barcodes.push(o.cosmos_barcode as string);
      barcodeToOrder[o.cosmos_barcode as string] = { id: o.id, call_status: o.call_status ?? null };
    }

    // ── Step C: Single Cosmos API round-trip ──────────────────────────────────
    const cosmosRes = await fetch(`${COSMOS_BASE}/orders?barcode=${barcodes.join(',')}`, {
      headers: {
        'Authorization': `Bearer ${COSMOS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const cosmosData = await cosmosRes.json();
    if (!cosmosRes.ok) {
      console.error('[Cosmos Sync] API error:', cosmosData);
      return NextResponse.json({ ok: false, error: cosmosData }, { status: cosmosRes.status });
    }

    // ── Step D: Batch update orders ───────────────────────────────────────────
    const rows: any[] = cosmosData.data || [];
    const currentISOTime = new Date().toISOString();

    const updatePromises = rows
      .map(async (d: any) => {
        const entry = barcodeToOrder[d.id];
        if (!entry) return null;

        const newCallStatus = resolveCallStatus(d.status, entry.call_status);

        await pool.query(
          `UPDATE orders
           SET cosmos_status  = $1,
               call_status    = $2,
               last_synced_at = $3
           WHERE id = $4`,
          [d.status, newCallStatus, currentISOTime, entry.id]
        );
        return entry.id;
      })
      .filter(Boolean);

    await Promise.all(updatePromises);

    return NextResponse.json({ ok: true, updatedCount: updatePromises.length });
  } catch (err: any) {
    console.error('[Cosmos Sync] Unexpected error:', err);
    return NextResponse.json(
      { ok: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}