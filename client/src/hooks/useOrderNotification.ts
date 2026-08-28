'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { Order } from '@/types';

const POLL_INTERVAL_MS = 30_000; // 30 seconds

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
    // "Ching" — higher, brighter bell
    playTone(1760, now + 0.18, 0.6,  0.5);
    playTone(2200, now + 0.18, 0.6,  0.25);
    playTone(2640, now + 0.22, 0.5,  0.15);

    setTimeout(() => ctx.close(), 1500);
  } catch {
    // Silently fail if Web Audio API not available
  }
}

export function useOrderNotification({ onNewOrder }: UseOrderNotificationOptions) {
  const seenIds    = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const handleNewOrder = useCallback((order: Order) => {
    if (seenIds.current.has(order.id)) return;
    seenIds.current.add(order.id);
    if (!initialized.current) return;
    playChaChingSound();
    onNewOrder(order);
  }, [onNewOrder]);

  // Poll the admin orders API for new orders
  const pollOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/orders?archived=false&page=0&pageSize=100');
      if (!res.ok) return;
      const json = await res.json();
      const orders: Order[] = json.data ?? [];

      if (!initialized.current) {
        // First poll — mark all existing orders as seen
        orders.forEach(o => seenIds.current.add(o.id));
        initialized.current = true;
        return;
      }

      // Subsequent polls — trigger notification for unseen orders
      orders.forEach(o => handleNewOrder(o));
    } catch (e) {
      // Silently ignore network errors during polling
    }
  }, [handleNewOrder]);

  useEffect(() => {
    // Initial poll on mount
    pollOrders();

    // Recurring poll every POLL_INTERVAL_MS
    const interval = setInterval(pollOrders, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pollOrders]);
}
