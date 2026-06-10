'use client';

import { createContext, useContext, useReducer, useCallback, ReactNode, useEffect, useState } from 'react';
import { getDeviceId } from '@/lib/deviceId';
import type { Product, WishlistState } from '@/types';

// ─── Actions ──────────────────────────────────────────────────────────────────

type WishlistAction =
  | { type: 'ADD_ITEM'; product: Product }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'CLEAR' }
  | { type: 'SYNC'; items: Product[] };

function wishlistReducer(state: WishlistState, action: WishlistAction): WishlistState {
  switch (action.type) {
    case 'ADD_ITEM':
      if (state.items.some(p => p.id === action.product.id)) return state;
      return { items: [...state.items, action.product] };
    case 'REMOVE_ITEM':
      return { items: state.items.filter(p => p.id !== action.productId) };
    case 'CLEAR':
      return { items: [] };
    case 'SYNC':
      return { items: action.items };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface WishlistContextValue extends WishlistState {
  addToWishlist:      (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  clearWishlist:      () => void;
  isWishlisted:       (productId: string) => boolean;
  deviceId?:          string;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wishlistReducer, { items: [] });
  const [deviceId, setDeviceId] = useState<string>();
  const [synced, setSynced] = useState(false);

  // Load persisted wishlist from LocalStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nyvara_wishlist');
      if (stored) {
        const items: Product[] = JSON.parse(stored);
        dispatch({ type: 'SYNC', items });
      }
    } catch (e) {
      console.error('Failed to read wishlist from LocalStorage', e);
    }
  }, []);

  // Persist wishlist to LocalStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('nyvara_wishlist', JSON.stringify(state.items));
    } catch (e) {
      console.error('Failed to write wishlist to LocalStorage', e);
    }
  }, [state.items]);

  // Initialize device ID and optionally sync with server (kept unchanged)
  useEffect(() => {
    const initializeWishlist = async () => {
      const id = getDeviceId();
      setDeviceId(id);
      try {
        const response = await fetch(`/api/wishlist?deviceId=${id}`);
        if (response.ok) {
          // Server sync logic could be added here
          setSynced(true);
        }
      } catch (error) {
        console.error('Failed to load wishlist:', error);
        setSynced(true);
      }
    };
    initializeWishlist();
  }, []);

  const addToWishlist = useCallback(async (product: Product) => {
    dispatch({ type: 'ADD_ITEM', product });
    if (deviceId) {
      try {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: deviceId,
            product_id: product.id,
            action: 'add',
          }),
        });
      } catch (error) {
        console.error('Failed to add to wishlist:', error);
      }
    }
  }, [deviceId]);

  const removeFromWishlist = useCallback(async (productId: string) => {
    dispatch({ type: 'REMOVE_ITEM', productId });
    if (deviceId) {
      try {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: deviceId,
            product_id: productId,
            action: 'remove',
          }),
        });
      } catch (error) {
        console.error('Failed to remove from wishlist:', error);
      }
    }
  }, [deviceId]);

  const clearWishlist = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const isWishlisted = useCallback((productId: string) => state.items.some(p => p.id === productId), [state.items]);

  return (
    <WishlistContext.Provider value={{ ...state, addToWishlist, removeFromWishlist, clearWishlist, isWishlisted, deviceId }}>
      {children}
    </WishlistContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return ctx;
}