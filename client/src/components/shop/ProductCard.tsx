'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import type { Product } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslation } from '@/locales/dictionary';
import styles from './ProductCard.module.css';
import { fbEvent } from '@/components/analytics/FacebookPixel';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

const formatTND = (price: number | null) => {
  if (price === null) return '—';
  return `${price.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} TND`;
};

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const { addItem, isInCart } = useCart();
  const { addToWishlist, removeFromWishlist, isWishlisted } = useWishlist();
  const { language } = useLanguage();
  const t = (path: string) => getTranslation(language, path);

  const inCart     = isInCart(product.id);
  const wishlisted = isWishlisted(product.id);
  const [wishlistDisabled, setWishlistDisabled] = useState(false);

  // Discount calculation
  const hasDiscount     = product.discount != null && product.discount > 0;
  const discountedPrice = hasDiscount && product.price != null
    ? Math.round(product.price * (1 - product.discount! / 100))
    : null;

  const isOutOfStock = product.is_active === false || ((product.stock ?? 0) <= 0 && product.allow_unlimited_stock !== true);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // prevent navigation when clicking Add to Cart
    if (isOutOfStock) return;
    addItem(product);
    fbEvent.addToCart({
      content_ids:  [String(product.id)],
      content_name: product.title ?? 'Sunglasses',
      value:        Number(discountedPrice ?? product.final_price ?? product.price ?? 0),
    });
    // ── Trending: log add-to-cart ─────────────────────────────────────
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/tracking/stats',
        JSON.stringify({ product_id: product.id, event: 'cart' })
      );
    }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault(); // prevent navigation
    if (wishlistDisabled) return;
    setWishlistDisabled(true);
    if (wishlisted) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
      fbEvent.addToWishlist({
        content_ids:  [String(product.id)],
        content_name: product.title ?? 'Sunglasses',
        value:        Number(discountedPrice ?? product.final_price ?? product.price ?? 0),
      });
    }
    window.setTimeout(() => setWishlistDisabled(false), 600);
  };

  const genderLabel: Record<string, string> = {
    homme: t('product.genderMen'),
    femme: t('product.genderWomen'),
    unisex: t('product.genderUnisex'),
  };

  return (
    <Link href={`/shop/${product.id}`} style={{ textDecoration: 'none', pointerEvents: isOutOfStock ? 'none' : 'auto' }}>
      <article className={`${styles.card} ${isOutOfStock ? styles.outOfStockCard : ''}`} aria-label={product.title ?? 'Product'}>
        {/* Image */}
        <div className={styles.imageWrap}>
          {isOutOfStock && (
            <div className={styles.outOfStockBadge}>Rupture de stock</div>
          )}
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.title ?? 'Sunglasses'}
              fill
              className={styles.image}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              priority={priority}
            />
          ) : (
            <div className={styles.imagePlaceholder} aria-hidden="true">
              <span className={styles.placeholderText}>NYVARA</span>
            </div>
          )}

          {/* Gender badge */}
          {product.gender && (
            <div className={styles.genderBadge}>
              <Badge variant="black">
                {genderLabel[product.gender] ?? product.gender}
              </Badge>
            </div>
          )}

          {/* Discount badge */}
          {hasDiscount && (
            <div className={styles.discountBadge}>
              -{Math.round(product.discount!)}%
            </div>
          )}

          {/* Wishlist btn */}
          <button
            className={`${styles.wishlistBtn} ${wishlisted ? styles.wishlisted : ''}`}
            onClick={handleWishlist}
            disabled={wishlistDisabled}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Info */}
        <div className={styles.info}>
          <div className={styles.meta}>
            {product.categories?.name && (
              <span className={styles.category}>
                {product.categories.name.toLowerCase().includes('solaires') ? t('product.categorySunglasses') : 
                 product.categories.name.toLowerCase().includes('vue') ? t('product.categoryEyeglasses') : 
                 product.categories.name}
              </span>
            )}
          </div>

          <h3 className={styles.title}>{product.title ?? 'Sunglasses'}</h3>

          <div className={styles.footer}>
            <div className={styles.priceBlock}>
              {hasDiscount ? (
                <>
                  <p className={styles.originalPrice}>{formatTND(product.price)}</p>
                  <p className={styles.price}>{formatTND(discountedPrice)}</p>
                </>
              ) : (
                <p className={styles.price} style={{ color: 'var(--color-black)' }}>{formatTND(product.price)}</p>
              )}
            </div>
            <button
              className={`${styles.addBtn} ${inCart ? styles.inCart : ''}`}
              onClick={handleAddToCart}
              aria-label={inCart ? 'Added to cart' : 'Add to cart'}
              disabled={isOutOfStock}
              style={{ opacity: isOutOfStock ? 0.5 : 1, cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
            >
              <ShoppingBag size={14} />
              <span>{inCart ? '✔' : t('product.addToCart')}</span>
            </button>
          </div>
        </div>
      </article>
    </Link>
  );
}
