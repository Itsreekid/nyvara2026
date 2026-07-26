'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Heart, Search, Menu, X, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import CartDrawer from '@/components/cart/CartDrawer';
import styles from './Navbar.module.css';

const NAV_LINKS = [
  { href: '/',      label: 'Accueil' },
  { href: '/shop',  label: 'Boutique' },
  { href: '/track', label: 'Suivi' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { items: wishlistItems } = useWishlist();

  const [scrolled,    setScrolled]    = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [cartOpen,    setCartOpen]    = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Detect scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Close on route change
  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [pathname]);

  if (pathname.startsWith('/admin')) return null;

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
        <div className={styles.inner}>

          {/* Left — Nav Links (desktop) */}
          <nav className={styles.navLinks} aria-label="Main navigation">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Center — Logo */}
          <Link href="/" className={styles.logo} aria-label="Nyvara Home">
            NYVARA
          </Link>

          {/* Right — Icons */}
          <div className={styles.actions}>
            <button
              className={`${styles.iconBtn} ${styles.hideOnMobile}`}
              onClick={() => setSearchOpen(s => !s)}
              aria-label="Rechercher"
            >
              <Search size={18} />
            </button>

            <Link href="/wishlist" className={`${styles.iconBtn} ${styles.hideOnMobile}`} aria-label={`Wishlist (${wishlistItems.length})`}>
              <Heart size={18} />
              {wishlistItems.length > 0 && (
                <span className={styles.badge}>{wishlistItems.length}</span>
              )}
            </Link>

            <button
              className={styles.iconBtn}
              onClick={() => setCartOpen(true)}
              aria-label={`Panier (${itemCount})`}
            >
              <ShoppingBag size={18} />
              {itemCount > 0 && (
                <span className={styles.badge}>{itemCount}</span>
              )}
            </button>

            {/* Hamburger — mobile only */}
            <button
              className={`${styles.iconBtn} ${styles.hamburger}`}
              onClick={() => setMenuOpen(m => !m)}
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {searchOpen && (
          <div className={styles.searchBar}>
            <div className={styles.searchInner}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Rechercher des lunettes…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={styles.searchInput}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    window.location.href = `/shop?search=${encodeURIComponent(searchQuery.trim())}`;
                  }
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className={styles.clearBtn} aria-label="Effacer">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Mobile full-screen menu ── */}
      {menuOpen && (
        <div className={styles.mobileMenu} aria-label="Navigation mobile" role="dialog" aria-modal="true">
          <nav className={styles.mobileNav}>
            {NAV_LINKS.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.mobileLink} ${pathname === link.href ? styles.activeMobile : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <span className={styles.mobileLinkNum}>0{i + 1}</span>
                {link.label}
                <span className={styles.mobileLinkArrow}>
                  <ArrowRight size={20} />
                </span>
              </Link>
            ))}

            <button
              onClick={() => { setSearchOpen(true); setMenuOpen(false); }}
              className={styles.mobileExtraLink}
            >
              <Search size={22} className={styles.mobileExtraIcon} />
              Rechercher
            </button>

            <Link
              href="/wishlist"
              onClick={() => setMenuOpen(false)}
              className={styles.mobileExtraLink}
            >
              <Heart size={22} className={styles.mobileExtraIcon} />
              Favoris
              {wishlistItems.length > 0 && (
                <span className={styles.mobileBadge}>{wishlistItems.length}</span>
              )}
            </Link>
          </nav>

          {/* Bottom bar */}
          <div className={styles.mobileMenuBottom}>
            <span className={styles.mobileMenuTag}>Nyvara · Tunisie</span>
            <span className={styles.mobileMenuYear}>© 2026</span>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
