'use client';

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { CreateOrderPayload, Category } from '@/types';

// ─── useCategories ────────────────────────────────────────────────────────────

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })
      .then(({ data }) => {
        setCategories((data as Category[]) ?? []);
        setLoading(false);
      });
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
      // 1. Calculate total from Supabase (price authoritative on server)
      const productIds = payload.items.map(i => i.product_id);
      const { data: products, error: prodErr } = await supabase
        .from('products')
        .select('id, price, discount, quantity_breaks')
        .in('id', productIds);

      if (prodErr) throw prodErr;

      // Map to store calculated unit price per item (takes quantity breaks into account)
      const productTotals: Record<string, number> = {};
      payload.items.forEach(item => {
        productTotals[item.product_id] = (productTotals[item.product_id] || 0) + item.quantity;
      });

      const itemPrices = payload.items.map(i => {
        const p = (products ?? []).find(prod => prod.id === i.product_id);
        if (!p) return { id: i.product_id, price: 0 };

        const totalQty = productTotals[i.product_id];
        const breaks = (p.quantity_breaks || []) as any[];
        const applicableBreak = [...breaks]
          .sort((a, b) => b.min_qty - a.min_qty)
          .find(qb => totalQty >= qb.min_qty);

        if (applicableBreak) {
          return { id: i.product_id, price: applicableBreak.total_price / totalQty };
        } else {
          const hasDiscount = p.discount != null && p.discount > 0;
          const finalPrice = hasDiscount ? (p.price ?? 0) * (1 - p.discount / 100) : (p.price ?? 0);
          return { id: i.product_id, price: finalPrice };
        }
      });

      const total_price = payload.items.reduce(
        (sum, item, idx) => sum + itemPrices[idx].price * item.quantity,
        0
      );

      // 2. Insert order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_name:  payload.customer_name,
          customer_email: payload.customer_email,
          phone:          payload.phone,
          city:           payload.city,
          postal_code:    payload.postal_code,
          country:        payload.country,
          address:        payload.address,
          total_price,
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // 3. Insert order items
      const orderItems = payload.items.map((i, idx) => ({
        order_id:   order.id,
        product_id: i.product_id,
        quantity:   i.quantity,
        selected_color_name: i.selected_color?.name || null,
        quantity_break_price: itemPrices[idx].price, // Store the special price applied
      }));

      const { error: itemsErr } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsErr) throw itemsErr;

      // 4. Cosmos dispatch removed. The order remains 'pending'.
      // The admin will trigger the Cosmos API manually from the dashboard.

      setSuccess(true);
      return order;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Order failed. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createOrder, loading, error, success };
}
