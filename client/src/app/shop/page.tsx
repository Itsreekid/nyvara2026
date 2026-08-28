'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import FilterSidebar from '@/components/shop/FilterSidebar';
import ProductSkeleton from '@/components/shop/ProductSkeleton';
import SortBar       from '@/components/shop/SortBar';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useOrders';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslation } from '@/locales/dictionary';
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { categories } = useCategories();
  const { language } = useLanguage();
  const t = (path: string) => getTranslation(language, path);

  const toSlug = (str: string) => str.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^\w-]+/g, '');

  const initialGender = (searchParams.get('gender') as ProductFilters['gender']) ?? 'all';
  const initialSearch = searchParams.get('search') ?? undefined;
  const initialMinPrice = searchParams.has('min_price') ? Number(searchParams.get('min_price')) : undefined;
  const initialMaxPrice = searchParams.has('max_price') ? Number(searchParams.get('max_price')) : undefined;
  const urlCategorySlug = searchParams.get('category');
  const initialSort = (searchParams.get('sort') as SortOption) ?? 'newest';
  const initialFrameShape = searchParams.get('frame_shape') ?? undefined;

  const [filters, setFilters] = useState<ProductFilters & { page?: number; pageSize?: number }>({
    gender: initialGender,
    search: initialSearch,
    min_price: initialMinPrice,
    max_price: initialMaxPrice,
    frame_shape: initialFrameShape,
    page: 0,
    pageSize: 20,
  });
  const [sort, setSort] = useState<SortOption>(initialSort);

  useEffect(() => {
    if (urlCategorySlug && categories.length > 0 && !filters.category_id) {
      const matched = categories.find(c => c.name && toSlug(c.name) === urlCategorySlug);
      if (matched) {
        setFilters(f => ({ ...f, category_id: matched.id, page: 0 }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, urlCategorySlug]);

  const { products, loading, error, totalCount } = useProducts(filters, sort);

  const updateFilters = (newFilters: ProductFilters & { page?: number; pageSize?: number }) => {
    setFilters(newFilters);
    const params = new URLSearchParams(searchParams.toString());
    
    if (newFilters.gender && newFilters.gender !== 'all') params.set('gender', newFilters.gender);
    else params.delete('gender');
    
    if (newFilters.search) params.set('search', newFilters.search);
    else params.delete('search');

    if (newFilters.min_price !== undefined) params.set('min_price', String(newFilters.min_price));
    else params.delete('min_price');
    
    if (newFilters.max_price !== undefined) params.set('max_price', String(newFilters.max_price));
    else params.delete('max_price');

    if (newFilters.category_id) {
       const matched = categories.find(c => c.id === newFilters.category_id);
       if (matched && matched.name) {
         params.set('category', toSlug(matched.name));
       } else {
         params.set('category', newFilters.category_id);
       }
    } else {
       params.delete('category');
    }

    if (newFilters.frame_shape) params.set('frame_shape', newFilters.frame_shape);
    else params.delete('frame_shape');

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const updateSort = (newSort: SortOption) => {
    setSort(newSort);
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', newSort);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleReset = useCallback(() => {
    updateFilters({ gender: 'all', page: 0, pageSize: 20 });
    updateSort('newest');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pathname, categories, router]);

  const totalPages = Math.ceil((totalCount || 0) / (filters.pageSize || 20));

  const handlePageChange = (newPage: number) => {
    updateFilters({ ...filters, page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <p className={styles.eyebrow}>{t('shop.subtitle')}</p>
          <h1 className={styles.pageTitle}>{t('shop.title')}</h1>
          <p className={styles.pageSubtitle}>
            {t('shop.desc')}
          </p>
        </div>
      </div>

      {/* Content area */}
      <div className={styles.content}>
        {/* Mobile filter trigger rendered inside FilterSidebar */}
        <div className={styles.mobileFilterRow}>
          <FilterSidebar
            filters={filters}
            onChange={(newFilters) => updateFilters({ ...newFilters, page: 0, pageSize: 20 })}
            onReset={handleReset}
          />
        </div>

        <div className={styles.body}>
          {/* Desktop sidebar */}
          <aside className={styles.sidebar}>
            <FilterSidebar
              filters={filters}
              onChange={(newFilters) => updateFilters({ ...newFilters, page: 0, pageSize: 20 })}
              onReset={handleReset}
            />
          </aside>

          {/* Products */}
          <div className={styles.main}>
            <SortBar
              total={totalCount || products.length}
              sort={sort}
              onSortChange={updateSort}
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
                  ← {t('shop.prev')}
                </button>
                
                <div className={styles.paginationInfo}>
                  Page {(filters.page || 0) + 1} / {totalPages}
                </div>
                
                <button 
                  onClick={() => handlePageChange((filters.page || 0) + 1)}
                  disabled={(filters.page || 0) >= totalPages - 1}
                  className={styles.paginationBtn}
                >
                  {t('shop.next')} →
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
