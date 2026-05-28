'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

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
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  }, [pathname, searchParams]);

  return null;
}

export default function FacebookPixel() {
  if (!PIXEL_ID) return null;

  return (
    <>
      {/* Base Pixel Code - deferred to improve LCP */}
      <Script id="fb-pixel" strategy="lazyOnload">
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

      {/* Route change tracker */}
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

function fire(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq('track', event, { currency: 'TND', ...params }, eventId ? { eventID: eventId } : undefined);
  }
}

/** Client-side event helpers — use these throughout the app */
export const fbEvent = {
  /** Fire when user views a product */
  viewContent: (params: { content_ids: string[]; content_name: string; value?: number }) => {
    fire('ViewContent', params);
  },

  /** Fire when user adds to cart */
  addToCart: (params: { content_ids: string[]; content_name: string; value: number }) => {
    fire('AddToCart', params);
  },

  /** Fire when user opens checkout */
  initiateCheckout: (params: { value: number; num_items: number }) => {
    fire('InitiateCheckout', params);
  },

  /** Fire when user adds to wishlist */
  addToWishlist: (params: { content_ids: string[]; content_name: string }) => {
    fire('AddToWishlist', params);
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
}

/**
 * Call this once an order is confirmed.
 * Fires the client-side pixel AND hits the server-side Conversions API
 * with the same event_id so Meta deduplicates correctly.
 */
export async function trackPurchase(params: PurchaseParams): Promise<void> {
  const eventId = generateEventId();

  // 1. Client-side pixel (immediate, user browser)
  fire(
    'Purchase',
    {
      value:        params.value,
      content_ids:  params.content_ids,
      num_items:    params.num_items,
      content_type: 'product',
    },
    eventId
  );

  // 2. Server-side Conversions API (reliable, not blocked by ad blockers / iOS)
  try {
    await fetch('/api/meta/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, event_id: eventId }),
    });
  } catch (err) {
    console.error('[Meta CAPI] Purchase server event failed:', err);
  }
}
