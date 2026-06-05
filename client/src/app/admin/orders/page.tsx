'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { ShoppingBag, Archive, ArchiveRestore, CheckSquare, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import OrderDetailsDrawer from '@/components/admin/OrderDetailsDrawer';
import StatusDropdown from '@/components/admin/StatusDropdown';
import type { Order, ColorOption } from '@/types';
import adminStyles from '../admin.module.css';
import styles from './orders.module.css';

const AUTO_SYNC_INTERVAL = 2 * 60 * 1000;

const DELIVERY_STATUS: Record<string, { label: string; cls: string }> = {
  pending:              { label: 'En attente',    cls: 'pending'    },
  'to-be-picked':       { label: 'À ramasser',    cls: 'picking'    },
  'in-depot':           { label: 'Au dépôt',      cls: 'depot'      },
  'in-delivery':        { label: 'En livraison',  cls: 'delivering' },
  'to-be-verified':     { label: 'À vérifier',    cls: 'verify'     },
  'return-stock':       { label: 'Retour dépôt',  cls: 'returned'   },
  delivered:            { label: 'Livré ✓',       cls: 'delivered'  },
  'final-return':       { label: 'Retour final',  cls: 'returned'   },
  'received-return':    { label: 'Retour reçu',   cls: 'returned'   },
  'in-transfer':        { label: 'Inter-dépôt',   cls: 'transit'    },
  'return-in-transfer': { label: 'Inter-retour',  cls: 'returned'   },
};

interface OrderItem {
  id: string;
  quantity: number;
  quantity_break_price: number | null;
  selected_color_name: string | null;
  products: { title: string; price: number | null; discount: number | null; image_url: string | null; color_options: ColorOption[] | null } | null;
}

