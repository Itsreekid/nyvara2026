'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Hourglass, CheckCircle2, Package, Truck, Home } from 'lucide-react';
import Link from 'next/link';
import styles from './TrackOrder.module.css';

interface OrderData {
  id: string;
  customer_name: string;
  cosmos_status: string;
  cosmos_barcode: string | null;
}

// 5 Stages Definition
const STAGES = [
  { id: 'stage-1', label: 'En attente',    icon: Hourglass,    desc: 'Nous allons vous appeler pour confirmer votre commande avant de la traiter.' },
  { id: 'stage-2', label: 'Confirmée',     icon: CheckCircle2, desc: 'Commande confirmée. Envoi en cours vers notre centre logistique.' },
  { id: 'stage-3', label: 'En préparation',icon: Package,      desc: 'Votre commande est en cours d\'emballage et de préparation.' },
  { id: 'stage-4', label: 'Expédiée',      icon: Truck,        desc: 'Votre commande a quitté notre entrepôt et est en route.' },
  { id: 'stage-5', label: 'Livrée',        icon: Home,         desc: 'Votre commande a été livrée avec succès à votre adresse.' },
];

export default function TrackOrderPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name, cosmos_status, cosmos_barcode')
        .eq('id', orderId)
        .single();

      if (error || !data) {
        setError('Commande introuvable.');
      } else {
        setOrder(data);
      }
      setLoading(false);
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.inner} style={{ textAlign: 'center' }}>
          Chargement des informations de suivi...
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.page}>
        <div className={styles.inner} style={{ textAlign: 'center' }}>
          <h1 className={styles.title}>Erreur</h1>
          <p className={styles.orderInfo}>{error}</p>
          <Link href="/shop" className={styles.returnBtn}>Retour à la boutique</Link>
        </div>
      </div>
    );
  }

  // Determine Current Stage Level (1 to 5)
  let currentLevel = 1;
  const status = order.cosmos_status || 'pending';
  const hasBarcode = !!order.cosmos_barcode;

  if (status === 'delivered' || status === 'Livré') {
    currentLevel = 5;
  } else if (status === 'in-delivery' || status === 'shipped' || status === 'Tentative 1' || status === 'Tentative 2') {
    currentLevel = 4;
  } else if (status === 'packed' || status === 'in-depot' || status === 'to-be-picked' || status === 'Au dépôt' || status === 'Emballé') {
    currentLevel = 3;
  } else if (hasBarcode && (status === 'pending' || status === 'En attente')) {
    // If it has a barcode, it means it was sent to Cosmos, so it's at least level 2 (Confirmée)
    currentLevel = 2;
  } else {
    // 'pending' and no barcode means it is awaiting admin phone confirmation
    currentLevel = 1;
  }

  // Calculate percentage for the progress line fill
  // 5 stages = 4 segments. If level = 1, fill is 0%. If level = 3, fill is 50% (2 segments out of 4).
  const fillPercentage = ((currentLevel - 1) / (STAGES.length - 1)) * 100;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Suivi de commande</h1>
        
        <div className={styles.orderInfo}>
          Numéro de suivi : <strong>{order.cosmos_barcode || `NYV-${order.id.slice(0, 8).toUpperCase()}`}</strong><br/>
          Affiché pour : <strong>{order.customer_name}</strong>
        </div>

        <div className={styles.trackContainer}>
          {/* Progress Visuals */}
          <div className={styles.progressWrapper} style={{ '--fill-percent': `${fillPercentage}%` } as React.CSSProperties}>
            {/* Desktop Horizontal Line / Mobile Vertical Line */}
            <div className={styles.progressLineBg} />
            <div className={styles.progressLineFill} />

            {/* Stages */}
            {STAGES.map((stage, index) => {
              const level = index + 1;
              const isCompleted = level < currentLevel;
              const isActive = level === currentLevel;
              const Icon = stage.icon;
              
              return (
                <div 
                  key={stage.id} 
                  className={`${styles.stage} ${isCompleted ? styles.completed : ''} ${isActive ? styles.active : ''}`}
                >
                  <div className={styles.dot}>
                    <Icon size={20} strokeWidth={isActive || isCompleted ? 2.5 : 2} />
                  </div>
                  <div className={styles.stageText}>{stage.label}</div>
                </div>
              );
            })}
          </div>

          {/* Status Details */}
          <div className={styles.statusMessage}>
            <div className={styles.statusLabel}>État actuel :</div>
            <h2 className={styles.statusTitle}>{STAGES[currentLevel - 1].label}</h2>
            <p className={styles.statusDesc}>
              <strong>Description :</strong> {STAGES[currentLevel - 1].desc}
            </p>
          </div>
        </div>

        <div className={styles.actionRow}>
          <Link href="/shop" className={styles.returnBtn}>
            Retour à la boutique
          </Link>
        </div>
      </div>
    </div>
  );
}
