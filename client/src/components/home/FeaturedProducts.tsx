'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ProductCard from '@/components/shop/ProductCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useFeaturedProducts } from '@/hooks/useProducts';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslation } from '@/locales/dictionary';
import styles from './FeaturedProducts.module.css';

export default function FeaturedProducts() {
  const { products, loading } = useFeaturedProducts(6);
  const { language } = useLanguage();
  const t = (path: string) => getTranslation(language, path);

  return (
    <section className={styles.section} id="featured">
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{t('featured.eyebrow')}</p>
            <h2 className={styles.headline} style={{ whiteSpace: 'pre-line' }}>{t('featured.title')}</h2>
          </div>
          <Link href="/shop" className={styles.viewAll}>
            {t('featured.viewAll')} {language === 'fr' ? <ArrowRight size={16} /> : <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />}
          </Link>
        </div>

        {/* Grid */}
        {loading ? (
          <div className={styles.loadingWrap}>
            <LoadingSpinner size="lg" color="gold" />
          </div>
        ) : products.length === 0 ? (
          <div className={styles.emptyWrap}>
            <p className={styles.emptyText}>{t('featured.emptyText')}</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
