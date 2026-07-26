'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import adminStyles from '@/app/admin/admin.module.css';
import styles from './trending.module.css';
import type { TrendingProduct } from '@/types';
import {
  RefreshCw, Tag, TrendingUp, Package, Search, ArrowUpDown,
  ArrowUp, ArrowDown,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type SortKey = 'trending_score' | 'views_7d' | 'carts_7d' | 'orders_7d' | 'stock';
type SortDir = 'asc' | 'desc';

interface Toast {
  type: 'success' | 'error';
  message: string;
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ products }: { products: TrendingProduct[] }) {
  const totalViews  = products.reduce((s, p) => s + p.views_7d,  0);
  const totalCarts  = products.reduce((s, p) => s + p.carts_7d,  0);
  const totalOrders = products.reduce((s, p) => s + p.orders_7d, 0);
  const tagged      = products.filter(p => p.custom_label_0 === 'trending').length;

  return (
    <div className={styles.statsRow}>
      <div className={styles.statCard}>
        <div className={styles.statIcon}>👁️</div>
        <div className={styles.statLabel}>Vues (7 jours)</div>
        <div className={styles.statValue}>{totalViews.toLocaleString('fr-FR')}</div>
        <div className={styles.statSub}>sur {products.length} produits</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statIcon}>🛒</div>
        <div className={styles.statLabel}>Ajouts Panier (7 jours)</div>
        <div className={styles.statValue}>{totalCarts.toLocaleString('fr-FR')}</div>
        <div className={styles.statSub}>Add-to-cart total</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statIcon}>📦</div>
        <div className={styles.statLabel}>Commandes (7 jours)</div>
        <div className={styles.statValue}>{totalOrders.toLocaleString('fr-FR')}</div>
        <div className={styles.statSub}>Conversions directes</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statIcon}>🏷️</div>
        <div className={styles.statLabel}>Tagués Trending</div>
        <div className={styles.statValue}>{tagged}</div>
        <div className={styles.statSub}>custom_label_0 = "trending"</div>
      </div>
    </div>
  );
}

