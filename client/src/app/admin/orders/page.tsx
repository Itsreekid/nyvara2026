'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { ShoppingBag, Archive, ArchiveRestore, CheckSquare, Eye, Truck } from 'lucide-react';
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

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  quantity_break_price: number | null;
  selected_color_name: string | null;
  selected_color_hex1: string | null;
  selected_color_hex2: string | null;
  products: { id: string; title: string; price: number | null; discount: number | null; image_url: string | null; color_options: ColorOption[] | null; quantity_breaks: any[] | null } | null;
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
  archived: boolean;
  call_status: string;
  customer_order_count?: number;
  customer_has_delivered?: boolean;
  customer_has_returned?: boolean;
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  // Sync selected order with latest data from table
  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find(o => o.id === selectedOrder.id);
      if (updated && updated !== selectedOrder) {
        setSelectedOrder(updated);
      }
    }
  }, [orders, selectedOrder]);

  // Pagination
  const [page, setPage]             = useState(0);
  const [pageSize, setPageSize]     = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Reset page to 0 when search query changes
  useEffect(() => {
    setPage(0);
  }, [searchQuery]);

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
          city: order.city, address: order.address, total_price: order.total_price, quantity, order_id: order.id,
          items: (order.order_items ?? []).map(i => ({
            quantity: i.quantity,
            name: i.products?.title || 'Unknown Product',
          })),
        }),
      });
      if (cosmosRes.ok) {
        const { data: delivery } = await cosmosRes.json();
        await supabase.from('orders').update({
          cosmos_barcode:      delivery.barcode,
          cosmos_label_url:    delivery.labelUrl,
          cosmos_label_pdf_url: delivery.labelPdfUrl,
          cosmos_status:       delivery.status || 'to-be-picked',
          call_status:         'confirmed',   // Set business state to confirmed on first dispatch to Cosmos
        }).eq('id', order.id);
        await fetchOrders();
      } else { alert('Erreur Cosmos: ' + await cosmosRes.text()); }
    } catch (err: any) { alert('Erreur: ' + err.message); }
    setSyncing(false);
  };

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

    let queryBuilder = supabase
      .from('orders')
      .select('*, order_items(id, product_id, quantity, selected_color_name, selected_color_hex1, selected_color_hex2, quantity_break_price, products(id, title, price, discount, image_url, color_options, quantity_breaks))', { count: 'exact' })
      .eq('archived', viewArchived);

    if (searchQuery.trim()) {
      const q = `%${searchQuery.trim()}%`;
      queryBuilder = queryBuilder.or(`customer_name.ilike.${q},phone.ilike.${q}`);
    }

    const { data, count } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(from, to);

    if (data && data.length > 0) {
      const normalizePhone = (p: string | null | undefined) => {
        if (!p) return '';
        let num = p.replace(/[^\d+]/g, '');
        if (num.startsWith('+216')) return num.slice(4);
        if (num.startsWith('00216')) return num.slice(5);
        return num;
      };

      const phonesToQuery = new Set<string>();
      data.forEach(o => {
        if (o.phone) {
          const norm = normalizePhone(o.phone);
          if (norm) {
            phonesToQuery.add(norm);
            phonesToQuery.add(`+216${norm}`);
            phonesToQuery.add(`00216${norm}`);
          }
        }
      });
      const phones = Array.from(phonesToQuery);

      if (phones.length > 0) {
        const { data: allPhoneOrders } = await supabase
          .from('orders')
          .select('phone, call_status')
          .in('phone', phones)
          .eq('archived', false);
        
        const phoneData: Record<string, { count: number; hasDelivered: boolean; hasReturned: boolean }> = {};
        if (allPhoneOrders) {
          for (const row of allPhoneOrders) {
            if (row.phone) {
              const norm = normalizePhone(row.phone);
              if (!norm) continue;
              if (!phoneData[norm]) {
                phoneData[norm] = { count: 0, hasDelivered: false, hasReturned: false };
              }
              phoneData[norm].count += 1;
              const status = row.call_status;
              if (status === 'delivered') phoneData[norm].hasDelivered = true;
              if (status === 'returned') phoneData[norm].hasReturned = true;
            }
          }
        }
        
        const enrichedData = data.map(order => {
          const norm = normalizePhone(order.phone);
          return {
            ...order,
            customer_order_count: norm ? (phoneData[norm]?.count || 1) : 1,
            customer_has_delivered: norm ? (phoneData[norm]?.hasDelivered || false) : false,
            customer_has_returned: norm ? (phoneData[norm]?.hasReturned || false) : false,
          };
        });
        
        setOrders(enrichedData as OrderWithItems[]);
        ordersRef.current = enrichedData as OrderWithItems[];
      } else {
        setOrders(data as OrderWithItems[]);
        ordersRef.current = data as OrderWithItems[];
      }
    } else {
      setOrders([]);
      ordersRef.current = [];
    }
    if (count !== null) setTotalCount(count);
    setSelected(new Set());
    setLoading(false);
  }, [viewArchived, page, pageSize, searchQuery]);

  // ── Sync active shipments (manual button + on-mount) ──────────────────────
  const syncDeliveryStatus = useCallback(async (silent = false) => {
    if (!silent) setSyncing(true);
    try {
      const res = await fetch('/api/cosmos/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.ok) {
        await fetchOrders();
        setLastSync(new Date());
      } else {
        if (!silent) console.warn('[Sync]', data.error || 'Unknown error');
      }
    } catch (err: any) {
      if (!silent) alert('Erreur: ' + err.message);
    }
    if (!silent) setSyncing(false);
  }, [fetchOrders]);

  // Trigger fetchOrders when its dependencies change
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Auto-trigger silent sync once after initial orders load ─────────────────
  const hasSyncedOnMount = useRef(false);
  useEffect(() => {
    if (!loading && !hasSyncedOnMount.current) {
      hasSyncedOnMount.current = true;
      syncDeliveryStatus(true);
    }
  }, [loading, syncDeliveryStatus]);


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
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className={styles.syncBtn} onClick={() => syncDeliveryStatus(false)} disabled={syncing}>
                {syncing ? '⟳ Synchronisation...' : '⟳ Actualiser maintenant'}
              </button>
              <button className={styles.addBtn} onClick={() => setIsCreateDrawerOpen(true)}>
                + Ajouter une commande
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search Input Filter Component */}
      <div className={styles.searchContainer}>
        <div className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Rechercher par nom de client ou téléphone..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className={styles.clearSearchBtn}
            >
              Effacer
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
                <th className={`${styles.checkboxCol} ${adminStyles.hideMobile}`}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    title="Tout sélectionner"
                  />
                </th>
                <th className={adminStyles.hideMobile}>ID</th>
                <th>Client</th>
                <th className={adminStyles.hideMobile}>Téléphone</th>
                <th>Statut</th>
                <th>Produits</th>
                <th>Total</th>
                <th>Type Client</th>
                <th style={{ width: '90px' }}></th>
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
                    <td className={`${styles.checkboxCol} ${adminStyles.hideMobile}`}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isChecked}
                        onChange={() => toggleSelect(order.id)}
                      />
                    </td>
                    <td className={adminStyles.hideMobile}>#{order.id.slice(0, 8)}</td>
                    <td>{order.customer_name}</td>
                    <td className={adminStyles.hideMobile}>{order.phone}</td>
                    <td>
                      <StatusDropdown
                        value={order.call_status ?? 'pending'}
                        onChange={newStatus => updateCallStatus(order.id, newStatus)}
                      />
                    </td>
                    <td>
                      <button className={styles.itemsBtn} onClick={() => { setSelectedOrder(order); setIsDrawerOpen(true); }}>
                        <ShoppingBag size={14} />
                        <span>{itemCount} article{itemCount !== 1 ? 's' : ''}</span>
                      </button>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{order.total_price?.toFixed(3)} TND</td>

                    <td>
                      {(() => {
                        const count = order.customer_order_count || 1;
                        if (order.customer_has_returned) {
                          return <span className={`${styles.badge} ${styles.badgeDanger}`} style={{ whiteSpace: 'nowrap' }}>Client non sérieux</span>;
                        }
                        if (order.customer_has_delivered) {
                          return <span className={`${styles.badge} ${styles.badgeLoyal}`} style={{ whiteSpace: 'nowrap' }}>Client fidèle</span>;
                        }
                        if (count > 1) {
                          return <span className={`${styles.badge} ${styles.badgeWarning}`} style={{ whiteSpace: 'nowrap' }}>Client régulier</span>;
                        }
                        return <span className={`${styles.badge} ${styles.badgeNew}`} style={{ whiteSpace: 'nowrap' }}>Nouveau client</span>;
                      })()}
                    </td>
                    <td>
                      <div className={styles.actionBtns}>
                        <button
                          className={styles.deliverBtn}
                          style={order.cosmos_barcode ? { color: '#32dc64', borderColor: 'rgba(50,220,100,0.3)', background: 'rgba(50,220,100,0.08)', cursor: 'default' } : undefined}
                          onClick={order.cosmos_barcode ? undefined : () => confirmOrderAndDispatch(order)}
                          title={order.cosmos_barcode ? "Déjà envoyé à Cosmos" : "Envoyer à Cosmos"}
                          disabled={!!order.cosmos_barcode}
                        >
                          <Truck size={18} />
                        </button>
                        <button 
                          className={styles.eyeBtn} 
                          onClick={() => { setSelectedOrder(order); setIsDrawerOpen(true); }}
                          title="Voir les détails"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '32px' }}>
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
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        order={selectedOrder}
        onOrderUpdated={fetchOrders}
        onStatusChange={(id, s) => {
          updateCallStatus(id, s);
          setSelectedOrder(prev => prev ? { ...prev, call_status: s } : null);
        }}
      />
      
      <OrderDetailsDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        order={{
          id: 'new',
          created_at: new Date().toISOString(),
          customer_name: '',
          phone: '',
          city: '',
          address: '',
          customer_email: '',
          private_note: '',
          country: 'Tunisie',
          call_status: 'pending',
          cosmos_status: 'pending',
          total_price: 0,
          order_items: []
        } as unknown as OrderWithItems}
        mode="create"
        onOrderUpdated={() => {
          setIsCreateDrawerOpen(false);
          fetchOrders();
        }}
      />
    </div>
  );
}
