import React, { createContext, useContext, useState, useEffect } from 'react';
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
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);
  
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('oud_elixir_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(true);

  const getHeaders = () => {
    const token = localStorage.getItem('oud_elixir_admin_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  // Fetch initial data from D1 Worker API
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [prodRes, ordRes, revRes, setRes] = await Promise.all([
          fetch('/api/products').catch(() => null),
          fetch('/api/orders', { headers: getHeaders() }).catch(() => null),
          fetch('/api/reviews').catch(() => null),
          fetch('/api/settings').catch(() => null)
        ]);

        if (prodRes && prodRes.ok) {
          const data = (await prodRes.json()) as { products: Product[] };
          setProducts(data.products || []);
        } else {
          setProducts(INITIAL_PRODUCTS);
        }

        if (ordRes && ordRes.ok) {
          const data = (await ordRes.json()) as { orders: Order[] };
          setOrders(data.orders || []);
        }

        if (revRes && revRes.ok) {
          const data = (await revRes.json()) as { reviews: Review[] };
          setReviews(data.reviews || []);
        }

        if (setRes && setRes.ok) {
          const data = (await setRes.json()) as StoreSettings;
          setSettings(data);
        }
      } catch (err) {
        console.error('Error fetching data from API', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  useEffect(() => {
    localStorage.setItem('oud_elixir_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]));
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  // Products CRUD
  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewCount'>) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(productData)
      });
      if (res.ok) {
        const newProduct = (await res.json()) as Product;
        setProducts((prev) => [newProduct, ...prev]);
      }
    } catch (e) {
      console.error('Failed to add product', e);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updated = (await res.json()) as Partial<Product>;
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      }
    } catch (e) {
      console.error('Failed to update product', e);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete product', e);
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
  };

  // Orders CRUD
  const createOrder = async (orderData: Omit<Order, 'id' | 'createdAt'>): Promise<Order> => {
    // In a real app, you might not save directly here if checkout.ts does it.
    // However, if the checkout doesn't save to the DB, we save it now.
    // Assuming /api/orders POST handles creation.
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    
    if (!res.ok) {
      throw new Error('Failed to create order');
    }
    
    const newOrder = (await res.json()) as Order;
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const updateOrderStatus = async (orderId: string, status: Order['status'], trackingNumber?: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status, trackingNumber })
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status, trackingNumber: trackingNumber || o.trackingNumber } : o)));
      }
    } catch (e) {
      console.error('Failed to update order', e);
    }
  };

  const getOrderById = (orderId: string) => {
    return orders.find((o) => o.id === orderId || o.orderNumber === orderId);
  };

  // Reviews CRUD
  const addReview = async (productId: string, userName: string, userEmail: string, rating: number, comment: string) => {
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, userName, userEmail, rating, comment })
      });
      
      if (res.ok) {
        const newReview = (await res.json()) as Review;
        setReviews((prev) => [newReview, ...prev]);
        
        // Refresh products to get updated rating
        fetch('/api/products').then(r => r.json()).then(data => {
          const parsed = data as { products: Product[] };
          if (parsed.products) setProducts(parsed.products);
        });
      }
    } catch (e) {
      console.error('Failed to add review', e);
    }
  };

  const approveReview = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: 'Approved' })
      });
      if (res.ok) {
        setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, status: 'Approved' } : r)));
      }
    } catch (e) {
      console.error('Failed to approve review', e);
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      }
    } catch (e) {
      console.error('Failed to delete review', e);
    }
  };

  const moderateReview = async (reviewId: string, status: 'Approved' | 'Rejected') => {
    if (status === 'Approved') {
      await approveReview(reviewId);
    } else {
      await deleteReview(reviewId);
    }
  };

  // Settings
  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const updated = (await res.json()) as StoreSettings;
        setSettings(updated);
      }
    } catch (e) {
      console.error('Failed to update settings', e);
    }
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        orders,
        reviews,
        settings,
        wishlist,
        loading,
        toggleWishlist,
        isInWishlist,
        addProduct,
        updateProduct,
        deleteProduct,
        saveProduct,
        resetDemoProducts,
        createOrder,
        updateOrderStatus,
        getOrderById,
        addReview,
        approveReview,
        deleteReview,
        moderateReview,
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
