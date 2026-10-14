// ============================================================
// StoreContext — Centralized State & Cloudflare D1 REST API Sync
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { productsAPI, ordersAPI, reviewsAPI, settingsAPI, customerAPI } from '../lib/api';
import { useAuth } from './AuthContext';
import { Product, Order, Review, StoreSettings } from '../types';
import { INITIAL_PRODUCTS, INITIAL_SETTINGS } from '../utils/seedData';

interface StoreContextType {
  products: Product[];
  orders: Order[];
  reviews: Review[];
  settings: StoreSettings;
  wishlist: string[];
  wishlistLoading: boolean;
  loading: boolean;
  toggleWishlist: (productId: string) => Promise<{ saved: boolean; authRequired: boolean }>;
  isInWishlist: (productId: string) => boolean;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewCount'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  saveProduct: (product: Partial<Product>) => Promise<void>;
  resetDemoProducts: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status'], trackingNumber?: string) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
  addReview: (productId: string, userName: string, orderNumber: string, rating: number, comment: string) => Promise<void>;
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

  // Orders live only in D1 (created via Razorpay verify). Never persisted to
  // browser storage: they contain customer PII and go stale instantly.
  const [orders, setOrders] = useState<Order[]>([]);

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
      const saved = localStorage.getItem('alsaifee_wishlist') || localStorage.getItem('oud_elixir_wishlist');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const [loading, setLoading] = useState(false);

  // Fetch data from the D1 API on mount
  useEffect(() => {
    // One-time cleanup: drop legacy cached orders (customer PII must not sit in browser storage)
    try { localStorage.removeItem('oud_elixir_orders'); } catch {}
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

  // Persist to localStorage on state changes (orders excluded — server-side only)
  useEffect(() => { localStorage.setItem('oud_elixir_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('oud_elixir_reviews', JSON.stringify(reviews)); }, [reviews]);
  useEffect(() => { localStorage.setItem('oud_elixir_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => {
    try {
      localStorage.setItem('alsaifee_wishlist', JSON.stringify(wishlist));
      localStorage.removeItem('oud_elixir_wishlist');
    } catch {}
  }, [wishlist]);

  // Wishlist — sign-in required, synced with the server copy.
  const { isCustomer } = useAuth();

  // Pull server wishlist on sign-in (union with anything saved offline).
  useEffect(() => {
    if (!isCustomer) {
      setWishlist([]);
      return;
    }
    let cancelled = false;
    setWishlistLoading(true);
    customerAPI.wishlist()
      .then((res) => {
        if (cancelled) return;
        const serverIds = (res.products || []).map((p) => p.id);
        setWishlist((prev) => {
          const merged = Array.from(new Set([...serverIds, ...prev]));
          // Push offline-only ids up (fire-and-forget).
          prev.filter((id) => !serverIds.includes(id)).forEach((id) => {
            customerAPI.wishlistAdd(id).catch(() => {});
          });
          return merged;
        });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setWishlistLoading(false); });
    return () => { cancelled = true; };
  }, [isCustomer]);

  // Wishlist
  const toggleWishlist = useCallback(async (productId: string) => {
    if (!isCustomer) return { saved: false, authRequired: true };
    const saving = !wishlist.includes(productId);
    setWishlist((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]));
    try {
      if (saving) await customerAPI.wishlistAdd(productId);
      else await customerAPI.wishlistRemove(productId);
    } catch {
      // Roll back optimistic update on failure.
      setWishlist((prev) => (saving ? prev.filter((id) => id !== productId) : [...prev, productId]));
      return { saved: !saving, authRequired: false };
    }
    return { saved: saving, authRequired: false };
  }, [isCustomer, wishlist]);

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  // Products CRUD
  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewCount'>) => {
    try {
      const res = await productsAPI.create(productData);
      const created = (res as unknown as { product: Product }).product ?? (res as unknown as Product);
      if (created && (created as Product).id) setProducts((prev) => [created as Product, ...prev]);
    } catch {
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

  // Orders are created server-side via Razorpay checkout verify only.
  // There is intentionally no client-side createOrder (no POST /api/orders):
  // totals, stock and payment state are authoritative on the Worker.

  const updateOrderStatus = async (orderId: string, status: Order['status'], trackingNumber?: string) => {
    await ordersAPI.updateStatus(orderId, { status, trackingNumber });
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status, trackingNumber: trackingNumber || o.trackingNumber } : o))
    );
  };

  const getOrderById = (orderId: string) => {
    return orders.find((o) => o.id === orderId || o.orderNumber === orderId);
  };

  // Reviews — signed-in verified buyers only. Email comes from the customer
  // JWT server-side. Verification failures (403/404/409) propagate to the form;
  // only a network failure (status 0) queues locally as Pending.
  const addReview = async (productId: string, userName: string, orderNumber: string, rating: number, comment: string) => {
    const safeRating = Math.min(5, Math.max(1, Math.round(rating)));
    try {
      const res = await reviewsAPI.create({ productId, userName, orderNumber, rating: safeRating, comment });
      const created = (res as unknown as { review: Review }).review ?? (res as unknown as Review);
      if (created && (created as Review).id) {
        setReviews((prev) => [created as Review, ...prev]);
        return;
      }
      throw new Error('Review was not accepted. Please try again.');
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 0 || status === undefined) {
        const pending: Review = {
          id: 'rev-' + Date.now(),
          productId,
          userName,
          orderNumber,
          verifiedPurchase: false,
          rating: safeRating,
          comment,
          status: 'Pending',
          createdAt: new Date().toISOString(),
        };
        setReviews((prev) => [pending, ...prev]);
        return;
      }
      throw err;
    }
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
    const next = { ...settings, ...newSettings };
    setSettings(next);
    try {
      localStorage.setItem('alsaifee_settings', JSON.stringify(next));
      window.dispatchEvent(new Event('alsaifee_settings'));
    } catch {}
    try {
      await settingsAPI.update(next);
    } catch {}
  };

  return (
    <StoreContext.Provider
      value={{
        products, orders, reviews, settings, wishlist, wishlistLoading, loading,
        toggleWishlist, isInWishlist,
        addProduct, updateProduct, deleteProduct, saveProduct, resetDemoProducts,
        updateOrderStatus, getOrderById,
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
