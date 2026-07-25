'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Product, ProductFilters, SortOption } from '@/types';

// ─── useProducts ──────────────────────────────────────────────────────────────

export function useProducts(filters?: ProductFilters, sort?: SortOption) {
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchProducts = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setProducts([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Pagination support — default to 100 rows max, never request unbounded data
      const pageSize = (filters as any)?.pageSize || 100;
      const page = (filters as any)?.page || 0;
      const offset = page * pageSize;

      let query = supabase
        .from('products')
        .select('*, categories(id, name)', { count: 'exact' });

      if (filters?.category_id)
        query = query.eq('category_id', filters.category_id);

      if (filters?.gender && filters.gender !== 'all')
        query = query.eq('gender', filters.gender);

      if (filters?.min_price !== undefined)
        query = query.gte('price', filters.min_price);

      if (filters?.max_price !== undefined)
        query = query.lte('price', filters.max_price);

      if (filters?.search)
        query = query.ilike('title', `%${filters.search}%`);

      // Sort
      switch (sort) {
        case 'price_asc':  query = query.order('price',      { ascending: true });  break;
        case 'price_desc': query = query.order('price',      { ascending: false }); break;
        case 'name_asc':   query = query.order('title',      { ascending: true });  break;
        default:           query = query.order('created_at', { ascending: false }); break;
      }

      // Apply pagination
      query = query.range(offset, offset + pageSize - 1);

      const { data, error: err, count } = await query;
      if (err) throw err;
      setProducts((data as Product[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [filters?.category_id, filters?.gender, filters?.min_price, filters?.max_price, filters?.search, sort, (filters as any)?.page, (filters as any)?.pageSize]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  return { products, loading, error, totalCount, refetch: fetchProducts };
}

// ─── useProduct (single) ──────────────────────────────────────────────────────

export function useProduct(id: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from('products')
      .select('*, categories(id, name)')
      .eq('id', id)
      .single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setProduct(data as Product);
        setLoading(false);
      });
  }, [id]);

  return { product, loading, error };
}

// ─── useFeaturedProducts ───────────────────────────────────────────────────────

export function useFeaturedProducts(limit = 6) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    supabase
      .from('products')
      .select('*, categories(id, name)')
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        setProducts((data as Product[]) ?? []);
        setLoading(false);
      });
  }, [limit]);

  return { products, loading };
}
