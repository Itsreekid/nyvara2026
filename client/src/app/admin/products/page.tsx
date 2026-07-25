'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { uploadImageToR2 } from '@/lib/r2-upload';
import type { Product, Category, ColorOption, QuantityBreak } from '@/types';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ImageUpload from '@/components/admin/ImageUpload';
import { PlusCircle, Trash2, ImageIcon, Loader2 } from 'lucide-react';
import adminStyles from '../admin.module.css';
import styles from './products.module.css';

type GalleryPhase = 'idle' | 'compressing' | 'uploading';

type FormState = {
  title: string;
  price: string;
  cost_price: string;
  stock: string;
  discount: string;
  final_price: string;   // UI helper — auto-calculated, not saved
  description: string;
  image_url: string;
  gender: string;
  category_id: string;
  badge: string;
  features: string;
  rating: string;
  review_count: string;
  is_active: boolean;
  allow_unlimited_stock: boolean;
};

const emptyForm: FormState = {
  title: '', price: '', cost_price: '', stock: '0', discount: '', final_price: '',
  description: '', image_url: '', gender: 'unisex', category_id: '',
  badge: '', features: '', rating: '', review_count: '',
  is_active: true, allow_unlimited_stock: false,
};

interface SpecRow { key: string; value: string; }

interface GalleryImage { id: string; image_url: string; sort_order: number; }

