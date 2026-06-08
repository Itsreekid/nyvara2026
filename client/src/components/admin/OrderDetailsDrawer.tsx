'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { X, Edit } from 'lucide-react';
import styles from './OrderDetailsDrawer.module.css';
import type { ColorOption } from '@/types';
import type { OrderWithItems } from '@/app/admin/orders/page';
import StatusDropdown from './StatusDropdown';
import { supabase } from '@/lib/supabase';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  order: any | null; // using any for now, will map to OrderWithItems
  onStatusChange?: (id: string, status: string) => void;
  onOrderUpdated?: () => void;
}

const CITIES = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba', 'Kairouan',
  'Kasserine', 'Kebili', 'Le Kef', 'Mahdia', 'Manouba', 'Medenine', 'Monastir', 'Nabeul',
  'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan'
];

export default function OrderDetailsDrawer({ isOpen, onClose, order, onStatusChange, onOrderUpdated }: DrawerProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formData, setFormData] = React.useState({
    customer_name: '', phone: '', city: '', address: '', customer_email: '', private_note: ''
  });

  React.useEffect(() => {
    if (order) {
      setFormData({
        customer_name: order.customer_name || '',
        phone: order.phone || '',
        city: order.city || '',
        address: order.address || '',
        customer_email: order.customer_email || '',
        private_note: order.private_note || ''
      });
      setIsEditing(false);
    }
  }, [order]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setIsEditing(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSave = async () => {
    if (!order) return;
    setIsSaving(true);
    const { error } = await supabase.from('orders').update(formData).eq('id', order.id);
    setIsSaving(false);
    if (!error) {
      setIsEditing(false);
      onOrderUpdated?.();
    } else {
      alert('Error updating order: ' + error.message);
    }
  };

  if (!order) return null;

  const items = order.order_items ?? [];
  const itemsTotal = items.reduce((s: number, i: any) => {
    const p = i.products;
    const unitPrice = i.quantity_break_price ?? (p?.discount != null && p.discount > 0
      ? (p.price ?? 0) * (1 - p.discount / 100)
      : (p?.price ?? 0));
    return s + unitPrice * i.quantity;
  }, 0);

  const deliveryPrice = 0; // Hardcoded or fetch from order if available
  const subTotal = itemsTotal;
  const grandTotal = order.total_price ?? (subTotal + deliveryPrice);

  return (
    <>
      <div 
        className={`${styles.backdrop} ${isOpen ? styles.backdropOpen : ''}`} 
        onClick={onClose} 
      />
      <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>{isEditing ? `Edit order n°${order.id.slice(0, 8)}` : 'Order Details'}</h2>
          <div className={styles.headerActions}>
            {isEditing ? (
              <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            ) : (
              <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
                <Edit size={14} /> Edit
              </button>
            )}
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.gridTop}>
            {/* Order Info Card */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Order #{order.id.slice(0, 8)}</h3>
              <div className={styles.detailsList}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Date Added</span>
                  <span className={styles.detailValue}>
                    {new Date(order.created_at || '').toLocaleString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
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
                    <StatusDropdown
                      value={order.call_status ?? 'pending'}
                      onChange={(newStatus) => onStatusChange?.(order.id, newStatus)}
                    />
                  </span>
                </div>
                {(isEditing || formData.private_note) && (
                  <div className={styles.detailRowCol}>
                    <span className={styles.detailLabel}>Private note</span>
                    {isEditing ? (
                      <textarea
                        className={styles.textareaInput}
                        value={formData.private_note}
                        onChange={(e) => setFormData(prev => ({ ...prev, private_note: e.target.value }))}
                        placeholder="Add a private note"
                      />
                    ) : (
                      <span className={styles.detailValue}>{formData.private_note}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Details Card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Customer Details</h3>
                <button className={styles.cardActionBtn}>Check orders</button>
              </div>
              <div className={styles.detailsList}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Name</span>
                  {isEditing ? (
                    <input className={styles.textInput} value={formData.customer_name} onChange={(e) => setFormData(prev => ({...prev, customer_name: e.target.value}))} />
                  ) : (
                    <span className={styles.detailValue}>{order.customer_name}</span>
                  )}
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Phone</span>
                  {isEditing ? (
                    <input className={styles.textInput} value={formData.phone} onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))} />
                  ) : (
                    <span className={styles.detailValue}>{order.phone}</span>
                  )}
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>City</span>
                  {isEditing ? (
                    <select className={styles.selectInput} value={formData.city} onChange={(e) => setFormData(prev => ({...prev, city: e.target.value}))}>
                      <option value="">Select a city</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <span className={styles.detailValue}>{order.city}</span>
                  )}
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Address</span>
                  {isEditing ? (
                    <input className={styles.textInput} value={formData.address} onChange={(e) => setFormData(prev => ({...prev, address: e.target.value}))} />
                  ) : (
                    <span className={styles.detailValue}>{order.address || '—'}</span>
                  )}
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Email</span>
                  {isEditing ? (
                    <input className={styles.textInput} value={formData.customer_email} onChange={(e) => setFormData(prev => ({...prev, customer_email: e.target.value}))} />
                  ) : (
                    <span className={styles.detailValue}>{order.customer_email || '—'}</span>
                  )}
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Country</span>
                  <span className={styles.detailValue}>{order.country || 'TN'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${styles.tabActive}`}>Summary</button>
            <button className={styles.tab}>History</button>
          </div>

          {/* Items Table */}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Option</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => {
                  const matchingColor = item.products?.color_options?.find(
                    (co: any) => co.name === item.selected_color_name
                  );
                  const imageUrl = matchingColor?.image_url || item.products?.image_url;
                  
                  const unitPrice = item.quantity_break_price ?? (item.products?.discount != null && item.products.discount > 0
                    ? (item.products.price ?? 0) * (1 - item.products.discount / 100)
                    : (item.products?.price ?? 0));
                    
                  return (
                    <tr key={item.id} className={styles.tableRow}>
                      <td className={styles.productCell}>
                        {imageUrl && (
                          <Image
                            src={imageUrl}
                            alt={item.products?.title ?? 'Product'}
                            width={40}
                            height={40}
                            className={styles.productImg}
                            unoptimized
                          />
                        )}
                        <span>{item.products?.title ?? 'Unknown'}</span>
                      </td>
                      <td>{item.selected_color_name || '—'}</td>
                      <td>{item.quantity}</td>
                      <td>{unitPrice.toFixed(2)}TND</td>
                      <td>{(unitPrice * item.quantity).toFixed(2)}TND</td>
                    </tr>
                  );
                })}
                
                {/* Totals */}
                <tr className={styles.totalsRow}>
                  <td colSpan={4}>Sub-total</td>
                  <td>{subTotal.toFixed(2)}TND</td>
                </tr>
                <tr className={styles.totalsRow}>
                  <td colSpan={4}>Delivery Price</td>
                  <td>{deliveryPrice.toFixed(2)}TND</td>
                </tr>
                <tr className={`${styles.totalsRow} ${styles.grandTotal}`}>
                  <td colSpan={4}>Total</td>
                  <td>{grandTotal.toFixed(2)}TND</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
