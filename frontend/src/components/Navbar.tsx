import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FiShoppingBag, FiHeart, FiSearch, FiMenu, FiX, FiMoon, FiSun } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { useTheme } from '../context/ThemeContext';
import styles from './Navbar.module.css';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { itemCount, openCart } = useCart();
  const { wishlist, settings } = useStore();
  const { isDark, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMobileMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(query.trim() ? `/shop?q=${encodeURIComponent(query.trim())}` : '/shop');
    setIsMobileMenuOpen(false);
  };

  const linkCls = ({ isActive }: { isActive: boolean }) => (isActive ? `${styles.navLink} ${styles.active}` : styles.navLink);

  return (
    <>
      {settings.promoMessage ? <div className={styles.banner} role="note">{settings.promoMessage}</div> : null}
      <header className={styles.header}>
        <div className={styles.container}>
          <Link to="/" className={styles.brand} aria-label="Al-Saifee Perfumes home">
            <span className={styles.mark} aria-hidden="true">A</span>
            <span className={styles.brandText}>
              <span className={styles.brandName}>Al-Saifee</span>
              <span className={styles.brandSub}>Perfumes · Attar & Oud</span>
            </span>
          </Link>

          <nav aria-label="Primary" className={styles.desktopNav}>
            <NavLink to="/" end className={linkCls}>Home</NavLink>
            <NavLink to="/shop" end className={linkCls}>Shop all</NavLink>
            <NavLink to="/shop?category=Pure%20Attars" className={linkCls}>Pure Attars</NavLink>
            <NavLink to="/shop?category=Oud%20Specials" className={linkCls}>Oud</NavLink>
            <NavLink to="/tracking" className={linkCls}>Track order</NavLink>
          </nav>

          <div className={styles.actions}>
            <form className={styles.search} onSubmit={submitSearch} role="search">
              <FiSearch aria-hidden="true" />
              <label htmlFor="site-search" className="sr-only">Search fragrances</label>
              <input
                id="site-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search rose, oud, vanilla…"
                autoComplete="off"
              />
            </form>
            <Link to="/wishlist" className={styles.iconBtn} aria-label={`Wishlist, ${wishlist.length} items`}>
              <FiHeart aria-hidden="true" />
              {wishlist.length > 0 && <span className={styles.badge} aria-hidden="true">{wishlist.length}</span>}
            </Link>
            <button className={styles.iconBtn} onClick={openCart} aria-label={`Open cart, ${itemCount} items`}>
              <FiShoppingBag aria-hidden="true" />
              {itemCount > 0 && <span className={styles.badge} aria-hidden="true" aria-live="polite">{itemCount}</span>}
            </button>
            <button className={styles.iconBtn} onClick={toggleTheme} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {isDark ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}
            </button>
            <button
              className={styles.menuBtn}
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className={styles.mobileWrap}>
            <div className={styles.scrim} onClick={() => setIsMobileMenuOpen(false)} aria-hidden="true" />
            <nav id="mobile-nav" aria-label="Mobile" className={styles.mobileNav}>
              <form className={styles.mobileSearch} onSubmit={submitSearch} role="search">
                <label htmlFor="mobile-search" className="sr-only">Search fragrances</label>
                <input id="mobile-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search fragrances…" />
                <button type="submit" className="btn btn-primary">Search</button>
              </form>
              <Link to="/" className={styles.mobileLink}>Home</Link>
              <Link to="/shop" className={styles.mobileLink}>Shop all</Link>
              <Link to="/shop?category=Pure%20Attars" className={styles.mobileLink}>Pure Attars</Link>
              <Link to="/shop?category=Oud%20Specials" className={styles.mobileLink}>Oud Specials</Link>
              <Link to="/shop?category=Perfumes" className={styles.mobileLink}>Perfumes</Link>
              <Link to="/tracking" className={styles.mobileLink}>Track order</Link>
              <Link to="/wishlist" className={styles.mobileLink}>Wishlist</Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
};
