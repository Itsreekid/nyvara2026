import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabase-admin';

const COSMOS_BASE = 'https://api.cosmos.tn/api/v1';
const COSMOS_TOKEN = process.env.COSMOS_API_TOKEN!;

// Terminal call_status values in the database — stop syncing once reached
const TERMINAL_CALL_STATUSES = new Set(['delivered', 'returned']);

/**
 * Resolves the new call_status value for an order given:
 * - rawCosmosStatus  : the latest status string returned by the Cosmos API
 * - currentCallStatus: the existing call_status value stored in our DB
 */
function resolveCallStatus(rawCosmosStatus: string, currentCallStatus: string | null): string {
  const cosmos = rawCosmosStatus?.toLowerCase().trim();
  const current = currentCallStatus || 'pending';

  // 1. Determine terminal outcome from Cosmos
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

  // 2. Manual Call Center States check
  const isManualCallCenterState =
    current === 'pending' ||
    current === 'attempt_1' ||
    current === 'attempt_2' ||
    current === 'rejected';

  if (isManualCallCenterState) {
    return terminalOutcome ? terminalOutcome : current;
  }

  // 3. Confirmed or packed states (automated tracking flow)
  if (current === 'confirmed' || current === 'packed') {
    if (terminalOutcome) {
      return terminalOutcome;
    }

    // Progressive traveling status maps cleanly to 'packed' (Emballé)
    if (
      cosmos === 'in-depot' ||
      cosmos === 'in-delivery' ||
      cosmos === 'to-be-verified' ||
      cosmos === 'in-transfer'
    ) {
      return 'packed';
    }

    return current;
  }

  return terminalOutcome ? terminalOutcome : current;
}

export async function POST(req: NextRequest) {
  try {
    // ── Step A: Fetch records + select last_synced_at ─────────────────────────
    const { data: ordersWithBarcodes, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('id, cosmos_barcode, call_status, cosmos_status, last_synced_at')
      .not('cosmos_barcode', 'is', null);

    if (fetchErr) throw fetchErr;

    if (!ordersWithBarcodes || ordersWithBarcodes.length === 0) {
      return NextResponse.json({ ok: true, message: 'No shipments found.', updatedCount: 0 });
    }

    // ── Step B: Filter Terminal States AND Apply 12-Hour Cooldown Guard ───────
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const ordersToSync = ordersWithBarcodes.filter(o => {
      const barcode = o.cosmos_barcode?.trim();
      if (!barcode) return false;

      // 1. Skip terminal states
      if (TERMINAL_CALL_STATUSES.has(o.call_status ?? '')) return false;

      // 2. If it has been synced in the last 12 hours, SKIP it to save credits
      if (o.last_synced_at) {
        const lastSyncTime = new Date(o.last_synced_at);
        if (lastSyncTime > twelveHoursAgo) return false;
      }

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
      const barcode = o.cosmos_barcode as string;
      barcodes.push(barcode);
      barcodeToOrder[barcode] = { id: o.id, call_status: o.call_status ?? null };
    }

    // ── Step C: Single consolidated Cosmos API round-trip ─────────────────────
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

    // ── Step D: Triple-column atomic write — sync timestamps + statuses ───────
    const rows: any[] = cosmosData.data || [];
    const currentISOTime = new Date().toISOString();

    const updates = rows
      .map((d: any) => {
        const entry = barcodeToOrder[d.id];
        if (!entry) return null;

        const rawCosmosStatus = d.status;
        const newCallStatus = resolveCallStatus(rawCosmosStatus, entry.call_status);

        return supabaseAdmin
          .from('orders')
          .update({
            cosmos_status: rawCosmosStatus,
            call_status: newCallStatus,
            last_synced_at: currentISOTime, // Reset cooldown clock
          })
          .eq('id', entry.id);
      })
      .filter(Boolean);

    await Promise.all(updates);

    return NextResponse.json({ ok: true, updatedCount: updates.length });
  } catch (err: any) {
    console.error('[Cosmos Sync] Unexpected error:', err);
    return NextResponse.json(
      { ok: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}