'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const pageSize = (filters as any)?.pageSize || 100;
      const page     = (filters as any)?.page     || 0;
      const offset   = page * pageSize;

      // Build query string for Express API
      const params = new URLSearchParams();
      if (filters?.category_id) params.set('category_id', String(filters.category_id));
      if (filters?.gender && filters.gender !== 'all') params.set('gender', filters.gender);
      if (filters?.search)      params.set('search', filters.search);
      if (filters?.frame_shape) params.set('frame_shape', filters.frame_shape);
      if (filters?.min_price !== undefined) params.set('min_price', String(filters.min_price));
      if (filters?.max_price !== undefined) params.set('max_price', String(filters.max_price));

      const needsJSSort   = sort === 'tendance' || sort === 'price_asc' || sort === 'price_desc';
      const needsJSFilter = filters?.min_price !== undefined || filters?.max_price !== undefined;

      // DB-side sort only when we don't need JS sort
      if (!needsJSSort) {
        if (sort === 'name_asc') params.set('sort', 'name_asc');
        // default: created_at DESC (server default)
      }

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      let finalData: Product[] = await res.json();

      // JS price filter (Express server already handles min/max_price, but include as safety net)
      if (needsJSFilter) {
        finalData = finalData.filter(p => {
          const price = getActualPrice(p);
          if (filters?.min_price !== undefined && price < filters.min_price) return false;
          if (filters?.max_price !== undefined && price > filters.max_price) return false;
          return true;
        });
      }

      // JS sorts
      if (sort === 'tendance') {
        try {
          const trendRes = await fetch('/api/trending');
          if (trendRes.ok) {
            const trendingData = await trendRes.json();
            const scoreMap = new Map<string, number>(
              trendingData.map((t: any) => [t.product_id, t.trending_score])
            );
            finalData.sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0));
          }
        } catch (e) {
          console.error('Failed to load trending scores for sorting', e);
        }
      } else if (sort === 'price_asc') {
        finalData.sort((a, b) => getActualPrice(a) - getActualPrice(b));
      } else if (sort === 'price_desc') {
        finalData.sort((a, b) => getActualPrice(b) - getActualPrice(a));
      }

      // Pagination
      setTotalCount(finalData.length);
      finalData = finalData.slice(offset, offset + pageSize);

      setProducts(finalData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [
    filters?.category_id, filters?.gender, filters?.min_price,
    filters?.max_price, filters?.search, filters?.frame_shape,
    sort, (filters as any)?.page, (filters as any)?.pageSize,
  ]);

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
    setLoading(true);
    fetch(`/api/products/${id}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => { setProduct(data as Product); })
      .catch(e  => { setError(e.message); })
      .finally(() => { setLoading(false); });
  }, [id]);

  return { product, loading, error };
}

// ─── useFeaturedProducts ───────────────────────────────────────────────────────

export function useFeaturedProducts(limit = 6) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch(`/api/products`)
      .then(res => res.ok ? res.json() : [])
      .then((data: Product[]) => {
        setProducts(data.slice(0, limit));
      })
      .catch(e => { console.error('useFeaturedProducts error:', e); })
      .finally(() => setLoading(false));
  }, [limit]);

  return { products, loading };
}
