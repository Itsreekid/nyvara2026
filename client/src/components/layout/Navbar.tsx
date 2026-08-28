'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Heart, Search, Menu, X, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslation } from '@/locales/dictionary';
import CartDrawer from '@/components/cart/CartDrawer';
import FindYourFit, { FindYourFitButton, FindYourFitMobileButton } from '@/components/layout/FindYourFit';
import styles from './Navbar.module.css';

const NAV_LINKS = [
  { href: '/',      key: 'nav.home' },
  { href: '/shop',  key: 'nav.shop' },
  { href: '/track', key: 'nav.track' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { language, setLanguage } = useLanguage();
  const t = (path: string) => getTranslation(language, path);

  const [scrolled,    setScrolled]    = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [cartOpen,    setCartOpen]    = useState(false);
  const [fitOpen,     setFitOpen]     = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Detect scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) setScrolled(true);
      else setScrolled(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleOpenQuiz = () => setFitOpen(true);
    window.addEventListener('openQuizModal', handleOpenQuiz);
    return () => window.removeEventListener('openQuizModal', handleOpenQuiz);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Close on route change
  useEffect(() => { setMenuOpen(false); setSearchOpen(false); setFitOpen(false); }, [pathname]);

  if (pathname.startsWith('/admin')) return null;

  const toggleLanguage = () => {
    setLanguage(language === 'fr' ? 'ar' : 'fr');
  };

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
        <div className={styles.inner}>

          {/* Left — Mobile Language Toggle + Desktop Nav Links */}
          <div className={styles.leftGroup}>
            <button className={styles.langToggleBtn} onClick={toggleLanguage} aria-label="Toggle language">
              {language === 'fr' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="16" height="12" viewBox="0 0 900 600" style={{ borderRadius: '2px', objectFit: 'cover' }}>
                    <rect width="900" height="600" fill="#ED2939"/>
                    <rect width="600" height="600" fill="#fff"/>
                    <rect width="300" height="600" fill="#002395"/>
                  </svg>
                  FR
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="16" height="12" viewBox="0 0 1200 800" style={{ borderRadius: '2px', objectFit: 'cover' }}>
                    <rect width="1200" height="800" fill="#e70013"/>
                    <circle cx="600" cy="400" r="200" fill="#fff"/>
                    <circle cx="600" cy="400" r="150" fill="#e70013"/>
                    <circle cx="650" cy="400" r="120" fill="#fff"/>
                    <polygon fill="#e70013" points="630,320 655,380 720,380 665,420 685,480 630,440 575,480 595,420 540,380 605,380" />
                  </svg>
                  عربي
                </span>
              )}
            </button>
            <nav className={styles.navLinks} aria-label="Main navigation">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}
                >
                  {t(link.key)}
                </Link>
              ))}
              {/* Find Your Fit pill — desktop */}
              <FindYourFitButton onClick={() => setFitOpen(true)} label={t('quiz.trigger')} />
            </nav>
          </div>

          {/* Center — Logo */}
          <Link href="/" className={styles.logo} aria-label="Nyvara Home">
            NYVARA
          </Link>

          {/* Right — Icons */}
          <div className={styles.actions} dir="ltr">
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
                placeholder={t('header.search')}
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
            <div style={{ display: 'flex', width: '100%', flexDirection: language === 'fr' ? 'row' : 'row-reverse' }}>
              <button className={styles.langToggleBtn} style={{ marginBottom: '20px' }} onClick={toggleLanguage} aria-label="Toggle language">
              {language === 'fr' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="16" height="12" viewBox="0 0 900 600" style={{ borderRadius: '2px', objectFit: 'cover' }}>
                    <rect width="900" height="600" fill="#ED2939"/>
                    <rect width="600" height="600" fill="#fff"/>
                    <rect width="300" height="600" fill="#002395"/>
                  </svg>
                  FR
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="16" height="12" viewBox="0 0 1200 800" style={{ borderRadius: '2px', objectFit: 'cover' }}>
                    <rect width="1200" height="800" fill="#e70013"/>
                    <circle cx="600" cy="400" r="200" fill="#fff"/>
                    <circle cx="600" cy="400" r="150" fill="#e70013"/>
                    <circle cx="650" cy="400" r="120" fill="#fff"/>
                    <polygon fill="#e70013" points="630,320 655,380 720,380 665,420 685,480 630,440 575,480 595,420 540,380 605,380" />
                  </svg>
                  عربي
                </span>
              )}
            </button>
            </div>
            {NAV_LINKS.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.mobileLink} ${pathname === link.href ? styles.activeMobile : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <span className={styles.mobileLinkNum}>0{i + 1}</span>
                {t(link.key)}
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
              {language === 'fr' ? 'Rechercher' : 'لوج على'}
            </button>

            {/* Find Your Fit — mobile */}
            <FindYourFitMobileButton onClick={() => { setFitOpen(true); setMenuOpen(false); }} label={t('quiz.mobileTrigger')} />

            <Link
              href="/wishlist"
              onClick={() => setMenuOpen(false)}
              className={styles.mobileExtraLink}
            >
              <Heart size={22} className={styles.mobileExtraIcon} />
              {language === 'fr' ? 'Favoris' : 'المفضلة'}
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

      {/* Find Your Fit Modal */}
      <FindYourFit isOpen={fitOpen} onClose={() => setFitOpen(false)} />

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
