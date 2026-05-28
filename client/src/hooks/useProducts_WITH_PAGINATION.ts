// File: src/hooks/useProducts.ts
// Add pagination support to product loading

import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Product, ProductFilters } from '@/types';

interface SortMap {
  [key: string]: { column: string; ascending: boolean };
}

const sortMap: SortMap = {
  'newest': { column: 'created_at', ascending: false },
  'price-asc': { column: 'price', ascending: true },
  'price-desc': { column: 'price', ascending: false },
  'popular': { column: 'review_count', ascending: false },
};

export function useProducts(
  filters: ProductFilters & { page?: number; pageSize?: number },
  sort: string
) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchProducts();
  }, [filters, sort]);

  const fetchProducts = async () => {
    if (!isSupabaseConfigured) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const pageSize = filters.pageSize || 20;
      const page = filters.page || 0;
      const offset = page * pageSize;

      const sortConfig = sortMap[sort] || sortMap['newest'];

      let query = supabase
        .from('products')
        .select('*, categories:category_id(*)', { count: 'exact' })
        .order(sortConfig.column, { ascending: sortConfig.ascending })
        .range(offset, offset + pageSize - 1);

      if (filters.gender && filters.gender !== 'all') {
        query = query.eq('gender', filters.gender);
      }

      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error: err, count } = await query;

      if (err) throw err;

      setProducts(data || []);
      setTotalCount(count || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  return { products, loading, error, totalCount };
}
