'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShoppingBag, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import CartItem from '@/components/cart/CartItem';
import OrderSummary from '@/components/cart/OrderSummary';
import CheckoutForm from '@/components/cart/CheckoutForm';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslation } from '@/locales/dictionary';
import styles from './cart.module.css';

function CartContent() {
  const searchParams = useSearchParams();
  const { items, itemCount, clearCart } = useCart();
  const { language } = useLanguage();
  const t = (path: string) => getTranslation(language, path);
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');

  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('checkout') === 'true' && items.length > 0) {
      setStep('checkout');
    }
  }, [searchParams, items.length]);

  if (step === 'success') {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.empty}>
            <div className={styles.successIcon}>
              <CheckCircle2 size={80} color="var(--color-gold)" />
            </div>
            <h1 className={styles.emptyTitle}>{t('checkout.successTitle')}</h1>
            <p className={styles.emptyText}>
              {t('checkout.successDesc')}
            </p>
            <div style={{ display: 'flex', gap: '16px', marginTop: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/shop">
                <Button variant="gold" size="lg">{t('checkout.continueShopping')}</Button>
              </Link>
              {orderId && (
                <Link href={`/track/${orderId}`}>
                  <Button variant="primary" size="lg">{t('checkout.trackOrder')}</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            {step === 'checkout' && (
              <button onClick={() => setStep('cart')} className={styles.backBtn} aria-label="Retour au panier">
                <ArrowLeft size={24} />
              </button>
            )}
            <ShoppingBag size={28} />
            {step === 'cart' ? t('checkout.cartTitle') : t('checkout.finalizeTitle')}
            {step === 'cart' && itemCount > 0 && <span className={styles.count}>{itemCount} {t('checkout.itemsCount')}</span>}
          </h1>
          {items.length > 0 && step === 'cart' && (
            <button className={styles.clearBtn} onClick={clearCart}>
              {language === 'fr' ? 'Vider le panier' : 'إفراغ السلة'}
            </button>
          )}
        </div>

        {items.length === 0 ? (
          /* ── Empty state ── */
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <ShoppingBag size={56} />
            </div>
            <h2 className={styles.emptyTitle}>{t('checkout.emptyTitle')}</h2>
            <p className={styles.emptyText}>
              {t('checkout.emptyDesc')}
            </p>
            <Link href="/shop">
              <Button variant="primary" size="lg">{t('checkout.startShopping')}</Button>
            </Link>
          </div>
        ) : (
          /* ── Cart content ── */
          <div className={styles.content}>
            {/* Left Column: Items or Checkout Form */}
            <div className={styles.items}>
              {step === 'cart' ? (
                <>
                  <div className={styles.itemsHeader}>
                    <span>{t('checkout.itemHeader')}</span>
                    <span>{t('checkout.qtyHeader')}</span>
                  </div>
                  {items.map(item => (
                    <CartItem key={`${item.product.id}-${item.selected_color?.id ?? 'no-color'}`} item={item} />
                  ))}
                  <div className={styles.continueShopping}>
                    <Link href="/shop" className={styles.continueLink}>
                      {language === 'fr' ? '← Continuer vos achats' : '← كمل تسوق'}
                    </Link>
                  </div>
                </>
              ) : (
                <CheckoutForm onSuccess={(id) => {
                  setOrderId(id);
                  setStep('success');
                  localStorage.setItem('nyvara_last_order', id);
                }} />
              )}
            </div>

            {/* Right Column: Summary sticky panel */}
            <div className={styles.summaryPanel}>
              <h2 className={styles.summaryTitle}>{t('checkout.summaryTitle')}</h2>
              <OrderSummary 
                onCheckoutTap={() => setStep('checkout')} 
                showCheckoutBtn={step === 'cart'}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<div className={styles.page}><div className={styles.inner}>Chargement...</div></div>}>
      <CartContent />
    </Suspense>
  );
}