// ─── Sort Icon helper ─────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown size={12} />;
  return sortDir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TrendingPage() {
  const [products, setProducts]   = useState<TrendingProduct[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tagging, setTagging]     = useState(false);
  const [tagDone, setTagDone]     = useState(false);
  const [search, setSearch]       = useState('');
  const [toast, setToast]         = useState<Toast | null>(null);
  const [sortKey, setSortKey]     = useState<SortKey>('trending_score');
  const [sortDir, setSortDir]     = useState<SortDir>('desc');
  const [trendingLimit, setTrendingLimit] = useState<number>(20);

  // ── Fetch trending data ───────────────────────────────────────────────────

  const fetchTrending = useCallback(async () => {
    setLoading(true);
    setTagDone(false);
    try {
      const res = await fetch('/api/trending');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: TrendingProduct[] = await res.json();
      setProducts(data);
    } catch (err) {
      console.error('[Trending] fetch error:', err);
      showToast('error', 'Impossible de charger les données. Vérifiez la connexion Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrending(); }, [fetchTrending]);

  // ── Auto-dismiss toast ─────────────────────────────────────────────────────

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Tag top-15 action ──────────────────────────────────────────────────────

  const handleTagTop15 = async () => {
    if (products.length === 0 || tagging) return;

    const allInStockIds = products
      .filter(p => (p.stock ?? 0) > 0)
      .map(p => p.product_id);

    if (allInStockIds.length === 0) {
      showToast('error', 'Aucun produit en stock à taguer.');
      return;
    }

    setTagging(true);
    try {
      const res = await fetch('/api/trending/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: allInStockIds, limit: trendingLimit }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const result = await res.json();
      setTagDone(true);

      const finalTaggedIds = result.tagged_ids || [];

      // Optimistic update — mark tagged products locally
      setProducts(prev =>
        prev.map(p => ({
          ...p,
          custom_label_0: finalTaggedIds.includes(p.product_id) ? 'trending' : null,
        }))
      );

      showToast('success', `✅ ${result.tagged} produits tagués comme "trending" dans le catalogue Meta !`);
    } catch (err: any) {
      console.error('[Trending Tag] error:', err);
      showToast('error', `Erreur : ${err.message}`);
      setTagDone(false);
    } finally {
      setTagging(false);
    }
  };

  // ── Sort handler ───────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  // ── Derived / filtered data ────────────────────────────────────────────────

  const maxScore = useMemo(
    () => Math.max(...products.map(p => p.trending_score), 1),
    [products]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const base = q
      ? products.filter(p => (p.title ?? '').toLowerCase().includes(q))
      : products;

    return [...base].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === 'desc'
        ? (bv as number) - (av as number)
        : (av as number) - (bv as number);
    });
  }, [products, search, sortKey, sortDir]);

  // ─────────────────────────────────────────────────────────────────────────

  const RANK_EMOJI = ['🥇', '🥈', '🥉'];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={adminStyles.pageTitle}>📈 Trending Analytics</h1>
          <div className={styles.subtitle}>
            Score pondéré sur les 7 derniers jours · uniquement les produits en stock
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.refreshBtn}
            onClick={fetchTrending}
            disabled={loading}
            aria-label="Rafraîchir les données"
            id="trending-refresh-btn"
          >
            <RefreshCw size={15} className={loading ? styles.spinning : undefined} />
            {loading ? 'Chargement...' : 'Rafraîchir'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              min="1"
              max="100"
              className={styles.searchInput}
              style={{ width: '80px', height: '36px', padding: '0 8px' }}
              value={trendingLimit}
              onChange={e => setTrendingLimit(Number(e.target.value) || 1)}
              disabled={tagging || loading}
              title="Nombre de produits à taguer (1 à 100)"
            />

            <button
              className={`${styles.tagBtn} ${tagDone ? styles.tagBtnSuccess : ''}`}
              onClick={handleTagTop15}
              disabled={tagging || loading || products.length === 0}
              id="trending-tag-top15-btn"
            >
              <Tag size={15} />
              {tagging
                ? 'Tagging en cours...'
                : tagDone
                ? '✓ Catalogue mis à jour !'
                : 'Appliquer Tag Trending'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      {!loading && products.length > 0 && (
        <SummaryCards products={products} />
      )}

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input
              id="trending-search"
              className={styles.searchInput}
              placeholder="Rechercher un produit..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Rechercher un produit dans le classement"
            />
          </div>
        </div>
        <div className={styles.toolbarRight}>
          <span className={styles.resultCount}>
            {loading ? '—' : `${filtered.length} produit${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className={styles.tableCard}>
        <div className={styles.tableScroll}>
          <table className={styles.table} aria-label="Classement trending produits">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Rang</th>
                <th>Produit</th>
                <th onClick={() => handleSort('views_7d')} title="Trier par vues">
                  <span className={styles.thInner}>
                    Vues <SortIcon col="views_7d" sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
                <th onClick={() => handleSort('carts_7d')} title="Trier par paniers">
                  <span className={styles.thInner}>
                    Paniers <SortIcon col="carts_7d" sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
                <th onClick={() => handleSort('orders_7d')} title="Trier par commandes">
                  <span className={styles.thInner}>
                    Commandes <SortIcon col="orders_7d" sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
                <th onClick={() => handleSort('stock')} title="Trier par stock">
                  <span className={styles.thInner}>
                    Stock <SortIcon col="stock" sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
                <th onClick={() => handleSort('trending_score')} title="Trier par score">
                  <span className={styles.thInner}>
                    Score Trending <SortIcon col="trending_score" sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              {/* ── Loading Skeleton ── */}
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className={styles.skeletonRow}>
                  <td><div className={styles.skeletonLine} style={{ width: 28 }} /></td>
                  <td>
                    <div className={styles.productCell}>
                      <div className={styles.thumbPlaceholder} />
                      <div className={styles.skeletonLine} style={{ width: 140, height: 14 }} />
                    </div>
                  </td>
                  {[60, 50, 55, 40, 90].map((w, j) => (
                    <td key={j}><div className={styles.skeletonLine} style={{ width: w }} /></td>
                  ))}
                </tr>
              ))}

              {/* ── Empty State ── */}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 0, border: 'none' }}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>
                        {search ? '🔍' : '📊'}
                      </div>
                      <div className={styles.emptyTitle}>
                        {search ? 'Aucun résultat trouvé' : 'Aucune donnée disponible'}
                      </div>
                      <div className={styles.emptyDesc}>
                        {search
                          ? `Aucun produit ne correspond à "${search}".`
                          : 'La table product_daily_stats est vide. Les données apparaîtront une fois que les événements de vues, paniers et commandes seront enregistrés.'}
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {/* ── Data Rows ── */}
              {!loading && filtered.map((product, idx) => {
                // Rank is based on the original sorted-by-score order
                const globalRank = products.findIndex(p => p.product_id === product.product_id) + 1;
                const isTop3 = globalRank <= 3;
                const isTagged = product.custom_label_0 === 'trending';
                const stockNum = product.stock ?? 0;
                const scorePercent = Math.round((product.trending_score / maxScore) * 100);

                return (
                  <tr key={product.product_id}>
                    {/* Rank */}
                    <td>
                      <div className={styles.rankCell}>
                        {isTop3 ? (
                          <span className={styles.trophyIcon}>{RANK_EMOJI[globalRank - 1]}</span>
                        ) : (
                          <span className={`${styles.rankNum} ${isTagged ? styles.rankTop : ''}`}>
                            {globalRank}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Product */}
                    <td>
                      <div className={styles.productCell}>
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.title ?? ''}
                            className={styles.thumb}
                            loading="lazy"
                          />
                        ) : (
                          <div className={styles.thumbPlaceholder}>
                            <Package size={18} />
                          </div>
                        )}
                        <div>
                          <div className={styles.productName}>{product.title ?? '—'}</div>
                          {product.custom_label_0 === 'trending' && (
                            <span className={styles.trendingBadge}>
                              <TrendingUp size={9} />
                              Trending
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Views */}
                    <td>
                      <span className={product.views_7d > 0 ? styles.statNum : styles.statNumDim}>
                        {product.views_7d > 0
                          ? product.views_7d.toLocaleString('fr-FR')
                          : '—'}
                      </span>
                    </td>

                    {/* Carts */}
                    <td>
                      <span className={product.carts_7d > 0 ? styles.statNum : styles.statNumDim}>
                        {product.carts_7d > 0
                          ? product.carts_7d.toLocaleString('fr-FR')
                          : '—'}
                      </span>
                    </td>

                    {/* Orders */}
                    <td>
                      <span className={product.orders_7d > 0 ? styles.statNum : styles.statNumDim}>
                        {product.orders_7d > 0
                          ? product.orders_7d.toLocaleString('fr-FR')
                          : '—'}
                      </span>
                    </td>

                    {/* Stock */}
                    <td>
                      <span className={`${styles.stockBadge} ${stockNum <= 5 ? styles.stockBadgeLow : ''}`}>
                        {stockNum}
                      </span>
                    </td>

                    {/* Score */}
                    <td>
                      <div className={styles.scoreCell}>
                        <div className={styles.scoreValue}>
                          {product.trending_score % 1 === 0
                            ? product.trending_score.toLocaleString('fr-FR')
                            : product.trending_score.toFixed(1).replace('.', ',')}
                        </div>
                        <div className={styles.scoreBar}>
                          <div
                            className={styles.scoreBarFill}
                            style={{ width: `${scorePercent}%` }}
                            role="progressbar"
                            aria-valuenow={scorePercent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Formula Note ── */}
      {!loading && products.length > 0 && (
        <div className={styles.formulaNote}>
          <TrendingUp size={13} />
          Formule :&nbsp;
          <code>(Commandes × 5) + (Paniers × 2) + (Vues × 0,5)</code>
          &nbsp;· Produits en stock uniquement · Fenêtre : 7 derniers jours
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
