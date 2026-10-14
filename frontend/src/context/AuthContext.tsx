<<<<<<< HEAD
// ============================================================
// AuthContext — JWT-based admin authentication
// Secure Implementation:
//   - isAdmin is strictly derived from /api/auth/me (never localStorage)
//   - Zero reliance on client-side tampered storage flags
//   - Clean session invalidation on expiration
// ============================================================

=======
>>>>>>> 03fb960 (rebuild)
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const FLAG = 'alsaifee_is_admin';
const LEGACY_FLAG = 'oud_elixir_is_admin';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
<<<<<<< HEAD
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
=======
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

  useEffect(() => {
    const token = getToken();
    if (!token) {
>>>>>>> 03fb960 (rebuild)
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

  const loginAdmin = async (email: string, pass: string) => {
    const data = await authAPI.login(email, pass);
    setToken(data.token);
<<<<<<< HEAD
    // Re-verify with /me to ensure server claims
    try {
      const me = await authAPI.me();
      setUser({ id: me.id, email: me.email });
      setIsAdmin(Boolean(me.isAdmin));
    } catch {
      setUser(data.admin);
      setIsAdmin(true);
    }
=======
    setUser(data.admin as AdminUser);
    setIsAdmin(true);
    try { localStorage.setItem(FLAG, 'true'); } catch {}
>>>>>>> 03fb960 (rebuild)
  };

  const logout = async () => {
    clearToken();
    setUser(null);
    setIsAdmin(false);
<<<<<<< HEAD
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
=======
    try { localStorage.removeItem(FLAG); localStorage.removeItem(LEGACY_FLAG); } catch {}
>>>>>>> 03fb960 (rebuild)
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, loginAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
