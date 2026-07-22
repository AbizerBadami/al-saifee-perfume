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
  couponCode: string;
  discountAmount: number;
  applyCoupon: (code: string, activeCoupons?: any[]) => { success: boolean; message: string };
  removeCoupon: () => void;
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
  const [couponCode, setCouponCode] = useState<string>(() => {
    return localStorage.getItem('oud_elixir_coupon') || '';
  });
  const [discountPercent, setDiscountPercent] = useState<number>(() => {
    return Number(localStorage.getItem('oud_elixir_discount_pct')) || 0;
  });

  const freeShippingThreshold = 50;

  useEffect(() => {
    localStorage.setItem('oud_elixir_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (couponCode) {
      localStorage.setItem('oud_elixir_coupon', couponCode);
      localStorage.setItem('oud_elixir_discount_pct', String(discountPercent));
    } else {
      localStorage.removeItem('oud_elixir_coupon');
      localStorage.removeItem('oud_elixir_discount_pct');
    }
  }, [couponCode, discountPercent]);

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
    setCouponCode('');
    setDiscountPercent(0);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100 * 100) / 100;
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = Math.round(taxableSubtotal * 0.10 * 100) / 100; // 10% tax
  const shippingFee = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : 15;
  const total = taxableSubtotal + tax + shippingFee;

  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0);

  const applyCoupon = (code: string, activeCoupons?: any[]) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Please enter a coupon code.' };
    }

    if (cleanCode === 'WELCOME10') {
      setCouponCode('WELCOME10');
      setDiscountPercent(10);
      return { success: true, message: '10% promotional discount applied!' };
    }

    if (cleanCode === 'ROYAL50' && subtotal >= 250) {
      setCouponCode('ROYAL50');
      setDiscountPercent(20);
      return { success: true, message: '$50 VIP discount applied!' };
    }

    if (activeCoupons && activeCoupons.length) {
      const match = activeCoupons.find((c) => c.code.toUpperCase() === cleanCode && c.active);
      if (match) {
        setCouponCode(match.code);
        setDiscountPercent(match.discountValue || 10);
        return { success: true, message: `Coupon ${match.code} applied successfully!` };
      }
    }

    return { success: false, message: 'Invalid or expired promotional code.' };
  };

  const removeCoupon = () => {
    setCouponCode('');
    setDiscountPercent(0);
  };

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
        couponCode,
        discountAmount,
        applyCoupon,
        removeCoupon,
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
