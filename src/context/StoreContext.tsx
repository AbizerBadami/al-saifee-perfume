import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { Product, Order, Review, Coupon, StoreSettings } from '../types';
import { INITIAL_PRODUCTS, INITIAL_COUPONS, INITIAL_SETTINGS } from '../utils/seedData';

interface StoreContextType {
  products: Product[];
  orders: Order[];
  reviews: Review[];
  coupons: Coupon[];
  settings: StoreSettings;
  wishlist: string[];
  loading: boolean;
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewCount'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  createOrder: (orderData: Omit<Order, 'id' | 'createdAt'>) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: Order['status'], trackingNumber?: string) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
  addReview: (productId: string, userName: string, userEmail: string, rating: number, comment: string) => Promise<void>;
  approveReview: (reviewId: string) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  addCoupon: (coupon: Omit<Coupon, 'id' | 'createdAt'>) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('oud_elixir_products');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
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

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    try {
      const saved = localStorage.getItem('oud_elixir_coupons');
      return saved ? JSON.parse(saved) : INITIAL_COUPONS;
    } catch {
      return INITIAL_COUPONS;
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

  // Sync with Firestore if live connection available
  useEffect(() => {
    try {
      const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
        if (!snapshot.empty) {
          const list: Product[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
          setProducts(list);
        }
      }, () => {});

      const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
        if (!snapshot.empty) {
          const list: Order[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
          setOrders(list);
        }
      }, () => {});

      const unsubReviews = onSnapshot(collection(db, 'reviews'), (snapshot) => {
        if (!snapshot.empty) {
          const list: Review[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
          setReviews(list);
        }
      }, () => {});

      const unsubCoupons = onSnapshot(collection(db, 'coupons'), (snapshot) => {
        if (!snapshot.empty) {
          const list: Coupon[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Coupon));
          setCoupons(list);
        }
      }, () => {});

      return () => {
        unsubProducts();
        unsubOrders();
        unsubReviews();
        unsubCoupons();
      };
    } catch (e) {
      console.warn('Firestore real-time listeners inactive, using persistent local store');
    }
  }, []);

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('oud_elixir_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('oud_elixir_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('oud_elixir_reviews', JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem('oud_elixir_coupons', JSON.stringify(coupons));
  }, [coupons]);

  useEffect(() => {
    localStorage.setItem('oud_elixir_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('oud_elixir_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Wishlist
  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]));
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  // Products CRUD
  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewCount'>) => {
    const newId = 'prod-' + Date.now();
    const newProduct: Product = {
      ...productData,
      id: newId,
      rating: 5.0,
      reviewCount: 1,
      createdAt: new Date().toISOString(),
    };

    setProducts((prev) => [newProduct, ...prev]);

    try {
      await setDoc(doc(db, 'products', newId), newProduct);
    } catch (e) {
      console.warn('Saved product locally');
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));

    try {
      await updateDoc(doc(db, 'products', id), updates);
    } catch (e) {
      console.warn('Updated product locally');
    }
  };

  const deleteProduct = async (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));

    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (e) {
      console.warn('Deleted product locally');
    }
  };

  // Orders CRUD
  const createOrder = async (orderData: Omit<Order, 'id' | 'createdAt'>): Promise<Order> => {
    const newId = 'ord-' + Date.now();
    const newOrder: Order = {
      ...orderData,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);

    try {
      await setDoc(doc(db, 'orders', newId), newOrder);
    } catch (e) {
      console.warn('Saved order locally');
    }

    return newOrder;
  };

  const updateOrderStatus = async (orderId: string, status: Order['status'], trackingNumber?: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status, trackingNumber: trackingNumber || o.trackingNumber } : o))
    );

    try {
      await updateDoc(doc(db, 'orders', orderId), { status, trackingNumber });
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

    // Update product rating average
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
      await addDoc(collection(db, 'reviews'), newReview);
    } catch (e) {}
  };

  const approveReview = async (reviewId: string) => {
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, status: 'Approved' } : r)));
    try {
      await updateDoc(doc(db, 'reviews', reviewId), { status: 'Approved' });
    } catch (e) {}
  };

  const deleteReview = async (reviewId: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
    } catch (e) {}
  };

  // Coupons CRUD
  const addCoupon = async (couponData: Omit<Coupon, 'id' | 'createdAt'>) => {
    const newCoupon: Coupon = {
      ...couponData,
      id: 'coup-' + Date.now(),
      createdAt: new Date().toISOString(),
    };

    setCoupons((prev) => [newCoupon, ...prev]);
    try {
      await addDoc(collection(db, 'coupons'), newCoupon);
    } catch (e) {}
  };

  const deleteCoupon = async (id: string) => {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteDoc(doc(db, 'coupons', id));
    } catch (e) {}
  };

  // Settings
  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    try {
      await setDoc(doc(db, 'settings', 'store'), newSettings, { merge: true });
    } catch (e) {}
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        orders,
        reviews,
        coupons,
        settings,
        wishlist,
        loading,
        toggleWishlist,
        isInWishlist,
        addProduct,
        updateProduct,
        deleteProduct,
        createOrder,
        updateOrderStatus,
        getOrderById,
        addReview,
        approveReview,
        deleteReview,
        addCoupon,
        deleteCoupon,
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
