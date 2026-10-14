import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';

import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { Checkout } from './pages/Checkout';
import { Success } from './pages/Success';
import { OrderTracking } from './pages/OrderTracking';
import { Wishlist } from './pages/Wishlist';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Account } from './pages/Account';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { useAuth } from './context/AuthContext';

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, search]);
  return null;
}

function RequireAdmin({ children }: { children: React.ReactElement }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="container" style={{ padding: '4rem 1.25rem' }}><p className="muted">Checking access…</p></div>;
  if (!isAdmin) return <AdminLogin />;
  return children;
}

function RequireCustomer({ children }: { children: React.ReactElement }) {
  const { isCustomer, customerLoading } = useAuth();
  const location = useLocation();
  if (customerLoading) return <div className="container" style={{ padding: '4rem 1.25rem' }}><p className="muted">Checking access…</p></div>;
  if (!isCustomer) {
    const redirect = `${location.pathname}${location.search}`;
    return <Login redirectTo={redirect} />;
  }
  return children;
}

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <StoreProvider>
            <CartProvider>
              <a href="#main" className="skip-link">Skip to main content</a>
              <ScrollToTop />
              <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <Navbar />
                <CartDrawer />
                <main id="main" style={{ flex: 1 }}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/checkout" element={<RequireCustomer><Checkout /></RequireCustomer>} />
                    <Route path="/success" element={<RequireCustomer><Success /></RequireCustomer>} />
                    <Route path="/tracking" element={<OrderTracking />} />
                    <Route path="/wishlist" element={<RequireCustomer><Wishlist /></RequireCustomer>} />
                    <Route path="/account" element={<RequireCustomer><Account /></RequireCustomer>} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
                    <Route path="*" element={<Home />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            </CartProvider>
          </StoreProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
