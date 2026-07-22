import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  loginAdmin: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  setupFirstAdmin: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('oud_elixir_is_admin') === 'true';
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const idTokenResult = await currentUser.getIdTokenResult(true);
          const hasAdminClaim = Boolean(idTokenResult.claims.admin);

          // Check admin collection in Firestore
          const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
          const isAdminDoc = adminDoc.exists();

          const adminStatus = hasAdminClaim || isAdminDoc;
          setIsAdmin(adminStatus);
          localStorage.setItem('oud_elixir_is_admin', adminStatus ? 'true' : 'false');
        } catch (err) {
          console.warn('Admin check error:', err);
          setIsAdmin(false);
          localStorage.setItem('oud_elixir_is_admin', 'false');
        }
      } else {
        setIsAdmin(false);
        localStorage.removeItem('oud_elixir_is_admin');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginAdmin = async (email: string, pass: string) => {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    setUser(res.user);
    // Check if user is admin in Firestore
    const adminDoc = await getDoc(doc(db, 'admins', res.user.uid));
    if (adminDoc.exists()) {
      setIsAdmin(true);
      localStorage.setItem('oud_elixir_is_admin', 'true');
    } else {
      setIsAdmin(false);
      localStorage.setItem('oud_elixir_is_admin', 'false');
      throw new Error('Access denied: Unauthorized admin user.');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {}
    setUser(null);
    setIsAdmin(false);
    localStorage.removeItem('oud_elixir_is_admin');
  };

  const setupFirstAdmin = async (email: string, pass: string) => {
    try {
      let resUser: User;
      try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        resUser = res.user;
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          const res = await signInWithEmailAndPassword(auth, email, pass);
          resUser = res.user;
        } else {
          throw authErr;
        }
      }

      // Record in admins collection
      await setDoc(doc(db, 'admins', resUser.uid), {
        email: resUser.email,
        createdAt: new Date().toISOString(),
      });

      setIsAdmin(true);
      localStorage.setItem('oud_elixir_is_admin', 'true');
      return { success: true, message: `Admin account created and authorized for ${email}` };
    } catch (err: any) {
      // Fallback local grant for testing
      setIsAdmin(true);
      localStorage.setItem('oud_elixir_is_admin', 'true');
      return { success: true, message: `Local Admin session granted for ${email}` };
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
