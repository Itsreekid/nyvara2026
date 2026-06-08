'use client';

import ProductCard from './ProductCard';
import ProductSkeleton from './ProductSkeleton';
import type { Product } from '@/types';
import styles from './ProductGrid.module.css';

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  error?: string | null;
}

export default function ProductGrid({ products, loading = false, error = null }: ProductGridProps) {
  if (loading) {
    return (
      <div className={styles.grid}>
        {[1, 2, 3, 4, 5, 6].map(i => <ProductSkeleton key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorWrap}>
        <p className={styles.errorText}>{error}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={styles.emptyWrap}>
        <p className={styles.emptyTitle}>No products found</p>
        <p className={styles.emptyText}>Try adjusting your filters or check back later.</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < 6} />
      ))}
    </div>
  );
}
