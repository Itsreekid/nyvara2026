'use client';

import { createContext, useContext, useReducer, useCallback, ReactNode, useEffect } from 'react';
import type { CartItem, CartState, Product, ColorOption } from '@/types';

// ─── Actions ──────────────────────────────────────────────────────────────────

type CartAction =
  | { type: 'ADD_ITEM'; product: Product; selected_color?: ColorOption }
  | { type: 'REMOVE_ITEM'; productId: string; colorId?: string }
  | { type: 'UPDATE_QUANTITY'; productId: string; colorId?: string; quantity: number }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CART'; state: CartState };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.product.id === action.product.id && i.selected_color?.id === action.selected_color?.id);
      const items = existing
        ? state.items.map(i =>
            i.product.id === action.product.id && i.selected_color?.id === action.selected_color?.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        : [...state.items, { product: action.product, quantity: 1, selected_color: action.selected_color }];
      return buildState(items);
    }
    case 'REMOVE_ITEM': {
      const items = state.items.filter(i => !(i.product.id === action.productId && i.selected_color?.id === action.colorId));
      return buildState(items);
    }
    case 'UPDATE_QUANTITY': {
      const items =
        action.quantity <= 0
          ? state.items.filter(i => !(i.product.id === action.productId && i.selected_color?.id === action.colorId))
          : state.items.map(i =>
              i.product.id === action.productId && i.selected_color?.id === action.colorId
                ? { ...i, quantity: action.quantity }
                : i
            );
      return buildState(items);
    }
    case 'CLEAR_CART':
      return buildState([]);
    case 'SET_CART':
      // Always recalculate totals when loading from localStorage
      // to ensure any updated pricing logic applies to old carts.
      return buildState(action.state.items);
    default:
      return state;
  }
}

function buildState(items: CartItem[]): CartState {
  // 1. Calculate total quantity for each product (sum of all colors)
  const productTotals: Record<string, number> = {};
  items.forEach(item => {
    productTotals[item.product.id] = (productTotals[item.product.id] || 0) + item.quantity;
  });

  const total = items.reduce(
    (sum, i) => {
      let unitPrice: number;
      const totalQty = productTotals[i.product.id];

      // Check for quantity break based on total product quantity
      const breaks = i.product.quantity_breaks || [];
      const applicableBreak = [...breaks]
        .sort((a, b) => b.min_qty - a.min_qty)
        .find(qb => totalQty >= qb.min_qty);

      if (applicableBreak) {
        // unit price is the break's total price / total quantity of that product
        unitPrice = applicableBreak.total_price / totalQty;
      } else {
        const hasDiscount = i.product.discount != null && i.product.discount > 0;
        unitPrice = hasDiscount ? Math.round((i.product.price ?? 0) * (1 - i.product.discount! / 100)) : (i.product.price ?? 0);
      }

      return sum + unitPrice * i.quantity;
    },
    0
  );
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  return { items, total, itemCount };
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface CartContextValue extends CartState {
  addItem:        (product: Product, selected_color?: ColorOption) => void;
  removeItem:     (productId: string, colorId?: string) => void;
  updateQuantity: (productId: string, colorId: string | undefined, quantity: number) => void;
  clearCart:      () => void;
  isInCart:       (productId: string, colorId?: string) => boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], total: 0, itemCount: 0 });

  // ─── Persistence Logic ───────────────

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('nyvara_cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'SET_CART', state: parsed });
      } catch (e) {
        console.error('Failed to parse cart from localStorage', e);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    // Skip saving empty initial state before hydration if possible, 
    // but here we just save whenever it changes.
    localStorage.setItem('nyvara_cart', JSON.stringify(state));
  }, [state]);

  const addItem        = useCallback((product: Product, selected_color?: ColorOption) => dispatch({ type: 'ADD_ITEM', product, selected_color }), []);
  const removeItem     = useCallback((productId: string, colorId?: string) => dispatch({ type: 'REMOVE_ITEM', productId, colorId }), []);
  const updateQuantity = useCallback((productId: string, colorId: string | undefined, quantity: number) => dispatch({ type: 'UPDATE_QUANTITY', productId, colorId, quantity }), []);
  const clearCart      = useCallback(() => dispatch({ type: 'CLEAR_CART' }), []);
  const isInCart       = useCallback((productId: string, colorId?: string) => state.items.some(i => i.product.id === productId && i.selected_color?.id === colorId), [state.items]);

  return (
    <CartContext.Provider value={{ ...state, addItem, removeItem, updateQuantity, clearCart, isInCart }}>
      {children}
    </CartContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
