'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import FilterSidebar from '@/components/shop/FilterSidebar';
import ProductSkeleton from '@/components/shop/ProductSkeleton';
import SortBar       from '@/components/shop/SortBar';
import { useProducts } from '@/hooks/useProducts';
import type { ProductFilters, SortOption } from '@/types';
import styles from './shop.module.css';

const ProductGrid = dynamic(() => import('@/components/shop/ProductGrid'), {
  loading: () => (
    <div className={styles.gridSkeleton}>
      {[1, 2, 3, 4, 5, 6].map(i => <ProductSkeleton key={i} />)}
    </div>
  ),
  ssr: true,
});

function ShopContent() {
  const searchParams = useSearchParams();
  const initialGender = (searchParams.get('gender') as ProductFilters['gender']) ?? 'all';
  const initialSearch = searchParams.get('search') ?? undefined;

  const [filters, setFilters] = useState<ProductFilters & { page?: number; pageSize?: number }>({
    gender: initialGender,
    search: initialSearch,
    page: 0,
    pageSize: 20,
  });
  const [sort, setSort] = useState<SortOption>('newest');

  const { products, loading, error, totalCount } = useProducts(filters, sort);

  const handleReset = useCallback(() => {
    setFilters({ gender: 'all', page: 0, pageSize: 20 });
    setSort('newest');
  }, []);

  const totalPages = Math.ceil((totalCount || 0) / (filters.pageSize || 20));

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <p className={styles.eyebrow}>Notre Collection</p>
          <h1 className={styles.pageTitle}>Boutique</h1>
          <p className={styles.pageSubtitle}>
            Découvrez des lunettes premium conçues pour le soleil tunisien
          </p>
        </div>
      </div>

      {/* Content area */}
      <div className={styles.content}>
        {/* Mobile filter trigger rendered inside FilterSidebar */}
        <div className={styles.mobileFilterRow}>
          <FilterSidebar
            filters={filters}
            onChange={(newFilters) => setFilters({ ...newFilters, page: 0, pageSize: 20 })}
            onReset={handleReset}
          />
        </div>

        <div className={styles.body}>
          {/* Desktop sidebar */}
          <aside className={styles.sidebar}>
            <FilterSidebar
              filters={filters}
              onChange={(newFilters) => setFilters({ ...newFilters, page: 0, pageSize: 20 })}
              onReset={handleReset}
            />
          </aside>

          {/* Products */}
          <div className={styles.main}>
            <SortBar
              total={totalCount || products.length}
              sort={sort}
              onSortChange={setSort}
            />
            <ProductGrid products={products} loading={loading} error={error} />
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button 
                  onClick={() => handlePageChange(Math.max(0, (filters.page || 0) - 1))}
                  disabled={(filters.page || 0) === 0}
                  className={styles.paginationBtn}
                >
                  ← Précédent
                </button>
                
                <div className={styles.paginationInfo}>
                  Page {(filters.page || 0) + 1} sur {totalPages}
                </div>
                
                <button 
                  onClick={() => handlePageChange((filters.page || 0) + 1)}
                  disabled={(filters.page || 0) >= totalPages - 1}
                  className={styles.paginationBtn}
                >
                  Suivant →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
      <ShopContent />
    </Suspense>
  );
}
