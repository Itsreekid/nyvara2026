'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe, Share2, Mail } from 'lucide-react';
import styles from './Footer.module.css';

const SHOP_LINKS = [
  { href: '/shop',               label: 'Toutes les lunettes' },
  { href: '/shop?gender=homme',  label: 'Hommes' },
  { href: '/shop?gender=femme',  label: 'Femmes' },
  { href: '/shop?gender=unisex', label: 'Unisexe' },
];
const INFO_LINKS = [
  { href: '/about',   label: 'À propos de Nyvara' },
  { href: '/contact', label: 'Nous contacter' },
];

export default function Footer() {
  const pathname = usePathname();

  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {/* Brand */}
        <div className={styles.brand}>
          <p className={styles.logo}>NYVARA</p>
          <p className={styles.tagline}>
            La façon dont vous voyez le jour.<br />
            Créez des lunettes au style unique.
          </p>
          <div className={styles.socials}>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={styles.socialLink} suppressHydrationWarning>
              <Globe size={18} />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={styles.socialLink} suppressHydrationWarning>
              <Share2 size={18} />
            </a>
            <a href="mailto:contact@nyvara.tn" aria-label="Email" className={styles.socialLink} suppressHydrationWarning>
              <Mail size={18} />
            </a>
          </div>
        </div>

        {/* Shop */}
        <div className={styles.col}>
          <h4 className={styles.colTitle}>Boutique</h4>
          <ul className={styles.linkList}>
            {SHOP_LINKS.map(l => (
              <li key={l.href}>
                <Link href={l.href} className={styles.footerLink}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Info */}
        <div className={styles.col}>
          <h4 className={styles.colTitle}>Informations</h4>
          <ul className={styles.linkList}>
            {INFO_LINKS.map(l => (
              <li key={l.href}>
                <Link href={l.href} className={styles.footerLink}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Newsletter */}
        <div className={styles.newsletter}>
          <h4 className={styles.colTitle}>Newsletter</h4>
          <p className={styles.newsletterText}>Recevez nos offres exclusives et nos nouveautés directement dans votre boîte mail.</p>
          <form className={styles.form} onSubmit={e => e.preventDefault()}>
            <input
              type="email"
              placeholder="votre@email.com"
              className={styles.emailInput}
              aria-label="Adresse e-mail pour la newsletter"
            />
            <button type="submit" className={styles.subscribeBtn}>S’abonner</button>
          </form>
        </div>
      </div>

      <div className={styles.bottom} suppressHydrationWarning>
        <p suppressHydrationWarning>&copy; {new Date().getFullYear()} Nyvara. Tous droits réservés.</p>
        <p>Fait en Tunisie 🇹🇳</p>
      </div>
    </footer>
  );
}
