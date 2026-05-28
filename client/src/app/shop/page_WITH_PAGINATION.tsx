// File: src/app/shop/page_WITH_PAGINATION.tsx
// Shop page with pagination controls

'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import FilterSidebar from '@/components/shop/FilterSidebar';
import ProductSkeleton from '@/components/shop/ProductSkeleton';
import SortBar from '@/components/shop/SortBar';
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

  const handleFilterChange = (newFilters: ProductFilters) => {
    setFilters(prev => ({ ...newFilters, page: 0, pageSize: 20 }));
  };

  const totalPages = Math.ceil((totalCount || 0) / (filters.pageSize || 20));
  const currentPage = (filters.page || 0) + 1;

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setFilters(prev => ({ ...prev, page: (prev.page || 0) + 1 }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setFilters(prev => ({ ...prev, page: (prev.page || 0) - 1 }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPage = (pageNum: number) => {
    setFilters(prev => ({ ...prev, page: pageNum - 1 }));
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
        {/* Mobile filter row */}
        <div className={styles.mobileFilterRow}>
          <FilterSidebar
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleReset}
          />
        </div>

        <div className={styles.body}>
          <aside className={styles.sidebar}>
            <FilterSidebar
              filters={filters}
              onChange={handleFilterChange}
              onReset={handleReset}
            />
          </aside>

          <main className={styles.main}>
            <SortBar sort={sort} onSortChange={setSort} total={totalCount ?? 0} />

            {/* Product grid */}
            <ProductGrid products={products} loading={loading} error={error} />

            {/* Pagination controls */}
            {!loading && !error && products.length > 0 && totalPages > 1 && (
              <div className={styles.paginationContainer}>
                <div className={styles.pagination}>
                  {/* Previous button */}
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className={styles.paginationBtn}
                    title="Page précédente"
                  >
                    ← Précédent
                  </button>

                  {/* Page numbers */}
                  <div className={styles.pageNumbers}>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = currentPage > 3 ? currentPage + i - 2 : i + 1;
                      if (pageNum > totalPages) return null;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`${styles.pageNumber} ${pageNum === currentPage ? styles.active : ''}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next button */}
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className={styles.paginationBtn}
                    title="Page suivante"
                  >
                    Suivant →
                  </button>
                </div>

                {/* Info */}
                <p className={styles.paginationInfo}>
                  Page {currentPage} sur {totalPages} • {totalCount} produits
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px' }}>Chargement...</div>}>
      <ShopContent />
    </Suspense>
  );
}
