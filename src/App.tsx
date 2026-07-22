import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <StoreProvider>
            <CartProvider>
              <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', color: 'var(--text-primary)', transition: 'background 0.3s ease, color 0.3s ease' }}>
                <Navbar />
                <CartDrawer />

                <main style={{ flex: 1 }}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/success" element={<Success />} />
                    <Route path="/tracking" element={<OrderTracking />} />
                    <Route path="/wishlist" element={<Wishlist />} />
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin" element={<AdminDashboard />} />
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
