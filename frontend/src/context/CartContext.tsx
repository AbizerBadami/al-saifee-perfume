import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem } from '../types';

interface CartContextType {
  cart: CartItem[];
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addToCart: (product: Product, selectedSize?: string, quantity?: number) => void;
  removeFromCart: (productId: string, selectedSize: string) => void;
  updateQuantity: (productId: string, selectedSize: string, delta: number) => void;
  clearCart: () => void;
  subtotal: number;
  tax: number;
  shippingFee: number;
  total: number;
  freeShippingThreshold: number;
  freeShippingProgress: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('oud_elixir_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Use store settings from localStorage (synced by StoreContext)
  const freeShippingThreshold = (() => {
    try {
      const s = localStorage.getItem('oud_elixir_settings');
      if (s) { const parsed = JSON.parse(s); return parsed.freeShippingThreshold ?? 999; }
    } catch {}
    return 999;
  })();

  const taxRate = (() => {
    try {
      const s = localStorage.getItem('oud_elixir_settings');
      if (s) { const parsed = JSON.parse(s); return parsed.taxRate ?? 0.10; }
    } catch {}
    return 0.10;
  })();

  useEffect(() => {
    localStorage.setItem('oud_elixir_cart', JSON.stringify(cart));
  }, [cart]);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen((prev) => !prev);

  const addToCart = (product: Product, selectedSize?: string, quantity: number = 1) => {
    const size = selectedSize || (product.bottleSizes && product.bottleSizes.length ? product.bottleSizes[0] : '50ml');
    const itemPrice = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id && item.selectedSize === size);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      } else {
        return [...prev, { product, selectedSize: size, quantity, price: itemPrice }];
      }
    });

    openCart();
  };

  const removeFromCart = (productId: string, selectedSize: string) => {
    setCart((prev) => prev.filter((item) => !(item.product.id === productId && item.selectedSize === selectedSize)));
  };

  const updateQuantity = (productId: string, selectedSize: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId && item.selectedSize === selectedSize) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const shippingFee = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : 49;
  const total = subtotal + tax + shippingFee;

  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        isCartOpen,
        openCart,
        closeCart,
        toggleCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        subtotal,
        tax,
        shippingFee,
        total,
        freeShippingThreshold,
        freeShippingProgress,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
