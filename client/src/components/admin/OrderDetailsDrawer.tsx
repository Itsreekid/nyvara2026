'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { X, Edit, Trash2 } from 'lucide-react';
import styles from './OrderDetailsDrawer.module.css';
import type { ColorOption } from '@/types';
import type { OrderWithItems, OrderItem } from '@/app/admin/orders/page';
import StatusDropdown, { CALL_STATUSES } from './StatusDropdown';
import { supabase } from '@/lib/supabase';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderWithItems | null;
  mode?: 'view' | 'create';
  onStatusChange?: (id: string, status: string) => void;
  onOrderUpdated?: () => void;
}

const CITIES = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba', 'Kairouan',
  'Kasserine', 'Kebili', 'Le Kef', 'Mahdia', 'Manouba', 'Medenine', 'Monastir', 'Nabeul',
  'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan'
];

interface EditableItem extends OrderItem {
  custom_price: number;
}

function getUnitPrice(item: OrderItem): number {
  if (item.quantity_break_price != null) return item.quantity_break_price;
  if (item.products?.discount != null && item.products.discount > 0) {
    return (item.products.price ?? 0) * (1 - item.products.discount / 100);
  }
  return item.products?.price ?? 0;
}

function findColor(item: OrderItem): ColorOption | undefined {
  return item.products?.color_options?.find(
    (co: ColorOption) => 
      (item.selected_color_name && co.name === item.selected_color_name) ||
      (item.selected_color_hex1 && co.hex1 === item.selected_color_hex1)
  );
}

