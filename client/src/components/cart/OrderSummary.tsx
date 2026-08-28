'use client';

import { useCart } from '@/context/CartContext';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslation } from '@/locales/dictionary';
import styles from './OrderSummary.module.css';

const formatTND = (amount: number) =>
  `${amount.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`;

interface OrderSummaryProps {
  onCheckoutTap?: () => void;
  showCheckoutBtn?: boolean;
}

export default function OrderSummary({ onCheckoutTap, showCheckoutBtn = true }: OrderSummaryProps) {
  const { items, total } = useCart();
  const { language } = useLanguage();
  const t = (path: string) => getTranslation(language, path);

  return (
    <div className={styles.summary}>
      <div className={styles.row}>
        <span className={styles.label}>{t('cart.subtotal')}</span>
        <span>{formatTND(total)}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>{t('cart.shipping')}</span>
        <span className={styles.free}>{t('cart.freeShipping')}</span>
      </div>
      <div className={`${styles.row} ${styles.totalRow}`}>
        <span>{t('cart.total')}</span>
        <span className={styles.totalAmount}>{formatTND(total)}</span>
      </div>
      
      {showCheckoutBtn && (
        <Button
          variant="gold"
          fullWidth
          size="lg"
          disabled={items.length === 0}
          onClick={onCheckoutTap}
        >
          {t('cart.checkoutBtn')}
        </Button>
      )}
      
      <p className={styles.hint}>{language === 'fr' ? 'Prix en Dinar Tunisien (TND)' : 'السعر بالدينار التونسي (TND)'}</p>
    </div>
  );
}