interface OrderWithItems extends Order {
  order_items: OrderItem[];
  archived: boolean;
  call_status: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders]       = useState<OrderWithItems[]>([]);
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [lastSync, setLastSync]   = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(AUTO_SYNC_INTERVAL / 1000);
  const ordersRef                 = useRef<OrderWithItems[]>([]);

  // Tabs: active vs archived
  const [viewArchived, setViewArchived] = useState(false);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Items modal
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);

  // Pagination
  const [page, setPage]             = useState(0);
  const [pageSize, setPageSize]     = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // ── Update call status ────────────────────────────────────────────────────
  const updateCallStatus = async (orderId: string, newStatus: string) => {
    await supabase.from('orders').update({ call_status: newStatus }).eq('id', orderId);
    setOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, call_status: newStatus } : o)
    );
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    const from = page * pageSize;
    const to   = from + pageSize - 1;
    const { data, count } = await supabase
      .from('orders')
      .select('*, order_items(id, quantity, selected_color_name, quantity_break_price, products(title, price, discount, image_url, color_options))', { count: 'exact' })
      .eq('archived', viewArchived)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (data)  { setOrders(data as OrderWithItems[]); ordersRef.current = data as OrderWithItems[]; }
    if (count !== null) setTotalCount(count);
    setSelected(new Set());
    setLoading(false);
  }, [viewArchived, page, pageSize]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Auto-sync ──────────────────────────────────────────────────────────────
  const syncDeliveryStatus = useCallback(async (silent = false) => {
    if (!silent) setSyncing(true);
    const barcodes = ordersRef.current
      .filter(o => o.cosmos_barcode)
      .map(o => o.cosmos_barcode!)
      .join(',');
    if (!barcodes) { setSyncing(false); return; }
    try {
      const res  = await fetch(`/api/cosmos/orders?barcode=${barcodes}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.data)) {
        await Promise.all(
          (data.data as { id: string; status: string }[]).map(d =>
            supabase.from('orders').update({ cosmos_status: d.status }).eq('cosmos_barcode', d.id)
          )
        );
        await fetchOrders();
        setLastSync(new Date());
        setCountdown(AUTO_SYNC_INTERVAL / 1000);
      }
    } catch (err) { console.error('[AutoSync] Failed:', err); }
    if (!silent) setSyncing(false);
  }, [fetchOrders]);

  useEffect(() => {
    const ticker = setInterval(() => setCountdown(p => p <= 1 ? AUTO_SYNC_INTERVAL / 1000 : p - 1), 1000);
    const syncer = setInterval(() => syncDeliveryStatus(true), AUTO_SYNC_INTERVAL);
    return () => { clearInterval(ticker); clearInterval(syncer); };
  }, [syncDeliveryStatus]);

  // ── Confirm & dispatch ─────────────────────────────────────────────────────
  const confirmOrderAndDispatch = async (order: OrderWithItems) => {
    if (!confirm("Confirmer cette commande et l'envoyer à Cosmos ?")) return;
    setSyncing(true);
    try {
      const quantity = (order.order_items ?? []).reduce((s, i) => s + (i.quantity || 1), 0);
      const cosmosRes = await fetch('/api/cosmos/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: order.customer_name, phone: order.phone,
          city: order.city, total_price: order.total_price, quantity, order_id: order.id,
        }),
      });
      if (cosmosRes.ok) {
        const { data: delivery } = await cosmosRes.json();
        await supabase.from('orders').update({
          cosmos_barcode: delivery.barcode, cosmos_label_url: delivery.labelUrl,
          cosmos_label_pdf_url: delivery.labelPdfUrl, cosmos_status: delivery.status || 'to-be-picked',
        }).eq('id', order.id);
        await fetchOrders();
      } else { alert('Erreur Cosmos: ' + await cosmosRes.text()); }
    } catch (err: any) { alert('Erreur: ' + err.message); }
    setSyncing(false);
  };

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === orders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map(o => o.id)));
    }
  };

  // ── Archive / Unarchive ────────────────────────────────────────────────────
  const archiveSelected = async () => {
    const ids   = Array.from(selected);
    const label = viewArchived ? 'désarchiver' : 'archiver';
    if (!confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} ${ids.length} commande(s) ?`)) return;

    await supabase
      .from('orders')
      .update({ archived: !viewArchived })
      .in('id', ids);

    await fetchOrders();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return <div className={adminStyles.contentArea}>Chargement...</div>;

  const allSelected = orders.length > 0 && selected.size === orders.length;
  const someSelected = selected.size > 0;

  const items      = selectedOrder?.order_items ?? [];
  const itemsTotal = items.reduce((s, i) => {
    const p = i.products;
    const unitPrice = i.quantity_break_price ?? (p?.discount != null && p.discount > 0
      ? (p.price ?? 0) * (1 - p.discount / 100)
      : (p?.price ?? 0));
    return s + unitPrice * i.quantity;
  }, 0);

  return (
    <div>
      {/* ── Header ── */}
      <div className={adminStyles.pageHeader}>
        <h1 className={adminStyles.pageTitle}>Commandes</h1>
        <div className={styles.syncArea}>
          {lastSync && (
            <span className={styles.syncMeta}>
              Dernière sync : {lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              &nbsp;·&nbsp;prochaine dans <strong>{countdown}s</strong>
            </span>
          )}
          {!viewArchived && (
            <button className={styles.syncBtn} onClick={() => syncDeliveryStatus(false)} disabled={syncing}>
              {syncing ? '⟳ Synchronisation...' : '⟳ Actualiser maintenant'}
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${!viewArchived ? styles.tabActive : ''}`}
          onClick={() => { setPage(0); setViewArchived(false); setLoading(true); }}
        >
          Actives
        </button>
        <button
          className={`${styles.tab} ${viewArchived ? styles.tabActive : ''}`}
          onClick={() => { setPage(0); setViewArchived(true); setLoading(true); }}
        >
          <Archive size={14} />
          Archives
        </button>
      </div>

      {/* ── Bulk action bar ── */}
      {someSelected && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkCount}>
            <CheckSquare size={16} />
            {selected.size} sélectionnée{selected.size > 1 ? 's' : ''}
          </span>
          <button className={styles.archiveBtn} onClick={archiveSelected}>
            {viewArchived
              ? <><ArchiveRestore size={15} /> Désarchiver</>
              : <><Archive size={15} /> Archiver</>
            }
          </button>
          <button className={styles.clearBtn} onClick={() => setSelected(new Set())}>
            Annuler
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className={adminStyles.tableContainer}>
        <div className={adminStyles.tableScrollWrapper}>
          <table className={adminStyles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxCol}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    title="Tout sélectionner"
                  />
                </th>
                <th>ID</th>
                <th>Client</th>
                <th>Téléphone</th>
                <th>Statut</th>
                <th>Produits</th>
                <th>Total</th>
                <th>Livraison</th>
                {!viewArchived && <th>Étiquette</th>}
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const delivery  = DELIVERY_STATUS[order.cosmos_status ?? ''];
                const itemCount = order.order_items?.length ?? 0;
                const isChecked = selected.has(order.id);

                return (
                  <tr
                    key={order.id}
                    className={isChecked ? styles.rowSelected : ''}
                  >
                    <td className={styles.checkboxCol}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isChecked}
                        onChange={() => toggleSelect(order.id)}
                      />
                    </td>
                    <td>#{order.id.slice(0, 8)}</td>
                    <td>{order.customer_name}</td>
                    <td>{order.phone}</td>
                    <td>
                      <StatusDropdown
                        value={order.call_status ?? 'pending'}
                        onChange={newStatus => updateCallStatus(order.id, newStatus)}
                      />
                    </td>
                    <td>
                      <button className={styles.itemsBtn} onClick={() => setSelectedOrder(order)}>
                        <ShoppingBag size={14} />
                        <span>{itemCount} article{itemCount !== 1 ? 's' : ''}</span>
                      </button>
                    </td>
                    <td>{order.total_price?.toFixed(3)} TND</td>
                    <td>
                      {order.cosmos_barcode ? (
                        <span className={`${styles.deliveryBadge} ${styles[delivery?.cls ?? 'pending']}`}>
                          {delivery?.label ?? order.cosmos_status ?? 'En attente'}
                        </span>
                      ) : (
                        order.cosmos_status === 'pending' ? (
                          <button
                            className={`${styles.deliveryBadge} ${styles.pending}`}
                            onClick={() => confirmOrderAndDispatch(order)}
                            disabled={syncing || viewArchived}
                            style={{ cursor: 'pointer', border: '1px solid var(--color-gold)' }}
                          >
                            Confirmer
                          </button>
                        ) : (
                          <span className={`${styles.deliveryBadge} ${styles.noShipment}`}>Non envoyé</span>
                        )
                      )}
                    </td>
                    {!viewArchived && (
                      <td>
                        {order.cosmos_barcode ? (
                          <div className={styles.labelBtns}>
                            <a href={`/api/cosmos/labels?barcode=${order.cosmos_barcode}&format=pdf`} target="_blank" rel="noopener noreferrer" className={styles.labelBtn}>🖨 PDF</a>
                            <a href={`/api/cosmos/labels?barcode=${order.cosmos_barcode}&format=html`} target="_blank" rel="noopener noreferrer" className={`${styles.labelBtn} ${styles.labelBtnHtml}`}>🌐 HTML</a>
                          </div>
                        ) : (
                          <span className={styles.noLabel}>—</span>
                        )}
                      </td>
                    )}
                    <td>
                      <button 
                        className={styles.eyeBtn} 
                        onClick={() => setSelectedOrder(order)}
                        title="Voir les détails"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={viewArchived ? 9 : 10} style={{ textAlign: 'center', padding: '32px' }}>
                    {viewArchived ? 'Aucune commande archivée.' : 'Aucune commande pour le moment.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination footer ── */}
        <div className={styles.paginationBar}>
          <div className={styles.rowsPerPage}>
            <span>Lignes par page :</span>
            <select
              className={styles.pageSizeSelect}
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className={styles.pageNav}>
            <button
              className={styles.pageArrow}
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0}
              aria-label="Page précédente"
            >&#8592;</button>
            <span className={styles.pageCurrent}>{page + 1}</span>
            <button
              className={styles.pageArrow}
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * pageSize >= totalCount}
              aria-label="Page suivante"
            >&#8594;</button>
          </div>
        </div>

      </div>

      {/* ── Order Details Drawer ── */}
      <OrderDetailsDrawer
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
      />
    </div>
  );
}