export default function OrderDetailsDrawer({
  isOpen, onClose, order, mode = 'view', onStatusChange, onOrderUpdated,
}: DrawerProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving]   = React.useState(false);
  const [formData, setFormData]   = React.useState({
    customer_name: '', phone: '', city: '', address: '', customer_email: '', private_note: '', country: 'TN'
  });
  const [editableItems, setEditableItems] = React.useState<EditableItem[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [openPickerId, setOpenPickerId]   = React.useState<string | null>(null);
  const pickerRef = React.useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = React.useState<'summary' | 'history'>('summary');
  const [historyOrders, setHistoryOrders] = React.useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setActiveTab('summary');
      setHistoryOrders([]);
      setExpandedHistoryId(null);
    } else if (isOpen && mode === 'create' && products.length === 0) {
      supabase.from('products').select('id, title, price, discount, image_url, color_options').order('title').then(({ data }) => {
        if (data) setProducts(data);
      });
    }
  }, [isOpen, mode, products.length]);

  React.useEffect(() => {
    if (activeTab === 'history' && order?.phone) {
      setHistoryLoading(true);
      supabase
        .from('orders')
        .select('id, created_at, total_price, call_status, order_items(quantity, quantity_break_price, selected_color_name, products(id, title, price, discount, image_url))')
        .eq('phone', order.phone)
        .neq('id', order.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) setHistoryOrders(data);
          setHistoryLoading(false);
        });
    }
  }, [activeTab, order?.phone, order?.id]);

  React.useEffect(() => {
    if (order) {
      setFormData({
        customer_name:  order.customer_name  || '',
        phone:          order.phone          || '',
        city:           order.city           || '',
        address:        order.address        || '',
        customer_email: order.customer_email || '',
        private_note:   order.private_note   || '',
        country:        order.country        || 'TN',
      });
      setEditableItems(
        (order.order_items ?? []).map(item => ({
          ...JSON.parse(JSON.stringify(item)) as OrderItem,
          custom_price: getUnitPrice(item),
        }))
      );
      setIsEditing(mode === 'create');
    }
  }, [order, mode]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (!isOpen) { setIsEditing(false); setOpenPickerId(null); }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!openPickerId) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node))
        setOpenPickerId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openPickerId]);

  if (!order) return null;

  const patchItem = (id: string, patch: Partial<EditableItem>) =>
    setEditableItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));

  const handleUpdateQty   = (id: string, qty: number)     => patchItem(id, { quantity: Math.max(1, qty) });
  const handleUpdatePrice = (id: string, price: number)   => patchItem(id, { custom_price: price, quantity_break_price: price });
  const handleUpdateColor = (id: string, name: string | null, hex1: string | null = null, hex2: string | null = null) => 
    patchItem(id, { selected_color_name: name, selected_color_hex1: hex1, selected_color_hex2: hex2 });

  const handleDeleteItem = (id: string) => {
    if (editableItems.length <= 1) { alert('Une commande doit contenir au moins un produit.'); return; }
    if (confirm('Voulez-vous supprimer ce produit de la commande ?'))
      setEditableItems(prev => prev.filter(i => i.id !== id));
  };

  const viewItems  = order.order_items ?? [];
  const activeItems: OrderItem[] = isEditing ? editableItems : viewItems;

  const subTotal = activeItems.reduce((s, i) => {
    const price = isEditing ? (i as EditableItem).custom_price : getUnitPrice(i);
    return s + price * i.quantity;
  }, 0);
  const deliveryPrice = 0;
  const grandTotal    = subTotal + deliveryPrice;

  const handleSave = async () => {
    if (!order) return;
    setIsSaving(true);
    console.group('[OrderDrawer] 💾 handleSave started');
    try {
      const newTotal = editableItems.reduce((s, i) => s + i.custom_price * i.quantity, 0);

      if (mode === 'create') {
        const { data: newOrder, error: createError } = await supabase
          .from('orders')
          .insert({
            ...formData,
            total_price: newTotal,
            call_status: order.call_status ?? 'pending',
            cosmos_status: 'pending',
          } as never)
          .select()
          .single();
        if (createError) throw createError;

        if (editableItems.length > 0) {
          const itemsToInsert = editableItems.map(item => ({
            order_id: newOrder.id,
            product_id: item.product_id || (item.products as any)?.id,
            quantity: item.quantity,
            quantity_break_price: item.custom_price,
            selected_color_name: item.selected_color_name ?? null,
            selected_color_hex1: item.selected_color_hex1 ?? null,
            selected_color_hex2: item.selected_color_hex2 ?? null,
          }));
          const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert as never);
          if (itemsError) throw itemsError;
        }
      } else {
        const originalIds = viewItems.map(i => i.id);
        const deletedIds  = originalIds.filter(id => !editableItems.find(i => i.id === id));
        if (deletedIds.length > 0) {
          const { error } = await supabase.from('order_items').delete().in('id', deletedIds).select();
          if (error) throw error;
        }

        for (const item of editableItems) {
          if (item.id.startsWith('temp_')) {
            const { error } = await supabase.from('order_items').insert({
              order_id: order.id,
              product_id: item.product_id || (item.products as any)?.id,
              quantity: item.quantity,
              quantity_break_price: item.custom_price,
              selected_color_name: item.selected_color_name ?? null,
              selected_color_hex1: item.selected_color_hex1 ?? null,
              selected_color_hex2: item.selected_color_hex2 ?? null,
            } as never);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('order_items')
              .update({
                quantity:             item.quantity,
                quantity_break_price: item.custom_price,
                selected_color_name:  item.selected_color_name ?? null,
                selected_color_hex1:  item.selected_color_hex1 ?? null,
                selected_color_hex2:  item.selected_color_hex2 ?? null,
              } as never)
              .eq('id', item.id)
              .select();
            if (error) throw error;
          }
        }

        const { error } = await supabase
          .from('orders')
          .update({ ...formData, total_price: newTotal } as never)
          .eq('id', order.id)
          .select();
        if (error) throw error;
      }

      console.groupEnd();
      setIsEditing(false);
      onOrderUpdated?.();
    } catch (err: unknown) {
      console.error('❌ Save error:', err);
      console.groupEnd();
      alert('Erreur lors de la sauvegarde : ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className={`${styles.backdrop} ${isOpen ? styles.backdropOpen : ''}`} onClick={onClose} />
      <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>

        <div className={styles.header}>
          <h2 className={styles.headerTitle}>
            {mode === 'create' ? 'Nouvelle Commande' : (isEditing ? `Edit order #${order.id.slice(0, 8)}` : 'Order Details')}
          </h2>
          <div className={styles.headerActions}>
            {isEditing ? (
              <>
                <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  className={styles.editBtn}
                  style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.18)' }}
                  onClick={() => {
                    if (mode === 'create') {
                      onClose();
                    } else {
                      setEditableItems(
                        viewItems.map(item => ({
                          ...JSON.parse(JSON.stringify(item)) as OrderItem,
                          custom_price: getUnitPrice(item),
                        }))
                      );
                      setIsEditing(false);
                    }
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
                <Edit size={14} /> Edit
              </button>
            )}
            <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.gridTop}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>{mode === 'create' ? 'Nouvelle Commande' : `Order #${order.id.slice(0, 8)}`}</h3>
              <div className={styles.detailsList}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Date Added</span>
                  <span className={styles.detailValue}>
                    {new Date(order.created_at || '').toLocaleString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: 'numeric', minute: '2-digit', hour12: true,
                    })}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Delivery Company</span>
                  <span className={styles.detailValue}>Cosmos (Tunisie)</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Status</span>
                  <span className={styles.detailValue}>
                    {mode === 'create' ? (
                      <span className={styles.detailValue}>En attente</span>
                    ) : (
                      <StatusDropdown
                        value={order.call_status ?? 'pending'}
                        onChange={s => onStatusChange?.(order.id, s)}
                      />
                    )}
                  </span>
                </div>
                {(isEditing || formData.private_note) && (
                  <div className={styles.detailRowCol}>
                    <span className={styles.detailLabel}>Private note</span>
                    {isEditing ? (
                      <textarea
                        className={styles.textareaInput}
                        value={formData.private_note}
                        onChange={e => setFormData(p => ({ ...p, private_note: e.target.value }))}
                        placeholder="Add a private note"
                      />
                    ) : (
                      <span className={styles.detailValue}>{formData.private_note}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Customer Details</h3>
                <button type="button" className={styles.cardActionBtn} onClick={() => setActiveTab('history')}>
                  Check orders
                </button>
              </div>
              <div className={styles.detailsList}>
                {([
                  { label: 'Name',    key: 'customer_name'  },
                  { label: 'Phone',   key: 'phone'          },
                  { label: 'Address', key: 'address'        },
                  { label: 'Email',   key: 'customer_email' },
                ] as { label: string; key: keyof typeof formData }[]).map(({ label, key }) => (
                  <div className={styles.detailRow} key={key}>
                    <span className={styles.detailLabel}>{label}</span>
                    {isEditing ? (
                      <input
                        className={styles.textInput}
                        value={formData[key]}
                        onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))}
                      />
                    ) : (
                      <span className={styles.detailValue}>{(order as unknown as Record<string, unknown>)[key] as string || '—'}</span>
                    )}
                  </div>
                ))}
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>City</span>
                  {isEditing ? (
                    <select
                      className={styles.selectInput}
                      value={formData.city}
                      onChange={e => setFormData(p => ({ ...p, city: e.target.value }))}
                    >
                      <option value="">Select a city</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <span className={styles.detailValue}>{order.city}</span>
                  )}
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Country</span>
                  <span className={styles.detailValue}>{order.country || 'TN'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${activeTab === 'summary' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              Summary
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('history')}
            >
              History
            </button>
          </div>

          <div className={styles.tableContainer}>
            {activeTab === 'summary' ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Option</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                  {isEditing && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {(isEditing ? editableItems : viewItems).map(item => {
                  const editItem  = isEditing ? (item as EditableItem) : null;
                  const unitPrice = isEditing ? editItem!.custom_price : getUnitPrice(item);
                  const lineTotal = unitPrice * item.quantity;
                  const imgUrl    = findColor(item)?.image_url ?? item.products?.image_url;

                  return (
                    <tr key={item.id} className={styles.tableRow}>
                      <td className={styles.productCell}>
                        <a 
                          href={`/shop/${item.products?.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}
                        >
                          {imgUrl && (
                            <div className={styles.productImgWrapper}>
                              <Image src={imgUrl} alt={item.products?.title ?? ''} width={40} height={40}
                                className={styles.productImg} unoptimized />
                              <div className={styles.productImgHoverZoom}>
                                <Image src={imgUrl} alt={item.products?.title ?? ''} width={250} height={250}
                                  unoptimized style={{ objectFit: 'cover', borderRadius: 8 }} />
                              </div>
                            </div>
                          )}
                          <span style={{ transition: 'color 0.2s' }} className={styles.productTitleHover}>
                            {item.products?.title ?? 'Unknown'}
                          </span>
                        </a>
                      </td>

                      <td style={{ position: 'relative' }}>
                        {isEditing ? (() => {
                          const colors   = item.products?.color_options ?? [];
                          const editItem = item as EditableItem;
                          const selected = colors.find(co => 
                            (editItem.selected_color_name && co.name === editItem.selected_color_name) ||
                            (editItem.selected_color_hex1 && co.hex1 === editItem.selected_color_hex1)
                          ) ?? null;
                          const isOpen   = openPickerId === item.id;
                          if (colors.length === 0) return <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>;
                          return (
                            <div ref={isOpen ? pickerRef : undefined} style={{ position: 'relative', display: 'inline-block', minWidth: 140 }}>
                              <button
                                type="button"
                                onClick={() => setOpenPickerId(isOpen ? null : item.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  width: '100%', padding: '5px 10px 5px 8px',
                                  background: 'rgba(255,255,255,0.06)',
                                  border: '1.5px solid rgba(255,255,255,0.18)',
                                  borderRadius: 6, cursor: 'pointer', color: '#fff',
                                  fontSize: 13, outline: 'none', justifyContent: 'space-between',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {selected ? (
                                    <div style={{
                                      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                                      background: selected.hex2
                                        ? `linear-gradient(135deg, ${selected.hex1} 50%, ${selected.hex2} 50%)`
                                        : selected.hex1,
                                      border: '1.5px solid rgba(255,255,255,0.25)',
                                      boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
                                    }} />
                                  ) : (
                                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px dashed rgba(255,255,255,0.3)' }} />
                                  )}
                                  <span>{selected?.name || '— Sans couleur —'}</span>
                                </div>
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.5, flexShrink: 0 }}>
                                  <path d={isOpen ? 'M1 5l4-4 4 4' : 'M1 1l4 4 4-4'} stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              {isOpen && (
                                <div style={{
                                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 9999,
                                  background: '#16162a', border: '1.5px solid rgba(255,255,255,0.15)',
                                  borderRadius: 10, padding: '8px',
                                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                                  display: 'flex', flexDirection: 'column', gap: 6,
                                }}>
                                  <div
                                    onClick={() => { handleUpdateColor(item.id, null, null, null); setOpenPickerId(null); }}
                                    title="Sans couleur"
                                    style={{
                                      width: 26, height: 26, borderRadius: '50%', cursor: 'pointer',
                                      background: 'rgba(255,255,255,0.08)',
                                      border: !selected ? '2.5px solid #fff' : '1.5px solid rgba(255,255,255,0.25)',
                                      boxShadow: !selected ? '0 0 0 2.5px #1967d2' : '0 0 0 1px rgba(0,0,0,0.3)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 11, color: 'rgba(255,255,255,0.5)',
                                      transform: !selected ? 'scale(1.12)' : 'scale(1)',
                                      transition: 'all 0.15s',
                                    }}
                                  >✕</div>
                                  {colors.map(co => {
                                    const active = (editItem.selected_color_name && editItem.selected_color_name === co.name) || 
                                                   (editItem.selected_color_hex1 && editItem.selected_color_hex1 === co.hex1);
                                    return (
                                      <div
                                        key={co.id}
                                        onClick={() => { handleUpdateColor(item.id, co.name, co.hex1, co.hex2 ?? null); setOpenPickerId(null); }}
                                        title={co.name || 'Couleur'}
                                        style={{
                                          width: 26, height: 26, borderRadius: '50%', cursor: 'pointer',
                                          background: co.hex2
                                            ? `linear-gradient(135deg, ${co.hex1} 50%, ${co.hex2} 50%)`
                                            : co.hex1,
                                          border: active ? '2.5px solid #fff' : '1.5px solid rgba(255,255,255,0.2)',
                                          boxShadow: active ? '0 0 0 2.5px #1967d2' : '0 0 0 1px rgba(0,0,0,0.35)',
                                          transform: active ? 'scale(1.12)' : 'scale(1)',
                                          transition: 'all 0.15s',
                                        }}
                                      />
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })() : (() => {
                          const co   = findColor(item);
                          const hex1 = co?.hex1 || item.selected_color_hex1;
                          const hex2 = co?.hex2 || item.selected_color_hex2;
                          const name = item.selected_color_name;
                          if (!hex1 && !name) return <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>;
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {hex1 && <div style={{
                                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                                background: hex2 ? `linear-gradient(135deg, ${hex1} 50%, ${hex2} 50%)` : hex1,
                                border: '1.5px solid rgba(255,255,255,0.18)',
                                boxShadow: '0 0 0 1px rgba(0,0,0,0.25)',
                              }} />}
                              {name && <span style={{ fontSize: 13 }}>{name}</span>}
                            </div>
                          );
                        })()}
                      </td>

                      <td>
                        {isEditing ? (
                          <input
                            type="number" min="1"
                            value={editItem!.quantity}
                            onChange={e => handleUpdateQty(item.id, parseInt(e.target.value) || 1)}
                            className={styles.qtyInput}
                          />
                        ) : item.quantity}
                      </td>

                      <td>
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="number" min="0" step="0.001"
                              value={editItem!.custom_price}
                              onChange={e => handleUpdatePrice(item.id, parseFloat(e.target.value) || 0)}
                              className={styles.qtyInput}
                              style={{ width: 80 }}
                            />
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>TND</span>
                          </div>
                        ) : `${unitPrice.toFixed(3)} TND`}
                      </td>

                      <td>{lineTotal.toFixed(3)} TND</td>

                      {isEditing && (
                        <td>
                          <button className={styles.deleteBtn} onClick={() => handleDeleteItem(item.id)} title="Remove">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {isEditing && (
                  <tr className={styles.tableRow}>
                    <td colSpan={6} style={{ padding: '8px 16px' }}>
                      <select 
                        className={styles.selectInput}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px dashed rgba(255,255,255,0.2)', cursor: 'pointer' }}
                        defaultValue=""
                        onChange={e => {
                          const p = products.find(x => x.id === e.target.value);
                          if (p) {
                            setEditableItems(prev => [...prev, {
                              id: `temp_${Math.random()}`,
                              product_id: p.id,
                              quantity: 1,
                              custom_price: p.price,
                              products: p,
                            } as unknown as EditableItem]);
                          }
                          e.target.value = "";
                        }}
                      >
                        <option value="" disabled>+ Ajouter un produit...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                      </select>
                    </td>
                  </tr>
                )}

                <tr className={styles.totalsRow}>
                  <td colSpan={isEditing ? 5 : 4}>Sub-total</td>
                  <td>{subTotal.toFixed(3)} TND</td>
                </tr>
                <tr className={styles.totalsRow}>
                  <td colSpan={isEditing ? 5 : 4}>Delivery Price</td>
                  <td>{deliveryPrice.toFixed(3)} TND</td>
                </tr>
                <tr className={`${styles.totalsRow} ${styles.grandTotal}`}>
                  <td colSpan={isEditing ? 5 : 4}>Total</td>
                  <td>{grandTotal.toFixed(3)} TND</td>
                </tr>
              </tbody>
            </table>
            ) : (
              historyLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                  Chargement de l'historique...
                </div>
              ) : historyOrders.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                  Aucune commande précédente
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ display: 'none' }} className={styles.hideMobile}>Order ID</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyOrders.map(h => {
                      const itemCount = h.order_items?.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0) || 0;
                      const statusObj = CALL_STATUSES.find(s => s.value === h.call_status) || CALL_STATUSES[0];
                      const isExpanded = expandedHistoryId === h.id;
                      
                      return (
                        <React.Fragment key={h.id}>
                          <tr 
                            className={styles.tableRow} 
                            onClick={() => setExpandedHistoryId(isExpanded ? null : h.id)}
                            style={{ cursor: 'pointer', transition: 'background 0.2s', background: isExpanded ? 'rgba(255,255,255,0.03)' : undefined }}
                          >
                            <td style={{ display: 'none' }} className={styles.hideMobile}>#{h.id.slice(0, 8)}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {new Date(h.created_at || '').toLocaleDateString('fr-FR', {
                                day: '2-digit', month: 'short', year: 'numeric'
                              })}
                            </td>
                            <td>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '4px 10px', borderRadius: '6px',
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                                fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap'
                              }}>
                                {itemCount} article{itemCount > 1 ? 's' : ''}
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </span>
                            </td>
                            <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{h.total_price?.toFixed(3)} TND</td>
                            <td style={{ whiteSpace: 'nowrap', width: '1%' }}>
                              <span style={{ 
                                  padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                  background: statusObj.bg, color: statusObj.color,
                                  border: `1px solid ${statusObj.color.replace(')', ', 0.3)').replace('rgb', 'rgba')}`,
                                  whiteSpace: 'nowrap', display: 'inline-block'
                               }}>
                                {statusObj.label}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && h.order_items && h.order_items.length > 0 && (
                            <tr style={{ background: 'rgba(255,255,255,0.015)' }}>
                              <td colSpan={5} style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  {h.order_items.map((item: any, idx: number) => {
                                    const unitPrice = getUnitPrice(item);
                                    return (
                                      <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        {item.products?.image_url ? (
                                          <Image src={item.products.image_url} width={40} height={40} style={{ borderRadius: '6px', objectFit: 'cover' }} alt="" unoptimized />
                                        ) : (
                                          <div style={{ width: 40, height: 40, borderRadius: '6px', background: 'rgba(255,255,255,0.1)' }} />
                                        )}
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                                            {item.products?.title || 'Produit inconnu'}
                                          </div>
                                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                                            {item.quantity} × {unitPrice.toFixed(3)} TND
                                            {item.selected_color_name && <span> • {item.selected_color_name}</span>}
                                          </div>
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                                          {(unitPrice * item.quantity).toFixed(3)} TND
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}
