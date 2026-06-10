'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useCreateOrder } from '@/hooks/useOrders';
import { Check, Loader2, ShieldCheck, Truck, CreditCard } from 'lucide-react';
import styles from './CheckoutForm.module.css';
import { fbEvent, trackPurchase } from '@/components/analytics/FacebookPixel';
import { buildPurchaseContents } from '@/lib/meta-purchase';

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
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Fire InitiateCheckout once when form mounts (user is in checkout)
  useEffect(() => {
    fbEvent.initiateCheckout({
      value:     total,
      num_items: items.reduce((s, i) => s + i.quantity, 0),
    });
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

    if (!formData.nom || !formData.email || !formData.adresse || !formData.ville || !formData.telephone) {
      setErrorLocal('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setErrorLocal(null);

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
      const contents = buildPurchaseContents(items);

      // Fire Purchase on both client pixel + server CAPI for reliable attribution
      await trackPurchase({
        order_id:    String(result.id ?? Date.now()),
        value:       total,
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
    } else {
      setErrorLocal('Erreur lors de la commande. Veuillez réessayer.');
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* SECTION: Livraison */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Livraison</h3>
        
        <div className={styles.inputGroup}>
          <label className={styles.checkboxLabel}>Pays/région</label>
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
              placeholder="Prénom (optionnel)"
              className={styles.input}
              value={formData.prenom}
              onChange={handleChange}
            />
          </div>
          <div className={styles.inputGroup}>
            <input
              type="text"
              name="nom"
              placeholder="Nom"
              className={styles.input}
              value={formData.nom}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <input
            type="text"
            name="adresse"
            placeholder="Adresse"
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
              placeholder="Code postal (facultatif)"
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
              <option value="" disabled>Sélectionnez une ville</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.inputGroup}>
          <input
            type="tel"
            name="telephone"
            placeholder="Téléphone"
            className={styles.input}
            value={formData.telephone}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <input
            type="email"
            name="email"
            placeholder="E-mail pour le suivi"
            className={styles.input}
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <label className={styles.checkboxGroup}>
          <input
            type="checkbox"
            name="saveInfo"
            className={styles.checkbox}
            checked={formData.saveInfo}
            onChange={handleChange}
          />
          <span className={styles.checkboxLabel}>Sauvegarder mes coordonnées pour la prochaine fois</span>
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
        <div className={styles.sectionTitle}>
          <CreditCard size={18} style={{ marginRight: '8px' }} />
          Paiement
        </div>
        <div className={styles.infoBox}>
          <p className={styles.infoText}>Toutes les transactions sont sécurisées et chiffrées.</p>
        </div>
        <div className={`${styles.paymentOption} ${styles.paymentActive}`}>
          <div className={styles.optionLabel}>
            <span className={styles.optionTitle}>Paiement à la livraison</span>
            <span className={styles.infoText}>Payez en espèces dès réception de votre commande.</span>
          </div>
        </div>
      </div>

      {/* SECTION: Adresse de facturation */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Adresse de facturation</h3>
        <div className={`${styles.paymentOption} ${styles.paymentActive}`}>
          <div className={styles.checkboxGroup}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--color-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />
            </div>
            <span className={styles.checkboxLabel}>Identique à l'adresse de livraison</span>
          </div>
        </div>
      </div>

      {errorLocal && <p style={{ color: 'var(--color-error)', fontSize: '13px', textAlign: 'center' }}>{errorLocal}</p>}

      <button type="submit" className={styles.submitBtn} disabled={loading || items.length === 0}>
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Traitement...
          </>
        ) : (
          <>
            Valider le paiement
          </>
        )}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px', color: 'var(--color-grey-light)', fontSize: '12px' }}>
        <ShieldCheck size={14} />
        <span>Paiement sécurisé et garanti</span>
      </div>
    </form>
  );
}
