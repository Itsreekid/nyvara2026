'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Order } from '@/types';

interface UseOrderNotificationOptions {
  onNewOrder: (order: Order) => void;
}

/** Plays a Shopify-like "cha-ching" sound using the Web Audio API */
function playChaChingSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    const playTone = (freq: number, startTime: number, duration: number, gainPeak: number) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + duration * 0.3);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // "Cha" — lower note
    playTone(880,  now,        0.15, 0.4);
    playTone(1100, now,        0.15, 0.2);
    // brief pause
    // "Ching" — higher, brighter bell
    playTone(1760, now + 0.18, 0.6,  0.5);
    playTone(2200, now + 0.18, 0.6,  0.25);
    playTone(2640, now + 0.22, 0.5,  0.15);

    // Auto close context after sound
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // Silently fail if Web Audio API not available
  }
}

export function useOrderNotification({ onNewOrder }: UseOrderNotificationOptions) {
  // Track order IDs we've already seen so we don't fire on mount
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const handleNewOrder = useCallback((order: Order) => {
    if (seenIds.current.has(order.id)) return;
    seenIds.current.add(order.id);

    // Only fire after initial load
    if (!initialized.current) return;

    playChaChingSound();
    onNewOrder(order);
  }, [onNewOrder]);

  useEffect(() => {
    // 1. Load recent order IDs to mark them as "seen" (no notification for old orders).
    //    Limit to 1000 — we only need to know about recent orders, not every ID ever.
    supabase
      .from('orders')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1000)
      .then(({ data }) => {
        if (data) data.forEach((o: { id: string }) => seenIds.current.add(o.id));
        initialized.current = true;
      });

    // 2. Subscribe to Realtime INSERT events on orders table
    const channel = supabase
      .channel('admin-new-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          handleNewOrder(payload.new as Order);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleNewOrder]);
}
