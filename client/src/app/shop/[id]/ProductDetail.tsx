'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingBag, ArrowLeft, Star, Truck, RotateCcw, ShieldCheck, Minus, Plus, CheckCircle2, Sun, Eye, Zap } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import ProductCard from '@/components/shop/ProductCard';
import type { Product, ColorOption } from '@/types';
import styles from './product.module.css';
import { fbEvent } from '@/components/analytics/FacebookPixel';

const formatTND = (price: number | null) => {
  if (price === null) return '—';
  return `${price.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} TND`;
};

const genderLabel: Record<string, string> = {
  homme: "Men's",
  femme: "Women's",
  unisex: 'Unisex',
};

interface GalleryImage { id: string; image_url: string; }
interface Props {
  product: Product;
  gallery: GalleryImage[];
  related: Product[];
}

const SLIDE_INTERVAL = 3500;

// Star rating display
function Stars({ rating }: { rating: number | null }) {
  const r = rating ?? 0;
  return (
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={15}
          fill={r >= i ? '#e6a817' : r >= i - 0.5 ? 'url(#half)' : 'none'}
          color={r >= i - 0.5 ? '#e6a817' : '#ccc'}
        />
      ))}
    </div>
  );
}

export default function ProductDetail({ product, gallery, related }: Props) {
  const router = useRouter();
  const { addItem, isInCart }                             = useCart();
  const { addToWishlist, removeFromWishlist, isWishlisted } = useWishlist();

  const inCart     = isInCart(product.id);
  const wishlisted = isWishlisted(product.id);

  // ── Meta Pixel: ViewContent (once per product page load) ─────────────
  const viewContentFired = useRef(false);
  useEffect(() => {
    if (viewContentFired.current) return;
    viewContentFired.current = true;

    fbEvent.viewContent({
      content_ids:      [String(product.id)],
      content_name:     product.title ?? '',
      value:            Number(product.final_price ?? product.price ?? 0),
      content_type:     'product',
      content_category: product.categories?.name ?? undefined,
    });
  }, [product.id, product.title, product.final_price, product.price, product.categories?.name]);

  const hasDiscount     = product.discount != null && product.discount > 0;
  const discountedPrice = hasDiscount && product.price != null
    ? Math.round(product.price * (1 - product.discount! / 100))
    : null;

  const inStockBool = product.stock != null && product.stock > 0;

  // Parse features (newline-separated)
  const featuresList = product.features
    ? product.features.split('\n').map(f => f.trim()).filter(Boolean)
    : [];

  // Parse specs
  const specEntries = product.specs ? Object.entries(product.specs) : [];

  // Colors — support multiple selections for bundles
  const [selectedColors, setSelectedColors] = useState<(ColorOption | null)[]>([]);
  const [qty, setQty] = useState(1);

  // Initialize/resize selectedColors when qty changes
  useEffect(() => {
    setSelectedColors(prev => {
      const next = [...prev];
      if (next.length > qty) return next.slice(0, qty);
      while (next.length < qty) next.push(null);
      return next;
    });
  }, [qty]);

  // For the gallery, we'll track the last selected color to know which image to show
  const [lastSelectedColor, setLastSelectedColor] = useState<ColorOption | null>(null);

  // Build one flat list: primary → all color images → extra gallery
  const allImages: string[] = [
    ...(product.image_url ? [product.image_url] : []),
    ...(product.color_options ?? []).flatMap(co => [
      ...(co.image_url ? [co.image_url] : []),
      ...(co.image_url2 ? [co.image_url2] : []),
    ]),
    ...gallery.map(g => g.image_url),
  ];

  // Map color id → index of its first image in allImages (for jumping on swatch click)
  const colorImageIndex: Record<string, number> = {};
  let imgIdx = product.image_url ? 1 : 0;
  for (const co of product.color_options ?? []) {
    if (co.image_url) { colorImageIndex[co.id] = imgIdx; imgIdx++; }
    if (co.image_url2) imgIdx++;
  }

  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused,  setIsPaused]  = useState(false);
  const [isZoomed,  setIsZoomed]  = useState(false);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const activeImage  = allImages[activeIdx] ?? null;

  // Auto-slideshow
  useEffect(() => {
    if (allImages.length <= 1 || isPaused) return;
    const id = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % allImages.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(id);
  }, [allImages.length, isPaused]);

  // Cursor-point zoom
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = imageWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--zoom-x', `${((e.clientX - rect.left) / rect.width)  * 100}%`);
    el.style.setProperty('--zoom-y', `${((e.clientY - rect.top)  / rect.height) * 100}%`);
  }, []);

  const handleMouseEnter = () => { setIsZoomed(true);  setIsPaused(true);  };
  const handleMouseLeave = () => {
    setIsZoomed(false); setIsPaused(false);
    imageWrapRef.current?.style.setProperty('--zoom-x', '50%');
    imageWrapRef.current?.style.setProperty('--zoom-y', '50%');
  };

  const handleThumbClick = (idx: number) => {
    setActiveIdx(idx);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 4000);
  };

  const handleAddToCart = () => {
    selectedColors.forEach(color => {
      addItem(product, color ?? undefined);
    });
    fbEvent.addToCart({
      content_ids:  [String(product.id)],
      content_name: product.title ?? '',
      value:        Number((product.final_price ?? product.price ?? 0) * qty),
      content_type: 'product',
    });
    setQty(1);
  };

  // Direct checkout: add to cart then jump straight to checkout form
  const handleBuyNow = () => {
    selectedColors.forEach(color => {
      addItem(product, color ?? undefined);
    });
    fbEvent.addToCart({
      content_ids:  [String(product.id)],
      content_name: product.title ?? '',
      value:        (product.final_price ?? product.price ?? 0) * qty,
      content_type: 'product',
    });
    router.push('/cart?checkout=true');
  };

  const handleWishlist = () => {
    wishlisted ? removeFromWishlist(product.id) : addToWishlist(product);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* ── Back ── */}
        <Link href="/shop" className={styles.back}>
          <ArrowLeft size={14} /> Retour à la boutique
        </Link>

        {/* ══════════ HERO ══════════ */}
        <div className={styles.hero}>

          {/* LEFT — Gallery */}
          <div className={styles.imageSticky}>
            <div
              ref={imageWrapRef}
              className={`${styles.imageWrap} ${isZoomed ? styles.imageZoomed : ''}`}
              onMouseMove={handleMouseMove}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              style={{ '--zoom-x': '50%', '--zoom-y': '50%' } as React.CSSProperties}
            >
              {hasDiscount && (
                <div className={styles.discountBadge}>-{product.discount}%</div>
              )}
              {activeImage ? (
                <Image
                  key={activeImage}
                  src={activeImage}
                  alt={product.title ?? 'Sunglasses'}
                  fill
                  className={styles.image}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className={styles.placeholder}>NYVARA</div>
              )}
            </div>

            {/* Dots */}
            {allImages.length > 1 && (
              <div className={styles.dots}>
                {allImages.map((_, idx) => (
                  <button
                    key={idx}
                    className={`${styles.dot} ${idx === activeIdx ? styles.dotActive : ''}`}
                    onClick={() => handleThumbClick(idx)}
                    aria-label={`Photo ${idx + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className={styles.thumbnails}>
                {allImages.map((src, idx) => (
                  <button
                    key={src + idx}
                    className={`${styles.thumb} ${idx === activeIdx ? styles.thumbActive : ''}`}
                    onClick={() => handleThumbClick(idx)}
                    aria-label={`Photo ${idx + 1}`}
                  >
                    <Image src={src} alt={`Vue ${idx + 1}`} fill className={styles.thumbImg} sizes="80px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Buy box */}
          <div className={styles.buyBox}>
            {/* Badge + meta */}
            {product.badge && (
              <div className={styles.heroBadge}>{product.badge}</div>
            )}
            <div className={styles.metaRow}>
              {product.categories?.name && <span className={styles.category}>{product.categories.name}</span>}
              {product.gender && <span className={styles.genderPill}>{genderLabel[product.gender]}</span>}
            </div>

            {/* Title */}
            <h1 className={styles.title}>{product.title ?? 'Sunglasses'}</h1>

            {/* Rating */}
            {product.rating != null && (
              <div className={styles.ratingRow}>
                <Stars rating={product.rating} />
                <span className={styles.ratingNum}>{product.rating.toFixed(1)}</span>
                {product.review_count != null && (
                  <span className={styles.reviewCount}>({product.review_count.toLocaleString('fr-FR')} avis)</span>
                )}
              </div>
            )}
            {/* Color Selector (Only for 1 unit) */}
            {qty === 1 && product.color_options && product.color_options.length > 0 && (
              <div className={styles.colorSelector}>
                <p className={styles.colorLabel}>Couleur : <strong>{selectedColors[0]?.name || 'Veuillez choisir'}</strong></p>
                <div className={styles.colorList}>
                  {product.color_options.map(co => (
                    <button
                      key={co.id}
                      className={`${styles.colorCircle} ${selectedColors[0]?.id === co.id ? styles.colorCircleActive : ''}`}
                      onClick={() => {
                        const newColors = [co];
                        setSelectedColors(newColors);
                        setLastSelectedColor(co);
                        setActiveIdx(colorImageIndex[co.id] ?? 0);
                      }}
                      style={co.hex2 ? { background: `linear-gradient(135deg, ${co.hex1} 50%, ${co.hex2} 50%)` } : { background: co.hex1 }}
                      title={co.name}
                    />
                  ))}
                </div>
              </div>
            )}

            <hr className={styles.divider} />

            {/* Price */}
            <div className={styles.priceBlock}>
              {hasDiscount ? (
                <div className={styles.priceRow}>
                  <span className={styles.price}>{formatTND(discountedPrice)}</span>
                  <span className={styles.originalPrice}>{formatTND(product.price)}</span>
                  <span className={styles.saveBadge}>Économisez {product.discount}%</span>
                </div>
              ) : (
                <span className={styles.priceNormal}>{formatTND(product.price)}</span>
              )}
            </div>

            <hr className={styles.divider} />

            {/* Feature bullets */}
            {featuresList.length > 0 && (
              <ul className={styles.featuresList}>
                {featuresList.map((f, i) => (
                  <li key={i} className={styles.featureItem}>
                    <CheckCircle2 size={15} className={styles.featureIcon} />
                    {f}
                  </li>
                ))}
              </ul>
            )}

            <hr className={styles.divider} />

            {/* Stock */}
            <p className={inStockBool ? styles.inStock : styles.outOfStock}>
              {inStockBool ? `✓ En stock` : '✗ Rupture de stock'}
            </p>

            {/* Quantity Breaks (Offres de quantité) */}
            {product.quantity_breaks && product.quantity_breaks.length > 0 && inStockBool && (
              <div className={styles.qbreaksContainer}>
                <p className={styles.qbreaksTitle}>Offres spéciales :</p>
                <div className={styles.qbreaksList}>
                  {/* Option 1: Standard */}
                  <div 
                    className={`${styles.qbreakItem} ${qty === 1 ? styles.qbreakActive : ''}`}
                    onClick={() => setQty(1)}
                  >
                    <div className={styles.qbreakRadio}>
                      <div className={styles.qbreakRadioInner} />
                    </div>
                    <div className={styles.qbreakInfo}>
                      <span className={styles.qbreakQty}>1 unité</span>
                      <span className={styles.qbreakPrice}>{formatTND(discountedPrice || product.price)}</span>
                    </div>
                    <span className={styles.qbreakLabel}>Prix standard</span>
                  </div>

                  {/* Options: Breaks */}
                  {product.quantity_breaks.map((qb, idx) => (
                    <div 
                      key={idx}
                      className={`${styles.qbreakItem} ${qty === qb.min_qty ? styles.qbreakActive : ''}`}
                      onClick={() => setQty(qb.min_qty)}
                    >
                      <div className={styles.qbreakRadio}>
                        <div className={styles.qbreakRadioInner} />
                      </div>
                      <div className={styles.qbreakInfo}>
                        <span className={styles.qbreakQty}>{qb.min_qty} unités</span>
                        <span className={styles.qbreakTotal}>{formatTND(qb.total_price)}</span>
                        
                        {/* Multi-color selection INSIDE the card when active */}
                        {qty === qb.min_qty && product.color_options && (
                          <div className={styles.qbreakColors}>
                            {Array.from({ length: qb.min_qty }).map((_, uIdx) => (
                              <div key={uIdx} className={styles.qbreakColorRow}>
                                <span className={styles.qbreakColorLabel}>Paire {uIdx + 1} :</span>
                                <div className={styles.colorListSmall}>
                                  {product.color_options?.map(co => (
                                    <button
                                      key={co.id}
                                      type="button"
                                      className={`${styles.colorCircleSmall} ${selectedColors[uIdx]?.id === co.id ? styles.colorCircleSmallActive : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newColors = [...selectedColors];
                                        newColors[uIdx] = co;
                                        setSelectedColors(newColors);
                                        setLastSelectedColor(co);
                                        setActiveIdx(colorImageIndex[co.id] ?? 0);
                                      }}
                                      style={co.hex2 ? { background: `linear-gradient(135deg, ${co.hex1} 50%, ${co.hex2} 50%)` } : { background: co.hex1 }}
                                      title={co.name}
                                    />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {qb.label && <span className={styles.qbreakPromoBadge}>{qb.label}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selection des couleurs après l'offre - REMOVED from here, now inside cards */}

            {/* Quantity Selector (Show only if no breaks) */}
            {inStockBool && (!product.quantity_breaks || product.quantity_breaks.length === 0) && (
              <div className={styles.qtyRow}>
                <span className={styles.qtyLabel}>Quantité :</span>
                <div className={styles.qtyControl}>
                  <button className={styles.qtyBtn} onClick={() => setQty(q => Math.max(1, q - 1))}>
                    <Minus size={14} />
                  </button>
                  <span className={styles.qtyValue}>{qty}</span>
                  <button className={styles.qtyBtn} onClick={() => setQty(q => Math.min(product.stock ?? 99, q + 1))}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className={styles.actions}>
              {/* Primary CTA — jump straight to checkout */}
              <button
                className={styles.buyNowBtn}
                onClick={handleBuyNow}
                disabled={!inStockBool}
              >
                <ShoppingBag size={18} />
                Passer commande
              </button>

              {/* Secondary — add to cart only */}
              <button
                className={`${styles.addBtn} ${inCart ? styles.addBtnIn : ''}`}
                onClick={handleAddToCart}
                disabled={!inStockBool}
              >
                {inCart ? 'Ajouté au panier ✓' : 'Ajouter au panier'}
              </button>

              <button
                className={`${styles.wishBtn} ${wishlisted ? styles.wishBtnActive : ''}`}
                onClick={handleWishlist}
              >
                <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
                {wishlisted ? 'Retiré des favoris' : 'Ajouter aux favoris'}
              </button>
            </div>

            {/* Trust badges */}
            <div className={styles.trustRow}>
              <div className={styles.trustItem}>
                <Truck size={16} className={styles.trustIcon} />
                <div>
                  <p className={styles.trustTitle}>Livraison Gratuite</p>
                  <p className={styles.trustSub}>Partout en Tunisie</p>
                </div>
              </div>
              <div className={styles.trustItem}>
                <RotateCcw size={16} className={styles.trustIcon} />
                <div>
                  <p className={styles.trustTitle}>Retours 30 jours</p>
                  <p className={styles.trustSub}>Satisfaction garantie</p>
                </div>
              </div>
              <div className={styles.trustItem}>
                <ShieldCheck size={16} className={styles.trustIcon} />
                <div>
                  <p className={styles.trustTitle}>Paiement Sécurisé</p>
                  <p className={styles.trustSub}>Livraison à domicile</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════ PRODUCT HIGHLIGHTS STRIP ══════════ */}
        <div className={styles.highlightStrip}>
          <div className={styles.highlightItem}>
            <div className={styles.highlightIcon}><Sun size={22} /></div>
            <p className={styles.highlightLabel}>Protection UV400</p>
          </div>
          <div className={styles.highlightItem}>
            <div className={styles.highlightIcon}><Eye size={22} /></div>
            <p className={styles.highlightLabel}>Lentilles Polarisées</p>
          </div>
          <div className={styles.highlightItem}>
            <div className={styles.highlightIcon}><Zap size={22} /></div>
            <p className={styles.highlightLabel}>Anti-Reflets HD</p>
          </div>
          <div className={styles.highlightItem}>
            <div className={styles.highlightIcon}><ShieldCheck size={22} /></div>
            <p className={styles.highlightLabel}>Anti-Rayures</p>
          </div>
          <div className={styles.highlightItem}>
            <div className={styles.highlightIcon}><Truck size={22} /></div>
            <p className={styles.highlightLabel}>Livraison Gratuite</p>
          </div>
        </div>

        {/* ══════════ DESCRIPTION + SPECS ══════════ */}
        {(product.description || specEntries.length > 0) && (
          <div className={styles.detailsSection}>
            {product.description && (
              <div className={styles.descCard}>
                <h2 className={styles.sectionTitle}>À propos de ce produit</h2>
                <p className={styles.descText}>{product.description}</p>
              </div>
            )}
            {specEntries.length > 0 && (
              <div className={styles.specsCard}>
                <h2 className={styles.sectionTitle}>Caractéristiques techniques</h2>
                <table className={styles.specsTable}>
                  <tbody>
                    {specEntries.map(([key, val]) => (
                      <tr key={key} className={styles.specRow}>
                        <td className={styles.specKey}>{key}</td>
                        <td className={styles.specVal}>{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════ RELATED PRODUCTS ══════════ */}
        {related.length > 0 && (
          <div className={styles.relatedSection}>
            <h2 className={styles.sectionTitle}>Vous aimerez aussi</h2>
            <div className={styles.relatedGrid}>
              {related.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}

        {/* ══════════ MOBILE STICKY BOTTOM CTA ══════════ */}
        {/* Hidden on desktop (CSS), replaces actions on mobile */}
        <div className={styles.mobileCta}>
          <div className={styles.mobilePriceBlock}>
            <span className={styles.mobilePriceLabel}>Prix</span>
            {hasDiscount ? (
              <>
                <span className={styles.mobilePriceVal}>{formatTND(discountedPrice)}</span>
                <span className={styles.mobileOrigPrice}>{formatTND(product.price)}</span>
              </>
            ) : (
              <span className={styles.mobilePriceValNormal}>{formatTND(product.price)}</span>
            )}
          </div>
          <button
            className={styles.mobileBuyBtn}
            onClick={handleBuyNow}
            disabled={!inStockBool}
          >
            <ShoppingBag size={16} />
            {inStockBool ? 'Passer commande' : 'Rupture de stock'}
          </button>
        </div>

      </div>
    </div>
  );
}
