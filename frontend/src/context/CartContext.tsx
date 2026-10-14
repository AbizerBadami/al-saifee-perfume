import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, CartItem } from '../types';
import { getCustomerToken } from '../lib/api';

interface CartContextType {
  cart: CartItem[];
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addToCart: (product: Product, selectedSize?: string, quantity?: number) => { added: boolean; reason?: string };
  removeFromCart: (productId: string, selectedSize: string) => void;
  updateQuantity: (productId: string, selectedSize: string, delta: number) => void;
  setQuantity: (productId: string, selectedSize: string, qty: number) => void;
  clearCart: () => void;
  subtotal: number;
  tax: number;
  shippingFee: number;
  total: number;
  taxRate: number;
  freeShippingThreshold: number;
  freeShippingProgress: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = 'alsaifee_cart';
const SETTINGS_KEY = 'alsaifee_settings';

function readSettings(): { taxRate: number; freeShippingThreshold: number } {
  try {
    for (const k of [SETTINGS_KEY, 'oud_elixir_settings']) {
      const s = localStorage.getItem(k);
      if (s) {
        const p = JSON.parse(s);
        return {
          taxRate: typeof p.taxRate === 'number' ? p.taxRate : 0,
          freeShippingThreshold: typeof p.freeShippingThreshold === 'number' ? p.freeShippingThreshold : 999,
        };
      }
    }
  } catch {}
  return { taxRate: 0, freeShippingThreshold: 999 };
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_KEY) || localStorage.getItem('oud_elixir_cart');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [settings, setSettings] = useState(readSettings);

  useEffect(() => {
    const sync = () => setSettings(readSettings());
    window.addEventListener('storage', sync);
    window.addEventListener('alsaifee_settings', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('alsaifee_settings', sync);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Clear local cart on customer sign-out (prevents account mixing).
  useEffect(() => {
    const reset = () => setCart([]);
    window.addEventListener('alsaifee_customer_cart_reset', reset);
    window.addEventListener('alsaifee_customer_logout', reset);
    return () => {
      window.removeEventListener('alsaifee_customer_cart_reset', reset);
      window.removeEventListener('alsaifee_customer_logout', reset);
    };
  }, []);
  // Lock body scroll while drawer open
  useEffect(() => {
    document.body.style.overflow = isCartOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isCartOpen]);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen((v) => !v), []);

  const addToCart = useCallback((product: Product, selectedSize?: string, quantity: number = 1) => {
    // Cart is a signed-in action: guests are sent to login by the caller.
    if (!getCustomerToken()) return { added: false, reason: 'auth_required' };
    if (!product || product.stock <= 0) return { added: false, reason: 'out_of_stock' };
    const size = selectedSize || product.bottleSizes?.[0] || 'Standard';
    const qty = Math.max(1, Math.min(quantity, 10));
    const price = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;
    let added = true;
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id && i.selectedSize === size);
      if (idx > -1) {
        const cur = prev[idx].quantity;
        const next = Math.min(cur + qty, Math.min(product.stock, 10));
        if (next <= cur) { added = false; return prev; }
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: next, price };
        return copy;
      }
      return [...prev, { product, selectedSize: size, quantity: Math.min(qty, product.stock), price }];
    });
    if (added) setIsCartOpen(true);
    return { added, reason: added ? undefined : 'stock_limit' };
  }, []);

  const removeFromCart = useCallback((productId: string, selectedSize: string) => {
    setCart((prev) => prev.filter((i) => !(i.product.id === productId && i.selectedSize === selectedSize)));
  }, []);

  const updateQuantity = useCallback((productId: string, selectedSize: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.product.id !== productId || i.selectedSize !== selectedSize) return i;
        const cap = Math.min(i.product.stock || 99, 10);
        const next = Math.max(0, Math.min(cap, i.quantity + delta));
        return next === 0 ? null : { ...i, quantity: next };
      }).filter(Boolean) as CartItem[]
    );
  }, []);

  const setQuantity = useCallback((productId: string, selectedSize: string, qty: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.product.id !== productId || i.selectedSize !== selectedSize) return i;
        const cap = Math.min(i.product.stock || 99, 10);
        const next = Math.max(0, Math.min(cap, qty));
        return next === 0 ? null : { ...i, quantity: next };
      }).filter(Boolean) as CartItem[]
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = Math.round(subtotal * settings.taxRate * 100) / 100;
  const shippingFee = subtotal === 0 || subtotal >= settings.freeShippingThreshold ? 0 : 49;
  const total = subtotal + tax + shippingFee;
  const freeShippingProgress = settings.freeShippingThreshold > 0 ? Math.min(100, Math.round((subtotal / settings.freeShippingThreshold) * 100)) : 100;
  const itemCount = cart.reduce((c, i) => c + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart, isCartOpen, openCart, closeCart, toggleCart,
        addToCart, removeFromCart, updateQuantity, setQuantity, clearCart,
        subtotal, tax, shippingFee, total,
        taxRate: settings.taxRate,
        freeShippingThreshold: settings.freeShippingThreshold,
        freeShippingProgress, itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
