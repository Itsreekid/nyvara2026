'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import type { Product } from '@/types';
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

  const inCart     = isInCart(product.id);
  const wishlisted = isWishlisted(product.id);
  const [wishlistDisabled, setWishlistDisabled] = useState(false);

  // Discount calculation
  const hasDiscount     = product.discount != null && product.discount > 0;
  const discountedPrice = hasDiscount && product.price != null
    ? Math.round(product.price * (1 - product.discount! / 100))
    : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // prevent navigation when clicking Add to Cart
    addItem(product);
    fbEvent.addToCart({
      content_ids:  [String(product.id)],
      content_name: product.title ?? 'Sunglasses',
      value:        Number(product.final_price ?? product.price ?? 0),
    });
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
      });
    }
    window.setTimeout(() => setWishlistDisabled(false), 600);
  };

  const genderLabel: Record<string, string> = {
    homme: "Men's",
    femme: "Women's",
    unisex: 'Unisex',
  };

  return (
    <Link href={`/shop/${product.id}`} style={{ textDecoration: 'none' }}>
      <article className={styles.card} aria-label={product.title ?? 'Product'}>
        {/* Image */}
        <div className={styles.imageWrap}>
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.title ?? 'Sunglasses'}
              fill
              className={styles.image}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
              <span className={styles.category}>{product.categories.name}</span>
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
            >
              <ShoppingBag size={14} />
              <span>{inCart ? 'Added' : 'Add to Cart'}</span>
            </button>
          </div>
        </div>
      </article>
    </Link>
  );
}
