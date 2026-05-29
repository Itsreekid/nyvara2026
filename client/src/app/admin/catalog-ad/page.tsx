'use client';

import { useState, useMemo } from 'react';
import { useProducts } from '@/hooks/useProducts';
import type { Product } from '@/types';
import adminStyles from '@/app/admin/admin.module.css';
import styles from './catalog-ad.module.css';
import {
  Search, CheckSquare, Square, Download,
  FileText, FileCode, Package, Info, Link2, Copy, CheckCheck,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SITE_URL = 'https://nyvara.net';

function formatPrice(p: number) {
  // Meta requires price in format "XX.XX TND"
  return `${p.toFixed(3)} TND`;
}

function productToXmlItem(p: Product): string {
  const title       = (p.title ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const description = (p.description ?? 'Lunettes de soleil Nyvara').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const price       = formatPrice(p.final_price ?? p.price ?? 0);
  const link        = `${SITE_URL}/shop/${p.id}`;
  const imageLink   = p.image_url ?? '';
  const availability = (p.stock ?? 0) > 0 ? 'in stock' : 'out of stock';
  const brand       = 'Nyvara';
  const condition   = 'new';
  const gender      = p.gender === 'homme' ? 'male' : p.gender === 'femme' ? 'female' : 'unisex';

  return `  <item>
    <g:id>${p.id}</g:id>
    <g:title>${title}</g:title>
    <g:description>${description}</g:description>
    <g:link>${link}</g:link>
    <g:image_link>${imageLink}</g:image_link>
    <g:availability>${availability}</g:availability>
    <g:price>${price}</g:price>
    <g:brand>${brand}</g:brand>
    <g:condition>${condition}</g:condition>
    <g:google_product_category>Apparel &amp; Accessories &gt; Clothing Accessories &gt; Sunglasses</g:google_product_category>
    <g:gender>${gender}</g:gender>${p.badge ? `\n    <g:custom_label_0>${p.badge}</g:custom_label_0>` : ''}
  </item>`;
}

function buildXml(products: Product[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Nyvara — Catalogue Produits</title>
    <link>${SITE_URL}</link>
    <description>Catalogue Meta Dynamic Ads — Nyvara Sunglasses</description>
${products.map(productToXmlItem).join('\n')}
  </channel>
</rss>`;
}

function buildCsv(products: Product[]): string {
  const header = 'id,title,description,availability,condition,price,link,image_link,brand,gender';
  const rows = products.map(p => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [
      esc(p.id),
      esc(p.title ?? ''),
      esc(p.description ?? 'Lunettes de soleil Nyvara'),
      esc((p.stock ?? 0) > 0 ? 'in stock' : 'out of stock'),
      esc('new'),
      esc(formatPrice(p.final_price ?? p.price ?? 0)),
      esc(`${SITE_URL}/shop/${p.id}`),
      esc(p.image_url ?? ''),
      esc('Nyvara'),
      esc(p.gender === 'homme' ? 'male' : p.gender === 'femme' ? 'female' : 'unisex'),
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CatalogAdPage() {
  const { products, loading } = useProducts();
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<'xml' | 'csv'>('xml');
  const [exported, setExported] = useState(false);
  const [copied, setCopied] = useState(false);

  const FEED_URL = 'https://nyvara.net/api/meta/feed';

  const copyFeedUrl = () => {
    navigator.clipboard.writeText(FEED_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p =>
      (p.title ?? '').toLowerCase().includes(q) ||
      (p.categories?.name ?? '').toLowerCase().includes(q)
    );
  }, [products, search]);

  const selectedProducts = useMemo(
    () => products.filter(p => selected.has(p.id)),
    [products, selected]
  );

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setExported(false);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.id)));
    }
    setExported(false);
  };

  const handleExport = () => {
    if (selected.size === 0) return;
    const date = new Date().toISOString().slice(0, 10);
    if (exportFormat === 'xml') {
      downloadFile(buildXml(selectedProducts), `nyvara-catalog-${date}.xml`, 'application/xml');
    } else {
      downloadFile(buildCsv(selectedProducts), `nyvara-catalog-${date}.csv`, 'text/csv');
    }
    setExported(true);
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id));

  return (
    <div>
      {/* Page Header */}
      <div className={adminStyles.pageHeader}>
        <h1 className={adminStyles.pageTitle}>📢 Catalog Ad — Meta</h1>
        <div className={styles.headerBadge}>
          {selected.size} produit{selected.size !== 1 ? 's' : ''} sélectionné{selected.size !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Live Feed URL Card (Horizontal on desktop, stacked on mobile) */}
      <div className={styles.feedUrlCard}>
        <div className={styles.feedUrlLabel}>🔗 Flux automatique Meta</div>
        <div className={styles.feedUrlRow}>
          <code className={styles.feedUrlCode}>{FEED_URL}</code>
          <button className={`${styles.copyBtn} ${copied ? styles.copyBtnDone : ''}`} onClick={copyFeedUrl} aria-label="Copier le lien du flux">
            {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
          </button>
        </div>
        <div className={styles.feedUrlHint}>
          Meta rafraîchit automatiquement votre catalogue toutes les heures.
        </div>
      </div>

      <div className={styles.workspace}>
        {/* ── Left: Product Picker ── */}
        <div className={styles.pickerPanel}>
          <div className={styles.pickerHeader}>
            <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Rechercher un produit..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className={styles.selectAllBtn} onClick={toggleAll}>
              {allFilteredSelected
                ? <><CheckSquare size={15} /> Tout désélectionner</>
                : <><Square size={15} /> Tout sélectionner</>
              }
            </button>
          </div>

          {loading ? (
            <div className={styles.loadingState}>Chargement des produits...</div>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <Package size={32} />
              <p>Aucun produit trouvé.</p>
            </div>
          ) : (
            <div className={styles.productList}>
              {filtered.map(p => {
                const isChecked = selected.has(p.id);
                return (
                  <button
                    key={p.id}
                    className={`${styles.productRow} ${isChecked ? styles.productRowChecked : ''}`}
                    onClick={() => toggleOne(p.id)}
                  >
                    <div className={styles.productCheck}>
                      {isChecked
                        ? <CheckSquare size={18} className={styles.checkIcon} />
                        : <Square size={18} className={styles.uncheckedIcon} />
                      }
                    </div>
                    <div
                      className={styles.productThumb}
                      style={{ backgroundImage: p.image_url ? `url(${p.image_url})` : undefined }}
                    >
                      {!p.image_url && <Package size={20} />}
                    </div>
                    <div className={styles.productInfo}>
                      <div className={styles.productName}>{p.title ?? '—'}</div>
                      <div className={styles.productMeta}>
                        <span className={styles.metaTag}>{p.categories?.name ?? 'Sans catégorie'}</span>
                        <span className={styles.metaTag}>{p.gender ?? 'unisex'}</span>
                        {p.badge && <span className={styles.metaBadge}>{p.badge}</span>}
                      </div>
                    </div>
                    <div className={styles.productPrice}>
                      {(p.final_price ?? p.price ?? 0).toFixed(3)} TND
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right: Export Panel ── */}
        <div className={styles.exportPanel}>
          <div className={styles.exportTitle}>Export Catalog</div>

          {/* Format selector */}
          <div className={styles.formatGroup}>
            <div className={styles.formatLabel}>Format d&apos;export</div>
            <div className={styles.formatOptions}>
              <button
                className={`${styles.formatBtn} ${exportFormat === 'xml' ? styles.formatBtnActive : ''}`}
                onClick={() => setExportFormat('xml')}
              >
                <FileCode size={18} />
                <span>XML</span>
                <span className={styles.formatHint}>Recommandé</span>
              </button>
              <button
                className={`${styles.formatBtn} ${exportFormat === 'csv' ? styles.formatBtnActive : ''}`}
                onClick={() => setExportFormat('csv')}
              >
                <FileText size={18} />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Selection summary */}
          <div className={styles.summaryBox}>
            <div className={styles.summaryTitle}>Produits sélectionnés</div>
            {selected.size === 0 ? (
              <div className={styles.summaryEmpty}>Aucun produit sélectionné</div>
            ) : (
              <ul className={styles.summaryList}>
                {selectedProducts.slice(0, 5).map(p => (
                  <li key={p.id} className={styles.summaryItem}>
                    <div
                      className={styles.summaryThumb}
                      style={{ backgroundImage: p.image_url ? `url(${p.image_url})` : undefined }}
                    />
                    <span>{p.title}</span>
                  </li>
                ))}
                {selected.size > 5 && (
                  <li className={styles.summaryMore}>+{selected.size - 5} autre{selected.size - 5 > 1 ? 's' : ''}</li>
                )}
              </ul>
            )}
          </div>

          {/* Export button */}
          <button
            className={`${styles.exportBtn} ${selected.size === 0 ? styles.exportBtnDisabled : ''} ${exported ? styles.exportBtnSuccess : ''}`}
            onClick={handleExport}
            disabled={selected.size === 0}
          >
            <Download size={18} />
            {exported
              ? '✓ Fichier téléchargé !'
              : `Exporter ${selected.size > 0 ? `(${selected.size})` : ''} en ${exportFormat.toUpperCase()}`
            }
          </button>

          {/* Instructions */}
          <div className={styles.stepsBox}>
            <div className={styles.stepsTitle}>Comment l&apos;importer dans Meta ?</div>
            <ol className={styles.stepsList}>
              <li>Ouvrir <strong>Meta Business Manager</strong></li>
              <li>Aller dans <strong>Commerce Manager → Catalogues</strong></li>
              <li>Cliquer sur <strong>Ajouter des articles → Flux de données</strong></li>
              <li>Importer le fichier <strong>{exportFormat.toUpperCase()}</strong> téléchargé</li>
              <li>Créer votre campagne <strong>Dynamic Ads</strong> !</li>
            </ol>
          </div>
        </div>

        {/* Product Sets Guide */}
        <div className={styles.productSetsPanel}>
          <div className={styles.exportTitle}>📂 Structure Catalog Meta</div>

          <div className={styles.setsTree}>
            <div className={styles.setsRoot}>📦 Nyvara Catalog (1 seul catalogue)</div>
            <div className={styles.setsChildren}>
              <div className={styles.setsChild}><span className={styles.setsIcon}>🕶️</span> Sunglasses</div>
              <div className={styles.setsChild}><span className={styles.setsIcon}>💡</span> Blue Light Glasses</div>
              <div className={styles.setsChild}><span className={styles.setsIcon}>⌚</span> Watches</div>
              <div className={styles.setsChild}><span className={styles.setsIcon}>🆕</span> New Arrivals</div>
              <div className={styles.setsChild}><span className={styles.setsIcon}>⭐</span> Best Sellers</div>
            </div>
          </div>

          <div className={styles.setsHowTo}>
            <div className={styles.setsHowToTitle}>Comment créer les Product Sets ?</div>
            <ol className={styles.stepsList}>
              <li>Dans <strong>Meta Catalog Manager</strong>, ouvrez votre catalogue</li>
              <li>Cliquez sur <strong>Product Sets → Créer un ensemble</strong></li>
              <li>Filtrez par <strong>product_type</strong> (ex: <code>sunglasses</code>)</li>
              <li>Chaque catégorie Supabase devient un Product Set automatiquement</li>
              <li>Utilisez ces ensembles dans vos <strong>campagnes Dynamic Ads</strong></li>
            </ol>
          </div>

          <div className={styles.setsPixelStatus}>
            <div className={styles.setsPixelTitle}>✅ Événements Pixel actifs</div>
            <div className={styles.pixelEventsList}>
              <div className={styles.pixelEvent}><span className={styles.pixelDot} />PageView</div>
              <div className={styles.pixelEvent}><span className={styles.pixelDot} />ViewContent</div>
              <div className={styles.pixelEvent}><span className={styles.pixelDot} />AddToCart</div>
              <div className={styles.pixelEvent}><span className={styles.pixelDot} />InitiateCheckout</div>
              <div className={styles.pixelEvent}><span className={styles.pixelDot} />Purchase + CAPI</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
