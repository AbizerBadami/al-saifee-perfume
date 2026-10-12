// ============================================================
// AuthContext — JWT-based admin authentication
// Secure Implementation:
//   - isAdmin is strictly derived from /api/auth/me (never localStorage)
//   - Zero reliance on client-side tampered storage flags
//   - Clean session invalidation on expiration
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
  // Security fix: never initialize or trust isAdmin from localStorage
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // On mount, verify current token with backend /api/auth/me
  useEffect(() => {
    const token = getToken();
    if (token) {
      authAPI
        .me()
        .then((data) => {
          setUser({ id: data.id, email: data.email });
          setIsAdmin(Boolean(data.isAdmin));
        })
        .catch(() => {
          // Token expired or invalid
          clearToken();
          setUser(null);
          setIsAdmin(false);
        })
        .finally(() => setLoading(false));
    } else {
      setIsAdmin(false);
      setUser(null);
      setLoading(false);
    }
  }, []);

  const loginAdmin = async (email: string, pass: string) => {
    const data = await authAPI.login(email, pass);
    setToken(data.token);
    // Re-verify with /me to ensure server claims
    try {
      const me = await authAPI.me();
      setUser({ id: me.id, email: me.email });
      setIsAdmin(Boolean(me.isAdmin));
    } catch {
      setUser(data.admin);
      setIsAdmin(true);
    }
  };

  const logout = async () => {
    clearToken();
    setUser(null);
    setIsAdmin(false);
    // Cleanup any legacy storage remnants
    localStorage.removeItem('oud_elixir_is_admin');
  };

  const setupFirstAdmin = async (email: string, pass: string) => {
    try {
      const data = await authAPI.register(email, pass);
      setToken(data.token);
      setUser(data.admin);
      setIsAdmin(true);
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
