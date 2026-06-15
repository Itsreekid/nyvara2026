'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

/**
 * Meta Pixel ID — sourced from NEXT_PUBLIC_FB_PIXEL_ID environment variable.
 * Next.js inlines NEXT_PUBLIC_* vars at build time.
 *
 * - Local dev: set in .env.local
 * - Production (Netlify): set in Netlify Dashboard → Site Settings → Environment Variables
 *
 * To change the Pixel ID, update it in ONE place:
 *   → .env.local (for local)  OR  Netlify Dashboard (for production)
 */
const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: unknown;
  }
}

/** Tracks page views on every route change */
function PixelPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'PageView');
    }
  }, [pathname, searchParams]);

  return null;
}

export default function FacebookPixel() {
  if (!PIXEL_ID) return null;

  return (
    <>
      {/* Meta Pixel Base Code — afterInteractive ensures it loads before user events */}
      <Script id="fb-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>

      {/* noscript fallback for users with JS disabled */}
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>

      {/* Route change tracker for SPA navigations */}
      <Suspense fallback={null}>
        <PixelPageViewTracker />
      </Suspense>
    </>
  );
}

// ─── Event Helpers ───────────────────────────────────────────────────────────

/** Generate a unique event ID for deduplication between client pixel and server CAPI */
export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function fireClient(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', event, { currency: 'TND', ...params }, { eventID: eventId });
  }
}

async function fireServer(eventName: string, params: Record<string, unknown>, eventId: string) {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/meta/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        ...params,
        event_name: eventName,
        event_id: eventId,
        event_source_url: window.location.href,
      }),
    });
  } catch (err) {
    console.error(`[Meta CAPI] ${eventName} server event failed:`, err);
  }
}

function fireBoth(eventName: string, params: Record<string, unknown>) {
  const eventId = generateEventId();
  fireClient(eventName, params, eventId);
  fireServer(eventName, params, eventId);
}

/** Client-side event helpers — use these throughout the app */
export const fbEvent = {
  /** Fire when user views a product */
  viewContent: (params: { content_ids: string[]; content_name: string; value?: number; content_type?: string; content_category?: string }) => {
    fireBoth('ViewContent', { content_type: 'product', ...params, value: Number(params.value ?? 0) });
  },

  /** Fire when user adds to cart */
  addToCart: (params: { content_ids: string[]; content_name: string; value: number; content_type?: string }) => {
    fireBoth('AddToCart', { content_type: 'product', ...params, value: Number(params.value) });
  },

  /** Fire when user opens checkout */
  initiateCheckout: (params: { value: number; num_items: number }) => {
    fireBoth('InitiateCheckout', { ...params, value: Number(params.value) });
  },

  /** Fire when user adds to wishlist */
  addToWishlist: (params: { content_ids: string[]; content_name: string }) => {
    fireBoth('AddToWishlist', { ...params });
  },
};

// ─── Purchase — fires BOTH client pixel + server CAPI ────────────────────────

export interface PurchaseParams {
  order_id: string;
  value: number;
  email: string;
  phone: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  country?: string;
  content_ids: string[];
  num_items: number;
  contents: { id: string; quantity: number; item_price: number }[];
}

/**
 * Call this once an order is confirmed.
 * Fires the client-side pixel AND hits the server-side Conversions API
 * with the same event_id so Meta deduplicates correctly.
 */
export async function trackPurchase(params: PurchaseParams): Promise<void> {
  const eventId = generateEventId();

  const eventParams = {
    value:        Number(params.value),
    content_ids:  params.content_ids,
    contents:     params.contents,
    num_items:    params.num_items,
    content_type: 'product',
  };

  // 1. Client-side pixel (immediate, user browser)
  fireClient('Purchase', eventParams, eventId);

  // 2. Server-side Conversions API
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/meta/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          ...params,
          ...eventParams,
          event_name: 'Purchase',
          event_id: eventId,
          event_source_url: window.location.href,
        }),
      });
    } catch (err) {
      console.error('[Meta CAPI] Purchase server event failed:', err);
    }
  }
}
