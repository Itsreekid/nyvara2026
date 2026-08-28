'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react';
import { useCategories } from '@/hooks/useOrders';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslation } from '@/locales/dictionary';
import type { ProductFilters, Gender } from '@/types';
import styles from './FilterSidebar.module.css';

interface FilterSidebarProps {
  filters: ProductFilters;
  onChange: (filters: ProductFilters) => void;
  onReset: () => void;
}

const FRAME_SHAPES_MAP = [
  { val: 'Rond Classique', key: 'shapes.round' },
  { val: 'Aviateur', key: 'shapes.aviator' },
  { val: 'Œil-de-chat', key: 'shapes.cateye' },
  { val: 'Carrée', key: 'shapes.square' },
  { val: 'Rectangulaire', key: 'shapes.rectangular' },
  { val: 'Géométrique', key: 'shapes.geometric' },
];

export default function FilterSidebar({ filters, onChange, onReset }: FilterSidebarProps) {
  const { categories, loading } = useCategories();
  const { language } = useLanguage();
  const t = (path: string) => getTranslation(language, path);

  const [openSections, setOpenSections] = useState({ gender: true, category: true, price: true, frameShape: true });
  const [mobileOpen, setMobileOpen] = useState(false);

  const GENDERS: { value: Gender | 'all'; label: string }[] = [
    { value: 'all',    label: t('shop.filterAll') },
    { value: 'homme',  label: t('shop.filterMen') },
    { value: 'femme',  label: t('shop.filterWomen') },
    { value: 'unisex', label: t('shop.filterUnisex') },
  ];

  const toggle = (section: keyof typeof openSections) =>
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));

  const hasActiveFilters =
    (filters.gender && filters.gender !== 'all') ||
    filters.category_id ||
    filters.frame_shape ||
    filters.min_price !== undefined ||
    filters.max_price !== undefined;

  const content = (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <span className={styles.sidebarTitle}>{t('shop.filterTitle')}</span>
        {hasActiveFilters && (
          <button className={styles.resetBtn} onClick={onReset}>
            <X size={12} /> {language === 'fr' ? 'Effacer tout' : 'امسح الكل'}
          </button>
        )}
      </div>

      {/* Gender */}
      <div className={styles.section}>
        <button className={styles.sectionToggle} onClick={() => toggle('gender')}>
          <span>{t('shop.filterGender')}</span>
          {openSections.gender ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {openSections.gender && (
          <div className={styles.options}>
            {GENDERS.map(g => (
              <label key={g.value} className={styles.optionLabel}>
                <input
                  type="radio"
                  name="gender"
                  value={g.value}
                  checked={(filters.gender ?? 'all') === g.value}
                  onChange={() => onChange({ ...filters, gender: g.value })}
                  className={styles.radio}
                />
                <span className={styles.optionText}>{g.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Frame Shape */}
      <div className={styles.section}>
        <button className={styles.sectionToggle} onClick={() => toggle('frameShape')}>
          <span>{t('shop.filterFrameShape')}</span>
          {openSections.frameShape ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {openSections.frameShape && (
          <div className={styles.options}>
            <label className={styles.optionLabel}>
              <input
                type="radio"
                name="frame_shape"
                value=""
                checked={!filters.frame_shape}
                onChange={() => onChange({ ...filters, frame_shape: undefined })}
                className={styles.radio}
              />
              <span className={styles.optionText}>{t('shop.filterAllShapes')}</span>
            </label>
            {FRAME_SHAPES_MAP.map(shape => (
              <label key={shape.val} className={styles.optionLabel}>
                <input
                  type="radio"
                  name="frame_shape"
                  value={shape.val}
                  checked={filters.frame_shape === shape.val}
                  onChange={() => onChange({ ...filters, frame_shape: shape.val })}
                  className={styles.radio}
                />
                <span className={styles.optionText}>{t(shape.key)}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Category */}
      <div className={styles.section}>
        <button className={styles.sectionToggle} onClick={() => toggle('category')}>
          <span>Catégorie</span>
          {openSections.category ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {openSections.category && (
          <div className={styles.options}>
            <label className={styles.optionLabel}>
              <input
                type="radio"
                name="category"
                value=""
                checked={!filters.category_id}
                onChange={() => onChange({ ...filters, category_id: undefined })}
                className={styles.radio}
              />
              <span className={styles.optionText}>Toutes les catégories</span>
            </label>
            {!loading && categories.map(cat => (
              <label key={cat.id} className={styles.optionLabel}>
                <input
                  type="radio"
                  name="category"
                  value={cat.id}
                  checked={filters.category_id === cat.id}
                  onChange={() => onChange({ ...filters, category_id: cat.id })}
                  className={styles.radio}
                />
                <span className={styles.optionText}>{cat.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className={styles.desktopWrap}>{content}</div>

      {/* Mobile toggle */}
      <div className={styles.mobileWrap}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setMobileOpen(true)}
        >
          <SlidersHorizontal size={14} />
          Filtres {hasActiveFilters ? '•' : ''}
        </Button>

        {mobileOpen && (
          <div className={styles.mobileDrawer}>
            <div className={styles.mobileDrawerInner}>
              <div className={styles.mobileDrawerHeader}>
                <span>Filtres</span>
                <button onClick={() => setMobileOpen(false)} aria-label="Fermer les filtres">
                  <X size={20} />
                </button>
              </div>
              {content}
              <div className={styles.mobileApply}>
                <Button variant="primary" fullWidth onClick={() => setMobileOpen(false)}>
                  Appliquer les filtres
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