export default function AdminProductsPage() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Modal
  const [modalOpen, setModalOpen]         = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData]           = useState<FormState>(emptyForm);
  const [specRows, setSpecRows]           = useState<SpecRow[]>([]);

  // Gallery
  const [galleryImages, setGalleryImages]   = useState<GalleryImage[]>([]);
  const [galleryPhase, setGalleryPhase]     = useState<GalleryPhase>('idle');
  const [galleryError, setGalleryError]     = useState('');
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Colors
  const [colorOptions, setColorOptions] = useState<ColorOption[]>([]);
  // Quantity Breaks
  const [quantityBreaks, setQuantityBreaks] = useState<QuantityBreak[]>([]);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      supabase.from('products').select('*, categories(*)').order('created_at', { ascending: false }).limit(200),
      supabase.from('categories').select('*').order('name'),
    ]).then(([{ data: prods }, { data: cats }]) => {
      if (prods) setProducts(prods as Product[]);
      if (cats)  setCategories(cats as Category[]);
      setLoading(false);
    });
  };

  useEffect(() => { fetchAll(); }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData(emptyForm);
    setGalleryImages([]);
    setSpecRows([]);
    setColorOptions([]);
    setQuantityBreaks([]);
    setModalOpen(true);
  };

  const openEditModal = async (p: Product) => {
    setEditingProduct(p);
    setFormData({
      title:        p.title        ?? '',
      price:        p.price        != null ? String(p.price)       : '',
      cost_price:   p.cost_price   != null ? String(p.cost_price)  : '',
      stock:        p.stock        != null ? String(p.stock)       : '0',
      discount:     p.discount     != null ? String(p.discount)    : '',
      final_price:  p.price != null && p.discount != null && p.discount > 0
        ? String(Math.round(p.price * (1 - p.discount / 100)))
        : '',
      description:  p.description  ?? '',
      image_url:    p.image_url    ?? '',
      gender:       p.gender       ?? 'unisex',
      category_id:  p.category_id  ?? '',
      badge:        p.badge        ?? '',
      features:     p.features     ?? '',
      rating:       p.rating       != null ? String(p.rating)      : '',
      review_count: p.review_count != null ? String(p.review_count): '',
      is_active:    p.is_active ?? true,
      allow_unlimited_stock: p.allow_unlimited_stock ?? false,
    });
    // Specs rows
    const specs = (p.specs ?? {}) as Record<string, string>;
    setSpecRows(Object.entries(specs).map(([key, value]) => ({ key, value })));
    // Load gallery images for this product
    const { data } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', p.id)
      .order('sort_order');
    setGalleryImages((data as GalleryImage[]) ?? []);
    setColorOptions(p.color_options ?? []);
    setQuantityBreaks(p.quantity_breaks ?? []);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const specsObj = Object.fromEntries(
      specRows.filter(r => r.key.trim()).map(r => [r.key.trim(), r.value.trim()])
    );

    // Calculate discount percentage from original price and final price
    const price = parseFloat(formData.price) || 0;
    const finalPriceRaw = formData.final_price ? parseFloat(formData.final_price) : 0;
    const finalPrice = finalPriceRaw > 0 ? Math.round(finalPriceRaw) : 0;
    let discountPercentage = null;
    
    if (price > 0 && finalPrice > 0 && finalPrice < price) {
      // Calculate discount and store as integer
      discountPercentage = Math.round(((price - finalPrice) / price) * 100);
    }

    const payload = {
      title:        formData.title,
      price:        price,
      final_price:  finalPrice > 0 ? finalPrice : null,
      cost_price:   formData.cost_price   ? parseFloat(formData.cost_price)   : null,
      stock:        parseInt(formData.stock, 10) || 0,
      discount:     discountPercentage,
      description:  formData.description,
      image_url:    formData.image_url,
      gender:       formData.gender,
      category_id:  formData.category_id || null,
      badge:        formData.badge        || null,
      features:     formData.features     || null,
      rating:       formData.rating       ? parseFloat(formData.rating)       : null,
      review_count: formData.review_count ? parseInt(formData.review_count)   : null,
      specs:        Object.keys(specsObj).length > 0 ? specsObj : null,
      color_options: colorOptions.length > 0 ? colorOptions : null,
      quantity_breaks: quantityBreaks.length > 0 ? quantityBreaks : null,
      is_active:    formData.is_active,
      allow_unlimited_stock: formData.allow_unlimited_stock,
    };

    const { error } = editingProduct
      ? await supabase.from('products').update(payload).eq('id', editingProduct.id)
      : await supabase.from('products').insert([payload]);

    setSubmitting(false);
    if (!error) {
      setModalOpen(false);
      setFormData(emptyForm);
      setEditingProduct(null);
      fetchAll();
    } else {
      alert('Erreur: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchAll();
  };

  // ── Gallery upload — direct R2 upload ─────────────────────────────────────
  const handleGalleryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;

    try {
      setGalleryError('');
      setGalleryPhase('uploading');
      const publicUrl = await uploadImageToR2(file, 'gallery');
      const nextOrder = galleryImages.length;
      const { data: img, error: dbErr } = await supabase
        .from('product_images')
        .insert({ product_id: editingProduct.id, image_url: publicUrl, sort_order: nextOrder })
        .select()
        .single();
      if (dbErr) throw dbErr;
      setGalleryImages(prev => [...prev, img as GalleryImage]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setGalleryError(message);
    } finally {
      setGalleryPhase('idle');
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleGalleryDelete = async (id: string) => {
    await supabase.from('product_images').delete().eq('id', id);
    setGalleryImages(prev => prev.filter(img => img.id !== id));
  };

  const margin = (p: Product) => {
    if (p.cost_price == null) return null;
    // Use final_price if available (price after discount), otherwise use original price
    const sellingPrice = p.final_price ?? p.price;
    if (sellingPrice == null) return null;
    return sellingPrice - p.cost_price;
  };

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setFormData(prev => ({ ...prev, [field]: e.target.value }));

  if (loading) return <div className={adminStyles.contentArea}>Chargement...</div>;

  return (
    <div>
      <div className={adminStyles.pageHeader}>
        <h1 className={adminStyles.pageTitle}>Produits</h1>
        <Button variant="primary" onClick={openAddModal}>+ Ajouter un produit</Button>
      </div>

      <div className={adminStyles.tableContainer}>
        <div className={adminStyles.tableScrollWrapper}>
          <table className={adminStyles.table}>
          <thead>
            <tr>
              <th>Image</th>
              <th>Nom</th>
              <th>Catégorie</th>
              <th>Stock</th>
              <th>Prix vente</th>
              <th>Prix achat</th>
              <th>Remise</th>
              <th>Marge</th>
              <th>Genre</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const m = margin(p);
              return (
                <tr key={p.id}>
                  <td>
                    <Image
                      src={p.image_url || '/placeholder.png'}
                      alt={p.title || 'Product'}
                      width={48}
                      height={48}
                      className={styles.productImage}
                      unoptimized
                    />
                  </td>
                  <td>{p.title}</td>
                  <td>{p.categories?.name ?? <span className={styles.noCost}>—</span>}</td>
                  <td>
                    {p.stock != null && p.stock > 0
                      ? <span style={{ color: 'var(--color-charcoal)' }}>{p.stock}</span>
                      : <span style={{ color: 'var(--color-error)' }}>Rupture</span>}
                  </td>
                  <td>{(p.final_price ?? p.price)?.toFixed(3)} TND</td>
                  <td>
                    {p.cost_price != null
                      ? <span className={styles.costPrice}>{p.cost_price.toFixed(3)} TND</span>
                      : <span className={styles.noCost}>—</span>}
                  </td>
                  <td>
                    {p.discount != null
                      ? <span className={styles.discountBadge}>-{Math.round(p.discount)}%</span>
                      : <span className={styles.noCost}>—</span>}
                  </td>
                  <td>
                    {m != null
                      ? <span className={m >= 0 ? styles.marginPos : styles.marginNeg}>{m.toFixed(3)} TND</span>
                      : <span className={styles.noCost}>—</span>}
                  </td>
                  <td>{p.gender}</td>
                  <td>
                    <div className={styles.actionBtns}>
                      <button className={styles.actionBtn} onClick={() => openEditModal(p)}>✏️ Éditer</button>
                      <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(p.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: 'center' }}>Aucun produit.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingProduct(null); }}
        title={editingProduct ? `Éditer — ${editingProduct.title}` : 'Ajouter un produit'}
      >
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Nom du produit</label>
            <input required type="text" className={styles.input} value={formData.title} onChange={set('title')} />
          </div>

          <div className={styles.priceRow}>
            <div className={styles.inputGroup}>
              <label>Prix original (TND)</label>
              <input required type="number" step="0.001" className={styles.input} value={formData.price} onChange={set('price')} placeholder="Ex: 89.900" />
            </div>
            <div className={styles.inputGroup}>
              <label>Prix après remise (TND)</label>
              <input
                type="number" step="0.001" className={styles.input}
                placeholder="Prix réduit"
                value={formData.final_price}
                onChange={set('final_price')}
                style={{ borderColor: formData.final_price ? 'var(--color-gold)' : undefined }}
              />
            </div>
          </div>

          <div className={styles.priceRow}>
            <div className={styles.inputGroup}>
              <label>Remise calculée (%)</label>
              <input type="number" step="0.01" className={styles.input} placeholder="Auto-calculée" value={formData.discount} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
            </div>
            <div className={styles.inputGroup}>
              <label>Prix d&apos;achat / coût (TND) 🔒</label>
              <input type="number" step="0.001" className={styles.input} placeholder="0.000" value={formData.cost_price} onChange={set('cost_price')} />
            </div>
          </div>

          <div className={styles.priceRow}>
            <div className={styles.inputGroup}>
              <label>Stock</label>
              <input type="number" step="1" className={styles.input} value={formData.stock} onChange={set('stock')} />
            </div>
            <div className={styles.inputGroup}>
              <label>Genre</label>
              <select className={styles.input} value={formData.gender} onChange={set('gender')}>
                <option value="unisex">Unisexe</option>
                <option value="homme">Homme</option>
                <option value="femme">Femme</option>
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label>Catégorie</label>
              <select className={styles.input} value={formData.category_id} onChange={set('category_id')}>
                <option value="">— Sans catégorie —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.priceRow}>
            <div className={styles.inputGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <label style={{ margin: 0 }}>Statut du produit :</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <span className={`${styles.slider} ${styles.sliderStatus}`}></span>
                </label>
                <span style={{ color: formData.is_active ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 600 }}>
                  {formData.is_active ? 'Actif' : 'Inactif (Rupture)'}
                </span>
              </div>
            </div>
            <div className={styles.inputGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <label style={{ margin: 0 }}>Gestion du stock :</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={formData.allow_unlimited_stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, allow_unlimited_stock: e.target.checked }))}
                  />
                  <span className={styles.slider}></span>
                </label>
                <span style={{ fontSize: '0.95rem' }}>
                  {formData.allow_unlimited_stock ? 'Stock Illimité (Dépot)' : 'Stock Limité (Auto-décrément)'}
                </span>
              </div>
            </div>
          </div>

          {/* Main image */}
          <div className={styles.inputGroup}>
            <label>Image principale</label>
            <ImageUpload
              value={formData.image_url}
              onChange={url => setFormData(prev => ({ ...prev, image_url: url }))}
              onUploading={status => setUploadingImage(status)}
            />
          </div>

          {/* Badge */}
          <div className={styles.priceRow}>
            <div className={styles.inputGroup}>
              <label>Badge promo (ex: #1 Meilleure vente)</label>
              <input type="text" className={styles.input} placeholder="Ex: #1 Meilleure vente" value={formData.badge} onChange={set('badge')} />
            </div>
            <div className={styles.inputGroup}>
              <label>Note (1–5)</label>
              <input type="number" step="0.1" min="1" max="5" className={styles.input} placeholder="4.5" value={formData.rating} onChange={set('rating')} />
            </div>
            <div className={styles.inputGroup}>
              <label>Nombre d&apos;avis</label>
              <input type="number" step="1" className={styles.input} placeholder="2875" value={formData.review_count} onChange={set('review_count')} />
            </div>
          </div>

          {/* Features */}
          <div className={styles.inputGroup}>
            <label>Points forts (une ligne = un bullet)</label>
            <textarea
              className={styles.input}
              rows={4}
              placeholder={`Protection UV400\nLentilles polarisées HD\nMonture légère TR90`}
              value={formData.features}
              onChange={set('features')}
            />
          </div>

          {/* Specs */}
          <div className={styles.inputGroup}>
            <label>Caractéristiques techniques</label>
            <div className={styles.specEditor}>
              {specRows.map((row, i) => (
                <div key={i} className={styles.specEditorRow}>
                  <input
                    className={styles.input}
                    placeholder="Ex: Matière"
                    value={row.key}
                    onChange={e => setSpecRows(prev => prev.map((r, idx) => idx === i ? { ...r, key: e.target.value } : r))}
                  />
                  <input
                    className={styles.input}
                    placeholder="Ex: TR90"
                    value={row.value}
                    onChange={e => setSpecRows(prev => prev.map((r, idx) => idx === i ? { ...r, value: e.target.value } : r))}
                  />
                  <button type="button" className={styles.specDelBtn} onClick={() => setSpecRows(prev => prev.filter((_, idx) => idx !== i))}>✕</button>
                </div>
              ))}
              <button
                type="button"
                className={styles.specAddBtn}
                onClick={() => setSpecRows(prev => [...prev, { key: '', value: '' }])}
              >
                + Ajouter une caractéristique
              </button>
            </div>
          </div>

          {/* Color Options */}
          <div className={styles.inputGroup}>
            <label>Variantes de couleurs (Optionnel)</label>
            <div className={styles.colorOptionsList}>
              {colorOptions.map((co, i) => (
                <div key={co.id} className={styles.colorOptionCard}>
                  <div className={styles.colorOptionImage}>
                    <p className={styles.pickerLabel} style={{ marginBottom: 4 }}>Image 1 <span style={{opacity:0.6}}>(vide = image principale)</span></p>
                    <ImageUpload
                      value={co.image_url}
                      onChange={url => setColorOptions(prev => prev.map((c, idx) => idx === i ? { ...c, image_url: url } : c))}
                      onUploading={status => setUploadingImage(status)}
                      folder="colors"
                    />
                  </div>
                  <div className={styles.colorOptionImage}>
                    <p className={styles.pickerLabel} style={{ marginBottom: 4 }}>Image 2 (opt)</p>
                    <ImageUpload
                      value={co.image_url2 || ''}
                      onChange={url => setColorOptions(prev => prev.map((c, idx) => idx === i ? { ...c, image_url2: url || null } : c))}
                      onUploading={status => setUploadingImage(status)}
                      folder="colors"
                    />
                  </div>
                  <div className={styles.colorOptionDetails}>
                    <input className={styles.input} placeholder="Nom (ex: Noir / Bleu)" value={co.name} onChange={e => setColorOptions(prev => prev.map((c, idx) => idx === i ? { ...c, name: e.target.value } : c))} />
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', marginBottom: '4px', fontSize: '0.9rem' }}>
                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          checked={co.isAvailable !== false}
                          onChange={(e) => setColorOptions(prev => prev.map((c, idx) => idx === i ? { ...c, isAvailable: e.target.checked } : c))}
                        />
                        <span className={`${styles.slider} ${styles.sliderStatus}`}></span>
                      </label>
                      <span style={{ color: co.isAvailable !== false ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 600 }}>
                        {co.isAvailable !== false ? 'Actif' : 'Inactif'}
                      </span>
                    </div>

                    <div className={styles.colorPickers}>
                      <div className={styles.pickerWrap}>
                        <label className={styles.pickerLabel}>Couleur 1</label>
                        <input type="color" value={co.hex1} onChange={e => setColorOptions(prev => prev.map((c, idx) => idx === i ? { ...c, hex1: e.target.value } : c))} title="Couleur Principale" className={styles.colorInput} />
                      </div>
                      <div className={styles.pickerWrap}>
                        <label className={styles.pickerLabel}>Couleur 2 (opt)</label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input type="color" value={co.hex2 || '#ffffff'} onChange={e => setColorOptions(prev => prev.map((c, idx) => idx === i ? { ...c, hex2: e.target.value } : c))} title="Couleur Secondaire (Optionnelle)" className={styles.colorInput} />
                          {co.hex2 && (
                            <button type="button" className={styles.specDelBtn} onClick={() => setColorOptions(prev => prev.map((c, idx) => idx === i ? { ...c, hex2: null } : c))} title="Retirer la 2ème couleur">✕</button>
                          )}
                        </div>
                      </div>
                    </div>
                    <button type="button" className={styles.specDelBtn} style={{ width: '100%' }} onClick={() => setColorOptions(prev => prev.filter((_, idx) => idx !== i))}>Supprimer cette variante</button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className={styles.specAddBtn}
                onClick={() => setColorOptions(prev => [...prev, { id: Math.random().toString(36).substring(2, 9), name: '', hex1: '#000000', hex2: null, image_url: '', image_url2: null }])}
              >
                + Ajouter une couleur
              </button>
            </div>
          </div>

          {/* Quantity Breaks */}
          <div className={styles.inputGroup}>
            <label>Offres de quantité (ex: 2 paires pour 110 TND)</label>
            <div className={styles.specEditor}>
              {quantityBreaks.map((qb, i) => (
                <div key={i} className={styles.specEditorRow} style={{ gap: '8px', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', color: 'var(--color-grey)', display: 'block', marginBottom: '4px' }}>Qté min</label>
                    <input
                      type="number"
                      className={styles.input}
                      placeholder="Qté min"
                      value={qb.min_qty}
                      onChange={e => setQuantityBreaks(prev => prev.map((q, idx) => idx === i ? { ...q, min_qty: parseInt(e.target.value) || 0 } : q))}
                    />
                  </div>
                  <div style={{ flex: 1.2 }}>
                    <label style={{ fontSize: '10px', color: 'var(--color-grey)', display: 'block', marginBottom: '4px' }}>Prix TOTAL (TND)</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        step="0.001"
                        className={styles.input}
                        placeholder="Prix total"
                        value={qb.total_price}
                        onChange={e => setQuantityBreaks(prev => prev.map((q, idx) => idx === i ? { ...q, total_price: parseFloat(e.target.value) || 0 } : q))}
                      />
                      {parseFloat(formData.price) > 0 && qb.total_price > 0 && (
                        <div style={{ fontSize: '10px', color: 'var(--color-gold)', marginTop: '2px', fontWeight: 'bold' }}>
                          Soit -{Math.round(100 - (qb.total_price / (parseFloat(formData.price) * qb.min_qty)) * 100)}% du prix original
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', color: 'var(--color-grey)', display: 'block', marginBottom: '4px' }}>Badge (opt)</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="ex: -10%"
                      value={qb.label || ''}
                      onChange={e => setQuantityBreaks(prev => prev.map((q, idx) => idx === i ? { ...q, label: e.target.value } : q))}
                    />
                  </div>
                  <button type="button" className={styles.specDelBtn} style={{ alignSelf: 'flex-end', marginBottom: '8px' }} onClick={() => setQuantityBreaks(prev => prev.filter((_, idx) => idx !== i))}>✕</button>
                </div>
              ))}
              <button
                type="button"
                className={styles.specAddBtn}
                onClick={() => setQuantityBreaks(prev => [...prev, { min_qty: 2, total_price: 0, label: '' }])}
              >
                + Ajouter un palier de quantité
              </button>
            </div>
          </div>

          {/* ── Gallery (edit mode only) ── */}
          {editingProduct && (
            <div className={styles.inputGroup}>
              <label>
                <ImageIcon size={14} style={{ display: 'inline', marginRight: 6 }} />
                Photos supplémentaires
              </label>

              <div className={styles.galleryGrid}>
                {galleryImages.map(img => (
                  <div key={img.id} className={styles.galleryThumb}>
                    <Image
                      src={img.image_url}
                      alt="Gallery image"
                      width={80}
                      height={80}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      unoptimized
                    />
                    <button
                      type="button"
                      className={styles.galleryDelBtn}
                      onClick={() => handleGalleryDelete(img.id)}
                      title="Supprimer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}

                {/* Add button */}
                <button
                  type="button"
                  className={styles.galleryAddBtn}
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={galleryPhase !== 'idle'}
                  title="Ajouter une photo"
                >
                  {galleryPhase !== 'idle' ? (
                    <>
                      <Loader2 size={20} className={styles.gallerySpinner} />
                      <span style={{ fontSize: '11px' }}>
                        {galleryPhase === 'compressing' ? 'Compression...' : 'Envoi R2...'}
                      </span>
                    </>
                  ) : (
                    <><PlusCircle size={20} /><span>Ajouter</span></>
                  )}
                </button>

                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleGalleryFileChange}
                />
              </div>
              <p className={styles.galleryHint}>
                Ces photos s&apos;affichent dans la galerie de la page produit.
              </p>
              {galleryError && (
                <p role="alert" style={{ color: 'var(--color-error)', marginTop: '8px', fontSize: '12px' }}>
                  {galleryError}
                </p>
              )}
            </div>
          )}

          <div className={styles.inputGroup}>
            <label>Description</label>
            <textarea className={styles.input} rows={3} value={formData.description} onChange={set('description')} />
          </div>

          <Button
            type="submit"
            variant="primary"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={submitting || uploadingImage || galleryPhase !== 'idle'}
          >
            {submitting ? 'Enregistrement...'
              : uploadingImage ? 'Compression / Envoi...'
              : editingProduct ? '💾 Enregistrer les modifications'
              : 'Ajouter le produit'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
