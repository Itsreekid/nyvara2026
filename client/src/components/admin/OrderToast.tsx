'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import type { Order } from '@/types';
import styles from './OrderToast.module.css';

interface OrderToastProps {
  order: Order | null;
  onClose: () => void;
}

export default function OrderToast({ order, onClose }: OrderToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!order) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 400); // wait for slide-out animation
    }, 6000);
    return () => clearTimeout(t);
  }, [order, onClose]);

  if (!order) return null;

  return (
    <div className={`${styles.toast} ${visible ? styles.show : styles.hide}`}>
      <div className={styles.iconWrap}>
        <ShoppingBag size={22} />
      </div>
      <div className={styles.body}>
        <div className={styles.title}>🎉 Nouvelle commande !</div>
        <div className={styles.name}>{order.customer_name}</div>
        <div className={styles.meta}>
          {order.city} · {Number(order.total_price || 0).toFixed(3)} TND
        </div>
      </div>
      <button className={styles.close} onClick={() => { setVisible(false); setTimeout(onClose, 400); }}>
        <X size={14} />
      </button>
    </div>
  );
}
