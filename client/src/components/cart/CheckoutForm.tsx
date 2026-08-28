'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useCreateOrder } from '@/hooks/useOrders';
import { Check, Loader2, ShieldCheck, Truck, CreditCard } from 'lucide-react';
import styles from './CheckoutForm.module.css';
import { fbEvent, trackPurchase } from '@/components/analytics/FacebookPixel';
import { buildPurchaseContents } from '@/lib/meta-purchase';
import { persistMetaIdentity } from '@/lib/meta-identity';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslation } from '@/locales/dictionary';

const CITIES = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba', 'Kairouan',
  'Kasserine', 'Kebili', 'Le Kef', 'Mahdia', 'Manouba', 'Medenine', 'Monastir', 'Nabeul',
  'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan'
];

interface CheckoutFormProps {
  onSuccess: (orderId: string) => void;
}

export default function CheckoutForm({ onSuccess }: CheckoutFormProps) {
  const { items, total, clearCart } = useCart();
  const { createOrder, loading } = useCreateOrder();
  const { language } = useLanguage();
  const t = (path: string) => getTranslation(language, path);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const icEventId = React.useRef<string | null>(null);

  // Fire InitiateCheckout once when form mounts (user is in checkout)
  useEffect(() => {
    if (!icEventId.current) {
      icEventId.current = `ic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
    const contents = buildPurchaseContents(items);
    fbEvent.initiateCheckout({
      value:     total,
      num_items: items.reduce((s, i) => s + i.quantity, 0),
      content_ids: items.map(i => String(i.product.id)),
      contents,
    }, icEventId.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    adresse: '',
    code_postal: '',
    ville: '',
    telephone: '',
    pays: 'Tunisie',
    saveInfo: false,
    identicalBilling: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (isSubmitting) return;
  setIsSubmitting(true);

    if (!formData.nom || !formData.email || !formData.adresse || !formData.ville || !formData.telephone) {
      setErrorLocal('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setErrorLocal(null);

    // ── Persist identity to localStorage before firing CAPI events ──────────
    // This is a fail-safe fallback. onBlur handlers will have already saved
    // most fields as the user typed; this covers fields not yet blurred.
    persistMetaIdentity({
      email:     formData.email,
      phone:     formData.telephone,
      firstName: formData.prenom,
      lastName:  formData.nom,
    });

    // Enrich InitiateCheckout with user data right before proceeding
    const formContents = buildPurchaseContents(items);
    let formattedPhone = formData.telephone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('216')) formattedPhone = '216' + formattedPhone;
    
    fbEvent.initiateCheckout({
      value:     total,
      num_items: items.reduce((s, i) => s + i.quantity, 0),
      content_ids: items.map(i => String(i.product.id)),
      contents: formContents,
      email: formData.email,
      phone: formattedPhone,
    }, icEventId.current || undefined);

    const payload = {
      customer_name: `${formData.prenom} ${formData.nom}`.trim(),
      customer_email: formData.email,
      phone: formData.telephone,
      city: formData.ville,
      postal_code: formData.code_postal,
      country: formData.pays,
      address: formData.adresse,
      items: items.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        selected_color: item.selected_color,
      })),
    };

  const result = await createOrder(payload);

  if (result) {
      const actualTotal = (result as any).total_price ?? total;
      const contents = buildPurchaseContents(items);

      // Save user data for EMQ improvements
      localStorage.setItem('nyvara_user_email', formData.email);
      localStorage.setItem('nyvara_user_phone', formData.telephone);

      // Fire Purchase on both client pixel + server CAPI for reliable attribution
      await trackPurchase({
        order_id:    String(result.id ?? Date.now()),
        value:       actualTotal,
        email:       formData.email,
        phone:       formData.telephone,
        first_name:  formData.prenom || undefined,
        last_name:   formData.nom,
        city:        formData.ville,
        country:     formData.pays,
        content_ids: items.map(i => String(i.product.id)),
        contents,
        num_items:   items.reduce((s, i) => s + i.quantity, 0),
      });
    clearCart();
    onSuccess(result.id);
    setIsSubmitting(false);
  } else {
    setErrorLocal('Erreur lors de la commande. Veuillez réessayer.');
    setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* SECTION: Livraison */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('checkout.shippingInfoTitle')}</h3>
        
        <div className={styles.inputGroup}>
          <label className={styles.checkboxLabel}>{t('checkout.country')}</label>
          <select 
            name="pays" 
            className={`${styles.input} ${styles.select}`}
            value={formData.pays}
            onChange={handleChange}
          >
            <option value="Tunisie">Tunisie</option>
          </select>
        </div>

        <div className={styles.grid}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              name="prenom"
              placeholder={t('checkout.firstName')}
              className={styles.input}
              value={formData.prenom}
              onChange={handleChange}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  persistMetaIdentity({ firstName: e.target.value });
                }
              }}
            />
          </div>
          <div className={styles.inputGroup}>
            <input
              type="text"
              name="nom"
              placeholder={t('checkout.lastName')}
              className={styles.input}
              value={formData.nom}
              onChange={handleChange}
              required
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  persistMetaIdentity({ lastName: e.target.value });
                }
              }}
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <input
            type="text"
            name="adresse"
            placeholder={t('checkout.addressPlaceholder')}
            className={styles.input}
            value={formData.adresse}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.grid}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              name="code_postal"
              placeholder={t('checkout.postalCode')}
              className={styles.input}
              value={formData.code_postal}
              onChange={handleChange}
            />
          </div>
          <div className={styles.inputGroup}>
            <select
              name="ville"
              className={`${styles.input} ${styles.select}`}
              value={formData.ville}
              onChange={handleChange}
              required
            >
              <option value="" disabled>{t('checkout.cityPlaceholder')}</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.inputGroup}>
          <input
            type="tel"
            name="telephone"
            placeholder={t('checkout.phonePlaceholder')}
            className={styles.input}
            value={formData.telephone}
            onChange={handleChange}
            required
            onBlur={(e) => {
              if (e.target.value.trim()) {
                persistMetaIdentity({ phone: e.target.value });
              }
            }}
          />
        </div>

        <div className={styles.inputGroup}>
          <input
            type="email"
            name="email"
            placeholder={t('checkout.emailPlaceholder')}
            className={styles.input}
            value={formData.email}
            onChange={handleChange}
            required
            onBlur={(e) => {
              if (e.target.value.includes('@')) {
                persistMetaIdentity({ email: e.target.value });
              }
            }}
          />
        </div>

        <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="saveInfo"
              checked={formData.saveInfo}
              onChange={handleChange}
              className={styles.checkbox}
            />
            <span>{t('checkout.saveInfo')}</span>
          </label>
      </div>

      {/* SECTION: Mode d'expédition */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <Truck size={18} style={{ marginRight: '8px' }} />
          Mode d'expédition
        </div>
        <div className={styles.optionCard}>
          <div className={styles.optionLabel}>
            <span className={styles.optionTitle}>Standard</span>
          </div>
          <span className={styles.optionPrice}>Gratuit</span>
        </div>
      </div>

      {/* SECTION: Paiement */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('checkout.paymentTitle')}</h3>
        <p className={styles.sectionSubtitle}>{t('checkout.paymentSubtitle')}</p>

        <div className={styles.paymentMethod}>
          <div className={styles.paymentMethodHeader}>
            <span className={styles.radioGroup}>
              <input type="radio" checked readOnly className={styles.radio} />
              <span className={styles.methodName}>{t('checkout.codTitle')}</span>
            </span>
            <CreditCard size={20} className={styles.methodIcon} />
          </div>
          <div className={styles.paymentMethodBody}>
            <ShieldCheck size={24} className={styles.shieldIcon} />
            <p>{t('checkout.codDesc')}</p>
          </div>
        </div>
      </div>

      {/* SECTION: Adresse de facturation */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('checkout.billingTitle')}</h3>
        
        <div className={styles.paymentMethod}>
          <div className={styles.paymentMethodHeader}>
            <span className={styles.radioGroup}>
              <input type="radio" checked readOnly className={styles.radio} />
              <span className={styles.methodName}>{t('checkout.billingSame')}</span>
            </span>
          </div>
        </div>
      </div>

      {errorLocal && <p style={{ color: 'var(--color-error)', fontSize: '13px', textAlign: 'center' }}>{errorLocal}</p>}

      <button 
        type="submit" 
        className={styles.submitBtn}
        disabled={isSubmitting || loading}
      >
        {isSubmitting || loading ? (
          <span className={styles.loadingState}>
            <Loader2 className={styles.spinner} size={20} />
            Traitement...
          </span>
        ) : (
          t('checkout.confirmOrderBtn')
        )}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px', color: 'var(--color-grey-light)', fontSize: '12px' }}>
        <ShieldCheck size={14} />
        <span>Paiement sécurisé et garanti</span>
      </div>
    </form>
  );
}
