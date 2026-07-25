'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Order } from '@/types';
import adminStyles from './admin.module.css';
import styles from './dashboard.module.css';

const safeDateParse = (d: string | null | undefined): Date => {
  if (!d) return new Date(NaN);
  return new Date(d.replace(' ', 'T'));
};

const safeFormatDate = (d: string | null | undefined): string => {
  const date = safeDateParse(d);
  if (isNaN(date.getTime())) return 'Date invalide';
  return date.toLocaleDateString('fr-FR');
};

const DELIVERED_STATUSES = ['delivered', 'Livré'];
const RETURNED_STATUSES  = ['final-return', 'received-return', 'return-stock', 'Retourné'];
const TARIF_LIVRE        = 8;
const TARIF_RETOUR       = 3;

interface OrderWithItems extends Order {
  order_items: {
    quantity: number;
    products: { cost_price: number | null } | null;
  }[];
}

export default function AdminDashboardPage() {
  const [orders, setOrders]     = useState<OrderWithItems[]>([]);
  const [loading, setLoading]   = useState(true);

  // Weekly ads cost — persisted in localStorage
  const [adsInput, setAdsInput]   = useState('');
  const [adsCost, setAdsCost]     = useState(0);
  const [adsEditing, setAdsEditing] = useState(false);

  // Load saved ads cost on mount
  useEffect(() => {
    const saved = localStorage.getItem('nyvara_ads_cost_week');
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val)) { setAdsCost(val); setAdsInput(saved); }
    }
  }, []);

  const saveAdsCost = () => {
    const val = parseFloat(adsInput);
    const final = isNaN(val) ? 0 : val;
    setAdsCost(final);
    localStorage.setItem('nyvara_ads_cost_week', String(final));
    setAdsEditing(false);
  };

  useEffect(() => {
    // Limit to last 500 orders — fetching all rows with nested joins
    // on every mount is a major CPU/RAM bottleneck.
    supabase
      .from('orders')
      .select(`*, order_items ( quantity, products ( cost_price ) )`)
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (data) setOrders(data as OrderWithItems[]);
        setLoading(false);
      });
  }, []);

  // ── Metrics ──────────────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ordersToday  = orders.filter(o => safeDateParse(o.created_at).getTime() >= today.getTime());
  const revenueToday = ordersToday.reduce((s, o) => s + (o.total_price ?? 0), 0);

  const deliveredOrders = orders.filter(o => DELIVERED_STATUSES.includes(o.cosmos_status ?? ''));
  const returnedOrders  = orders.filter(o => RETURNED_STATUSES.includes(o.cosmos_status ?? ''));

  const grossRevenue = deliveredOrders.reduce((s, o) => s + (o.total_price ?? 0), 0);

  const totalCOGS = deliveredOrders.reduce((sum, order) => {
    return sum + (order.order_items ?? []).reduce((s, item) => {
      return s + (item.products?.cost_price ?? 0) * (item.quantity ?? 1);
    }, 0);
  }, 0);

  const deliveryFees = deliveredOrders.length * TARIF_LIVRE;
  const returnFees   = returnedOrders.length  * TARIF_RETOUR;
  const totalFees    = deliveryFees + returnFees;

  const netRevenue      = grossRevenue - totalCOGS - totalFees;
  const netAfterAds     = netRevenue - adsCost;

  if (loading) return <div className={adminStyles.contentArea}>Chargement...</div>;

  return (
    <div>
      <div className={adminStyles.pageHeader}>
        <h1 className={adminStyles.pageTitle}>Aperçu de la progression</h1>
      </div>

      {/* ── Top Cards ── */}
      <div className={styles.dashboardGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Commandes d&apos;aujourd&apos;hui</div>
          <div className={styles.metricValue}>{revenueToday.toFixed(3)} TND</div>
          <div className={styles.metricSub}>{ordersToday.length} Commandes</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Toutes les commandes</div>
          <div className={styles.metricValue}>{orders.length}</div>
          <div className={styles.metricSub}>Historique complet</div>
        </div>
        <div className={`${styles.metricCard} ${styles.accent}`}>
          <div className={styles.metricTitle}>Revenu Brut (Livrés)</div>
          <div className={styles.metricValue}>{grossRevenue.toFixed(3)} TND</div>
          <div className={styles.metricSub}>{deliveredOrders.length} livrés · {returnedOrders.length} retournés</div>
        </div>
      </div>

      {/* ── Revenue Calculator ── */}
      <div className={styles.calcSection}>
        <h2 className={styles.sectionTitle}>💰 Calculateur de Revenu Net</h2>

        <div className={styles.calcGrid}>

          {/* Left: Tariffs + Ads cost */}
          <div className={styles.tariffCard}>
            <div className={styles.tariffTitle}>Calcul des Tarifs Expéditeur</div>
            <div className={styles.tariffRow}>
              <span>Tarif par Livré</span>
              <span className={styles.tariffVal}>{TARIF_LIVRE.toFixed(2)} DT</span>
            </div>
            <div className={styles.tariffRow}>
              <span>Tarif par Retourné</span>
              <span className={styles.tariffVal}>{TARIF_RETOUR.toFixed(2)} DT</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.tariffRow}>
              <span>Commandes livrées</span>
              <span>{deliveredOrders.length}</span>
            </div>
            <div className={styles.tariffRow}>
              <span>Commandes retournées</span>
              <span>{returnedOrders.length}</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.tariffRow}>
              <span>Frais livraisons</span>
              <span className={styles.negative}>−{deliveryFees.toFixed(3)} TND</span>
            </div>
            <div className={styles.tariffRow}>
              <span>Frais retours</span>
              <span className={styles.negative}>−{returnFees.toFixed(3)} TND</span>
            </div>
            <div className={`${styles.tariffRow} ${styles.tariffTotal}`}>
              <span>Total frais Cosmos</span>
              <span className={styles.negative}>−{totalFees.toFixed(3)} TND</span>
            </div>

            {/* ── Ads Cost Block ── */}
            <div className={styles.divider} />
            <div className={styles.adsBlock}>
              <div className={styles.tariffTitle}>📢 Coût Publicités</div>
              <div className={styles.tariffRow}>
                <span>Budget ads (semaine)</span>
                {adsEditing ? (
                  <div className={styles.adsInputRow}>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      className={styles.adsInput}
                      value={adsInput}
                      onChange={e => setAdsInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveAdsCost()}
                      autoFocus
                    />
                    <button className={styles.adsSaveBtn} onClick={saveAdsCost}>✓</button>
                  </div>
                ) : (
                  <button className={styles.adsEditBtn} onClick={() => setAdsEditing(true)}>
                    {adsCost > 0 ? `−${adsCost.toFixed(3)} TND` : '+ Ajouter'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: Full breakdown */}
          <div className={styles.breakdownCard}>
            <div className={styles.tariffTitle}>Détail du Revenu Net</div>

            <div className={styles.calcRow}>
              <span>Revenu brut (ventes livrées)</span>
              <span className={styles.positive}>+{grossRevenue.toFixed(3)} TND</span>
            </div>
            <div className={styles.calcRow}>
              <span>Coût d&apos;achat produits</span>
              <span className={styles.negative}>−{totalCOGS.toFixed(3)} TND</span>
            </div>
            <div className={styles.calcRow}>
              <span>Frais Cosmos (livraisons)</span>
              <span className={styles.negative}>−{deliveryFees.toFixed(3)} TND</span>
            </div>
            <div className={styles.calcRow}>
              <span>Frais Cosmos (retours)</span>
              <span className={styles.negative}>−{returnFees.toFixed(3)} TND</span>
            </div>
            <div className={styles.calcRow}>
              <span>Coût publicités (semaine)</span>
              <span className={adsCost > 0 ? styles.negative : styles.noCostDash}>
                {adsCost > 0 ? `−${adsCost.toFixed(3)} TND` : '—'}
              </span>
            </div>

            <div className={styles.divider} />

            <div className={styles.netRow}>
              <span>Revenu Net (avant ads)</span>
              <span className={netRevenue >= 0 ? styles.netPositive : styles.netNegative}>
                {netRevenue >= 0 ? '+' : ''}{netRevenue.toFixed(3)} TND
              </span>
            </div>

            <div className={`${styles.netRow} ${styles.netFinalRow}`}>
              <span>🎯 Revenu Net Final</span>
              <span className={netAfterAds >= 0 ? styles.netPositive : styles.netNegative}>
                {netAfterAds >= 0 ? '+' : ''}{netAfterAds.toFixed(3)} TND
              </span>
            </div>

            <div className={styles.calcHint}>
              Formule : Ventes livrées − Coût achat − ({TARIF_LIVRE} DT × livrés) − ({TARIF_RETOUR} DT × retournés) − Budget ads
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Orders ── */}
      <div className={styles.chartSection}>
        <h2 className={styles.sectionTitle}>Dernières Commandes</h2>
        <div className={adminStyles.tableContainer}>
          <div className={adminStyles.tableScrollWrapper}>
          <table className={adminStyles.table}>
            <thead>
              <tr>
                <th>ID</th><th>Client</th><th>Date</th><th>Total</th><th>Statut livraison</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map(order => (
                <tr key={order.id}>
                  <td>#{order.id.slice(0, 8)}</td>
                  <td>{order.customer_name}</td>
                  <td>{safeFormatDate(order.created_at)}</td>
                  <td>{order.total_price?.toFixed(3)} TND</td>
                  <td>
                    <span className={`${adminStyles.statusBadge} ${adminStyles.statusPending}`}>
                      {order.cosmos_status || 'En attente'}
                    </span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center' }}>Aucune commande pour le moment.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
