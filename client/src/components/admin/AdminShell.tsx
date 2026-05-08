'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Package,
  LogOut, Tag, Menu, X, Users,
} from 'lucide-react';
import { logoutAction } from '@/app/admin/actions';
import { useOrderNotification } from '@/hooks/useOrderNotification';
import OrderToast from '@/components/admin/OrderToast';
import type { Order } from '@/types';
import styles from '@/app/admin/admin.module.css';

interface Props {
  role: string;
  children: React.ReactNode;
}

export default function AdminShell({ role, children }: Props) {
  const pathname = usePathname();
  const [newOrder, setNewOrder] = useState<Order | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = role === 'admin';

  useOrderNotification({ onNewOrder: (order) => setNewOrder(order) });

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Lock body scroll when sidebar open on mobile
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div className={styles.layout}>
      <OrderToast order={newOrder} onClose={() => setNewOrder(null)} />

      {/* Mobile overlay */}
      <div
        className={`${styles.overlay} ${sidebarOpen ? styles.overlayVisible : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>NYVARA Admin</div>
        </div>

        <nav className={styles.nav}>
          {isAdmin && (
            <Link href="/admin" className={styles.navItem} data-active={pathname === '/admin'}>
              <LayoutDashboard size={20} />
              <span>Tableau de bord</span>
            </Link>
          )}

          <Link href="/admin/orders" className={styles.navItem} data-active={pathname === '/admin/orders'}>
            <ShoppingCart size={20} />
            <span>Commandes</span>
          </Link>

          {isAdmin && (
            <Link href="/admin/products" className={styles.navItem} data-active={pathname.startsWith('/admin/products')}>
              <Package size={20} />
              <span>Produits</span>
            </Link>
          )}

          {isAdmin && (
            <Link href="/admin/categories" className={styles.navItem} data-active={pathname.startsWith('/admin/categories')}>
              <Tag size={20} />
              <span>Catégories</span>
            </Link>
          )}

          {isAdmin && (
            <Link href="/admin/employees" className={styles.navItem} data-active={pathname.startsWith('/admin/employees')}>
              <Users size={20} />
              <span>Employés</span>
            </Link>
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          <form action={logoutAction}>
            <button type="submit" className={styles.logoutBtn}>
              <LogOut size={20} />
              <span>Déconnexion</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className={styles.main}>
        <header className={styles.topHeader}>
          <div className={styles.headerLeft}>
            <button
              className={styles.menuBtn}
              onClick={() => setSidebarOpen(prev => !prev)}
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className={styles.headerTitle}>
              {isAdmin ? "Espace d'administration" : 'Espace employé'}
            </div>
          </div>
          <div className={styles.adminProfile}>
            <div className={styles.avatar}>{isAdmin ? 'A' : 'E'}</div>
            <span>{isAdmin ? 'Admin' : 'Employé'}</span>
          </div>
        </header>

        <main className={styles.contentArea}>
          {children}
        </main>
      </div>
    </div>
  );
}
