// ============================================================
// StoreContext — Rewritten for Cloudflare D1 REST API
// Replaces all Firebase Firestore calls with fetch-based API calls
// Keeps the exact same interface so all consuming components work unchanged
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { productsAPI, ordersAPI, reviewsAPI, settingsAPI } from '../lib/api';
import { Product, Order, Review, StoreSettings } from '../types';
import { INITIAL_PRODUCTS, INITIAL_SETTINGS } from '../utils/seedData';

interface StoreContextType {
  products: Product[];
  orders: Order[];
  reviews: Review[];
  settings: StoreSettings;
  wishlist: string[];
  loading: boolean;
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewCount'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  saveProduct: (product: Partial<Product>) => Promise<void>;
  resetDemoProducts: () => Promise<void>;
  createOrder: (orderData: Omit<Order, 'id' | 'createdAt'>) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: Order['status'], trackingNumber?: string) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
  addReview: (productId: string, userName: string, userEmail: string, rating: number, comment: string) => Promise<void>;
  approveReview: (reviewId: string) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  moderateReview: (reviewId: string, status: 'Approved' | 'Rejected') => Promise<void>;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('oud_elixir_products');
      if (saved) {
        const parsed: Product[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('oud_elixir_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    try {
      const saved = localStorage.getItem('oud_elixir_reviews');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      const saved = localStorage.getItem('oud_elixir_settings');
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('oud_elixir_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);

  // Fetch data from the D1 API on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [productsRes, settingsRes, reviewsRes] = await Promise.allSettled([
          productsAPI.list(),
          settingsAPI.get(),
          reviewsAPI.list(),
        ]);

        if (productsRes.status === 'fulfilled' && productsRes.value.products.length > 0) {
          setProducts(productsRes.value.products);
          localStorage.setItem('oud_elixir_products', JSON.stringify(productsRes.value.products));
        }

        if (settingsRes.status === 'fulfilled') {
          setSettings(settingsRes.value);
          localStorage.setItem('oud_elixir_settings', JSON.stringify(settingsRes.value));
        }

        if (reviewsRes.status === 'fulfilled') {
          setReviews(reviewsRes.value.reviews);
          localStorage.setItem('oud_elixir_reviews', JSON.stringify(reviewsRes.value.reviews));
        }
      } catch {
        console.warn('API not reachable, using cached local data');
      }
    };

    fetchInitialData();
  }, []);

  // Persist to localStorage on state changes
  useEffect(() => { localStorage.setItem('oud_elixir_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('oud_elixir_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('oud_elixir_reviews', JSON.stringify(reviews)); }, [reviews]);
  useEffect(() => { localStorage.setItem('oud_elixir_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem('oud_elixir_wishlist', JSON.stringify(wishlist)); }, [wishlist]);

  // Wishlist
  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]));
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  // Products CRUD
  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewCount'>) => {
    try {
      const created = await productsAPI.create(productData);
      setProducts((prev) => [created, ...prev]);
    } catch (e) {
      // Fallback: create locally
      const newProduct: Product = {
        ...productData,
        id: 'prod-' + Date.now(),
        rating: 5.0,
        reviewCount: 1,
        createdAt: new Date().toISOString(),
      };
      setProducts((prev) => [newProduct, ...prev]);
      console.warn('Saved product locally');
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    try {
      await productsAPI.update(id, updates);
    } catch (e) {
      console.warn('Updated product locally');
    }
  };

  const deleteProduct = async (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    try {
      await productsAPI.delete(id);
    } catch (e) {
      console.warn('Deleted product locally');
    }
  };

  const saveProduct = async (productData: Partial<Product>) => {
    if (productData.id) {
      await updateProduct(productData.id, productData);
    } else {
      await addProduct(productData as Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewCount'>);
    }
  };

  const resetDemoProducts = async () => {
    setProducts(INITIAL_PRODUCTS);
    localStorage.setItem('oud_elixir_products', JSON.stringify(INITIAL_PRODUCTS));
  };

  const moderateReview = async (reviewId: string, status: 'Approved' | 'Rejected') => {
    if (status === 'Approved') {
      await approveReview(reviewId);
    } else {
      await deleteReview(reviewId);
    }
  };

  // Orders CRUD
  const createOrder = async (orderData: Omit<Order, 'id' | 'createdAt'>): Promise<Order> => {
    try {
      const created = await ordersAPI.create(orderData);
      setOrders((prev) => {
        const updated = [created, ...prev];
        localStorage.setItem('oud_elixir_orders', JSON.stringify(updated));
        window.dispatchEvent(new Event('order_updated'));
        return updated;
      });
      return created;
    } catch (e) {
      // Fallback: create locally
      const newOrder: Order = {
        ...orderData,
        id: 'ord-' + Date.now(),
        createdAt: new Date().toISOString(),
      };
      setOrders((prev) => {
        const updated = [newOrder, ...prev];
        localStorage.setItem('oud_elixir_orders', JSON.stringify(updated));
        window.dispatchEvent(new Event('order_updated'));
        return updated;
      });
      return newOrder;
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status'], trackingNumber?: string) => {
    setOrders((prev) => {
      const updated = prev.map((o) => (o.id === orderId ? { ...o, status, trackingNumber: trackingNumber || o.trackingNumber } : o));
      localStorage.setItem('oud_elixir_orders', JSON.stringify(updated));
      window.dispatchEvent(new Event('order_updated'));
      return updated;
    });

    try {
      await ordersAPI.updateStatus(orderId, { status, trackingNumber });
    } catch (e) {
      console.warn('Updated order status locally');
    }
  };

  const getOrderById = (orderId: string) => {
    return orders.find((o) => o.id === orderId || o.orderNumber === orderId);
  };

  // Reviews CRUD
  const addReview = async (productId: string, userName: string, userEmail: string, rating: number, comment: string) => {
    const newReview: Review = {
      id: 'rev-' + Date.now(),
      productId,
      userName,
      userEmail,
      rating,
      comment,
      status: 'Approved',
      createdAt: new Date().toISOString(),
    };

    setReviews((prev) => [newReview, ...prev]);

    // Update product rating average locally
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const totalReviews = p.reviewCount + 1;
          const newAvg = Math.round(((p.rating * p.reviewCount + rating) / totalReviews) * 10) / 10;
          return { ...p, rating: newAvg, reviewCount: totalReviews };
        }
        return p;
      })
    );

    try {
      await reviewsAPI.create({ productId, userName, userEmail, rating, comment });
    } catch (e) {}
  };

  const approveReview = async (reviewId: string) => {
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, status: 'Approved' } : r)));
    try {
      await reviewsAPI.moderate(reviewId, 'Approved');
    } catch (e) {}
  };

  const deleteReview = async (reviewId: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    try {
      await reviewsAPI.delete(reviewId);
    } catch (e) {}
  };

  // Settings
  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    try {
      await settingsAPI.update({ ...settings, ...newSettings });
    } catch (e) {}
  };

  return (
    <StoreContext.Provider
      value={{
        products, orders, reviews, settings, wishlist, loading,
        toggleWishlist, isInWishlist,
        addProduct, updateProduct, deleteProduct, saveProduct, resetDemoProducts,
        createOrder, updateOrderStatus, getOrderById,
        addReview, approveReview, deleteReview, moderateReview,
        updateSettings,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
