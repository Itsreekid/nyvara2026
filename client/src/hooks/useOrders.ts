'use client';

import { useState, useEffect } from 'react';
import type { CreateOrderPayload, Category } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

// ─── useCategories ────────────────────────────────────────────────────────────

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/categories`)
      .then(res => res.ok ? res.json() : [])
      .then((data: Category[]) => {
        setCategories(data);
      })
      .catch(e => { console.error('useCategories error:', e); })
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading };
}

// ─── useCreateOrder ───────────────────────────────────────────────────────────

export function useCreateOrder() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createOrder = async (payload: CreateOrderPayload) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // POST to our internal Next.js API route which validates prices server-side
      const res = await fetch('/api/orders', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data = await res.json();

      // Trending: log order events for each item
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        payload.items.forEach(item => {
          navigator.sendBeacon(
            '/api/tracking/stats',
            JSON.stringify({ product_id: item.product_id, event: 'order' })
          );
        });
      }

      setSuccess(true);
      return data.order as { id: string };
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Order failed. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createOrder, loading, error, success };
}
