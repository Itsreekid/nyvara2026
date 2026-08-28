'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, ShoppingBag, Package } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import CartItem from './CartItem';
import OrderSummary from './OrderSummary';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslation } from '@/locales/dictionary';
import styles from './CartDrawer.module.css';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, itemCount, clearCart } = useCart();
  const router = useRouter();
  const { language } = useLanguage();
  const t = (path: string) => getTranslation(language, path);
  const [lastOrder, setLastOrder] = useState<string | null>(null);

  // Lock body scroll when open and check for last order
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setLastOrder(localStorage.getItem('nyvara_last_order'));
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleGoToCheckout = () => {
    onClose();
    router.push('/cart?checkout=true');
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className={styles.backdrop}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <aside
        className={`${styles.drawer} ${isOpen ? styles.open : ''}`}
        aria-label="Panier"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <ShoppingBag size={18} />
            <span className={styles.title}>
              {t('cart.title')}
              {itemCount > 0 && <span className={styles.count}>({itemCount})</span>}
            </span>
          </div>
          <div className={styles.headerActions}>
            {items.length > 0 && (
              <button className={styles.clearBtn} onClick={clearCart}>
                {language === 'fr' ? 'Tout vider' : 'إفراغ الكل'}
              </button>
            )}
            <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer le panier">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {lastOrder && (
            <div className={styles.trackingBanner}>
              <div className={styles.trackingInfo}>
                <Package size={16} />
                <span>{language === 'fr' ? 'Suivi de commande' : 'تتبع الطلبية'}</span>
              </div>
              <Link href={`/track/${lastOrder}`} onClick={onClose} className={styles.trackingLink}>
                {language === 'fr' ? 'Suivre →' : 'تتبع →'}
              </Link>
            </div>
          )}

          {items.length === 0 ? (
            <div className={styles.empty}>
              <ShoppingBag size={48} className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>{t('cart.empty')}</p>
              <p className={styles.emptyText}>{language === 'fr' ? 'Ajoutez des lunettes pour commencer vos achats.' : 'زيد نظارات باش تبدا تشري.'}</p>
              <Link href="/shop" onClick={onClose}>
                <Button variant="primary" size="md">{t('shop.title')}</Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Items list */}
              <div className={styles.items}>
                {items.map(item => (
                  <CartItem key={item.product.id + (item.selected_color?.id || '')} item={item} />
                ))}
              </div>

              {/* Divider */}
              <div className={styles.divider} />

              {/* Order Summary */}
              <div className={styles.summary}>
                <OrderSummary onCheckoutTap={handleGoToCheckout} />
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
