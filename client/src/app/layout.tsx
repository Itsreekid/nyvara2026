import type { Metadata } from 'next';
import { Editorial, Roboto } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import MainWrapper from '@/components/layout/MainWrapper';
import FacebookPixel from '@/components/analytics/FacebookPixel';

// Optimize fonts: preload and specify weights
const editorial = Editorial({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-editorial',
  preload: true,
  display: 'swap', // Use system font while loading
});

const roboto = Roboto({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
  preload: true,
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Nyvara — Accessoires de Luxe Tunisie',
    template: '%s | Nyvara',
  },
  description:
    'Découvrez des accessoires de luxe uniques conçus pour la Tunisie. Nyvara — là où l\'élégance rencontre le style de vie méditerranéen.',
  keywords: ['accessoires de luxe', 'Tunisie', 'bijoux', 'bagues', 'lunettes de soleil', 'TND', 'Nyvara'],
  authors: [{ name: 'Nyvara' }],
  openGraph: {
    title:       'Nyvara — Accessoires de Luxe Tunisie',
    description: 'Accessoires de luxe uniques et élégants pour le marché tunisien.',
    type:        'website',
    locale:      'fr_TN',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${editorial.variable} ${roboto.variable}`}>
      <head>
        {/* Preconnect to external origins */}
        <link rel="preconnect" href="https://vkrgfqjsixjsieqzykcx.supabase.co" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
      </head>
      <body>
        <CartProvider>
          <WishlistProvider>
            <Navbar />
            <MainWrapper>
              {children}
            </MainWrapper>
            <Footer />
          </WishlistProvider>
        </CartProvider>
        <FacebookPixel />
      </body>
    </html>
  );
}
