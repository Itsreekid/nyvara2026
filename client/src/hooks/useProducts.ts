'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Product, ProductFilters, SortOption } from '@/types';

const getActualPrice = (p: Product) => {
  const hasDiscount = p.discount != null && p.discount > 0;
  if (hasDiscount && p.price != null) {
    return Math.round(p.price * (1 - p.discount! / 100));
  }
  return p.final_price ?? p.price ?? 0;
};

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

      if (filters?.gender && filters.gender !== 'all') {
        if (filters.gender === 'homme' || filters.gender === 'femme') {
          query = query.in('gender', [filters.gender, 'unisex']);
        } else {
          query = query.eq('gender', filters.gender);
        }
      }

      if (filters?.search)
        query = query.ilike('title', `%${filters.search}%`);

      if (filters?.frame_shape)
        query = query.eq('frame_shape', filters.frame_shape);

      const needsJSSort = sort === 'tendance' || sort === 'price_asc' || sort === 'price_desc';
      const needsJSFilter = filters?.min_price !== undefined || filters?.max_price !== undefined;

      // Sort in DB if possible
      switch (sort) {
        case 'name_asc':   query = query.order('title',      { ascending: true });  break;
        case 'tendance':
        case 'price_asc':
        case 'price_desc': /* Custom JS Sort below */                               break;
        default:           query = query.order('created_at', { ascending: false }); break;
      }

      // Apply pagination in DB ONLY if we don't need JS sorting/filtering
      if (!needsJSSort && !needsJSFilter) {
        query = query.range(offset, offset + pageSize - 1);
      }

      const { data, error: err, count } = await query;
      if (err) throw err;
      
      let finalData = (data as Product[]) ?? [];

      // 1. JS Filter by Price
      if (needsJSFilter) {
        finalData = finalData.filter(p => {
          const price = getActualPrice(p);
          if (filters?.min_price !== undefined && price < filters.min_price) return false;
          if (filters?.max_price !== undefined && price > filters.max_price) return false;
          return true;
        });
      }

      // 2. JS Sort
      if (sort === 'tendance') {
        try {
          const res = await fetch('/api/trending');
          if (res.ok) {
            const trendingData = await res.json();
            const scoreMap = new Map<string, number>(
              trendingData.map((t: any) => [t.product_id, t.trending_score])
            );
            finalData.sort((a, b) => {
              const scoreA = scoreMap.get(a.id) ?? 0;
              const scoreB = scoreMap.get(b.id) ?? 0;
              return scoreB - scoreA;
            });
          }
        } catch (e) {
          console.error('Failed to load trending scores for sorting', e);
        }
      } else if (sort === 'price_asc') {
        finalData.sort((a, b) => getActualPrice(a) - getActualPrice(b));
      } else if (sort === 'price_desc') {
        finalData.sort((a, b) => getActualPrice(b) - getActualPrice(a));
      }

      // 3. JS Pagination
      if (needsJSSort || needsJSFilter) {
        setTotalCount(finalData.length);
        finalData = finalData.slice(offset, offset + pageSize);
      } else {
        setTotalCount(count ?? 0);
      }

      setProducts(finalData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [filters?.category_id, filters?.gender, filters?.min_price, filters?.max_price, filters?.search, filters?.frame_shape, sort, (filters as any)?.page, (filters as any)?.pageSize]);

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
