import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiShoppingBag, FiHeart, FiSearch, FiMenu, FiX } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import styles from './Navbar.module.css';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { itemCount, openCart } = useCart();
  const { wishlist, settings } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <>
      <div className={styles.banner}>
        {settings.promoMessage}
      </div>

      <header className={styles.header}>
        <div className={styles.container}>
          <Link to="/" className={styles.logoArea}>
            <div>
              <div className={styles.logoText}>AL-SAIFEE PERFUMES</div>
              <div className={styles.logoSub}>Haute Parfumerie & Wild Aged Oud</div>
            </div>
          </Link>

          <nav>
            <ul className={styles.navLinks}>
              <li>
                <Link to="/" className={`${styles.navLink} ${location.pathname === '/' ? styles.activeLink : ''}`}>
                  Home
                </Link>
              </li>
              <li>
                <Link to="/shop" className={`${styles.navLink} ${location.pathname === '/shop' ? styles.activeLink : ''}`}>
                  Collection
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Pure%20Attars" className={`${styles.navLink} ${location.search.includes('Attars') ? styles.activeLink : ''}`}>
                  Pure Attars
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Oud%20Specials" className={`${styles.navLink} ${location.search.includes('Oud') ? styles.activeLink : ''}`}>
                  Oud Specials
                </Link>
              </li>
              <li>
                <Link to="/tracking" className={`${styles.navLink} ${location.pathname === '/tracking' ? styles.activeLink : ''}`}>
                  Track Order
                </Link>
              </li>
            </ul>
          </nav>

          <div className={styles.actions}>
            <Link to="/shop" className={styles.iconBtn} title="Search fragrances">
              <FiSearch />
            </Link>

            <Link to="/wishlist" className={styles.iconBtn} title="Saved Wishlist">
              <FiHeart />
              {wishlist.length > 0 && <span className={styles.badge}>{wishlist.length}</span>}
            </Link>

            <button className={styles.iconBtn} onClick={openCart} title="Shopping Cart">
              <FiShoppingBag />
              {itemCount > 0 && <span className={styles.badge}>{itemCount}</span>}
            </button>

            <button
              className={styles.mobileMenuToggle}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className={styles.mobileDrawer}>
            <ul className={styles.mobileNavLinks}>
              <li>
                <Link
                  to="/"
                  className={`${styles.mobileNavLink} ${location.pathname === '/' ? styles.activeMobileLink : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/shop"
                  className={`${styles.mobileNavLink} ${location.pathname === '/shop' ? styles.activeMobileLink : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Collection
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?category=Pure%20Attars"
                  className={`${styles.mobileNavLink} ${location.search.includes('Attars') ? styles.activeMobileLink : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Pure Attars
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?category=Oud%20Specials"
                  className={`${styles.mobileNavLink} ${location.search.includes('Oud') ? styles.activeMobileLink : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Oud Specials
                </Link>
              </li>
              <li>
                <Link
                  to="/tracking"
                  className={`${styles.mobileNavLink} ${location.pathname === '/tracking' ? styles.activeMobileLink : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Track Order
                </Link>
              </li>
            </ul>
          </div>
        )}
      </header>
    </>
  );
};

