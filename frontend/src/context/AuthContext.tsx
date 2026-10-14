import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  authAPI, customerAPI,
  setToken, clearToken, getToken,
  setCustomerToken, clearCustomerToken, getCustomerToken,
} from '../lib/api';
import type { Customer } from '../types';

interface AdminUser {
  id: string;
  email: string;
}

interface AuthContextType {
  // Admin (single DB-provisioned account)
  user: AdminUser | null;
  isAdmin: boolean;
  loading: boolean;
  loginAdmin: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  // Customer (shopper accounts; wishlist/cart/orders require sign-in)
  customer: Customer | null;
  isCustomer: boolean;
  customerLoading: boolean;
  loginCustomer: (email: string, pass: string) => Promise<void>;
  registerCustomer: (name: string, email: string, pass: string) => Promise<void>;
  logoutCustomer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const FLAG = 'alsaifee_is_admin';
const LEGACY_FLAG = 'oud_elixir_is_admin';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      if (localStorage.getItem(FLAG) === 'true') return true;
      if (localStorage.getItem(LEGACY_FLAG) === 'true') {
        localStorage.setItem(FLAG, 'true');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(true);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerLoading, setCustomerLoading] = useState(true);
  const isCustomer = customer !== null;

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    authAPI.me()
      .then((data) => {
        if (cancelled) return;
        setUser({ id: data.id, email: data.email });
        setIsAdmin(true);
        try { localStorage.setItem(FLAG, 'true'); } catch {}
      })
      .catch(() => {
        if (cancelled) return;
        clearToken();
        setUser(null);
        setIsAdmin(false);
        try { localStorage.removeItem(FLAG); localStorage.removeItem(LEGACY_FLAG); } catch {}
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    const onLogout = () => {
      setUser(null);
      setIsAdmin(false);
    };
    window.addEventListener('alsaifee_logout', onLogout);
    return () => { cancelled = true; window.removeEventListener('alsaifee_logout', onLogout); };
  }, []);

  useEffect(() => {
    if (!getCustomerToken()) {
      setCustomerLoading(false);
      return;
    }
    let cancelled = false;
    customerAPI.me()
      .then((data) => { if (!cancelled) setCustomer({ id: data.id, name: data.name, email: data.email }); })
      .catch(() => { if (!cancelled) { clearCustomerToken(); setCustomer(null); } })
      .finally(() => { if (!cancelled) setCustomerLoading(false); });
    const onLogout = () => setCustomer(null);
    window.addEventListener('alsaifee_customer_logout', onLogout);
    return () => { cancelled = true; window.removeEventListener('alsaifee_customer_logout', onLogout); };
  }, []);

  const loginAdmin = async (email: string, pass: string) => {
    const data = await authAPI.login(email, pass);
    setToken(data.token);
    setUser(data.admin as AdminUser);
    setIsAdmin(true);
    try { localStorage.setItem(FLAG, 'true'); } catch {}
  };

  const logout = async () => {
    clearToken();
    setUser(null);
    setIsAdmin(false);
    try { localStorage.removeItem(FLAG); localStorage.removeItem(LEGACY_FLAG); } catch {}
  };

  const loginCustomer = async (email: string, pass: string) => {
    const data = await customerAPI.login(email, pass);
    setCustomerToken(data.token);
    setCustomer(data.customer);
  };

  const registerCustomer = async (name: string, email: string, pass: string) => {
    const data = await customerAPI.register(name, email, pass);
    setCustomerToken(data.token);
    setCustomer(data.customer);
  };

  const logoutCustomer = useCallback(() => {
    clearCustomerToken();
    setCustomer(null);
    try {
      localStorage.removeItem('alsaifee_cart');
      localStorage.removeItem('alsaifee_wishlist');
    } catch {}
    window.dispatchEvent(new Event('alsaifee_customer_cart_reset'));
  }, []);

  return (
    <AuthContext.Provider value={{
      user, isAdmin, loading, loginAdmin, logout,
      customer, isCustomer, customerLoading, loginCustomer, registerCustomer, logoutCustomer,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
