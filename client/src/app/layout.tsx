import type { Metadata } from 'next';
import { Cormorant_Garamond, Roboto, Cairo } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { LanguageProvider } from '@/context/LanguageContext';
import MainWrapper from '@/components/layout/MainWrapper';
import FacebookPixel from '@/components/analytics/FacebookPixel';

// Optimize fonts: preload and specify weights
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-editorial',
  preload: true,
  display: 'swap',
});

const roboto = Roboto({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
  preload: true,
  display: 'swap',
});

const cairo = Cairo({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['arabic'],
  variable: '--font-cairo',
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
    <html lang="fr" className={`${cormorant.variable} ${roboto.variable} ${cairo.variable}`} suppressHydrationWarning>
      <head>
        {/* Preconnect to external origins */}
        <link rel="preconnect" href="https://vkrgfqjsixjsieqzykcx.supabase.co" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <FacebookPixel />
      </head>
      <body>
        <LanguageProvider>
          <CartProvider>
            <WishlistProvider>
              <Navbar />
              <MainWrapper>
                {children}
              </MainWrapper>
              <Footer />
            </WishlistProvider>
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
