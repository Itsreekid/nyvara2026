'use client';

import type { SortOption } from '@/types';
import styles from './SortBar.module.css';

interface SortBarProps {
  total: number;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest',     label: 'Plus récents' },
  { value: 'tendance',   label: 'Tendance' },
  { value: 'price_asc',  label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'name_asc',   label: 'Nom: A–Z' },
];

export default function SortBar({ total, sort, onSortChange }: SortBarProps) {
  // netlify build trigger
  return (
    <div className={styles.bar}>
      <p className={styles.count}>
        <span className={styles.countNum}>{total}</span>
        {total === 1 ? ' produit' : ' produits'}
      </p>
      <div className={styles.sortWrap}>
        <label htmlFor="sort-select" className={styles.sortLabel}>Trier par</label>
        <select
          id="sort-select"
          className={styles.select}
          value={sort}
          onChange={e => onSortChange(e.target.value as SortOption)}
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
