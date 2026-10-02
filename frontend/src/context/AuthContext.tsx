// ============================================================
// AuthContext — JWT-based admin authentication
// Replaces Firebase Auth entirely
// ============================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, setToken, clearToken, getToken } from '../lib/api';

interface AdminUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: AdminUser | null;
  isAdmin: boolean;
  loading: boolean;
  loginAdmin: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  setupFirstAdmin: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('oud_elixir_is_admin') === 'true';
  });
  const [loading, setLoading] = useState(true);

  // On mount, check if we have a valid token
  useEffect(() => {
    const token = getToken();
    if (token) {
      authAPI.me()
        .then((data) => {
          setUser({ id: data.id, email: data.email });
          setIsAdmin(true);
          localStorage.setItem('oud_elixir_is_admin', 'true');
        })
        .catch(() => {
          // Token expired or invalid
          clearToken();
          setUser(null);
          setIsAdmin(false);
          localStorage.removeItem('oud_elixir_is_admin');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginAdmin = async (email: string, pass: string) => {
    const data = await authAPI.login(email, pass);
    setToken(data.token);
    setUser(data.admin);
    setIsAdmin(true);
    localStorage.setItem('oud_elixir_is_admin', 'true');
  };

  const logout = async () => {
    clearToken();
    setUser(null);
    setIsAdmin(false);
    localStorage.removeItem('oud_elixir_is_admin');
  };

  const setupFirstAdmin = async (email: string, pass: string) => {
    try {
      const data = await authAPI.register(email, pass);
      setToken(data.token);
      setUser(data.admin);
      setIsAdmin(true);
      localStorage.setItem('oud_elixir_is_admin', 'true');
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Registration failed' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, loginAdmin, logout, setupFirstAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
