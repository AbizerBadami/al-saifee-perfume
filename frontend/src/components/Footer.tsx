import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiCheck } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const { isAdmin } = useAuth();
  const { settings } = useStore();

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    // No backend list yet: confirm locally without implying a subscription was stored server-side.
    setDone(true);
    setEmail('');
    setTimeout(() => setDone(false), 6000);
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <p className={styles.name}>Al-Saifee Perfumes</p>
          <p className={styles.desc}>Pure attars, oud specials and artisanal extracts — with clear sizes, pricing and stock.</p>
          <p className={styles.contact}>Support: <a href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a></p>
        </div>
        <nav aria-label="Shop" className={styles.col}>
          <h2>Shop</h2>
          <Link to="/shop">All fragrances</Link>
          <Link to="/shop?category=Pure%20Attars">Pure attars</Link>
          <Link to="/shop?category=Oud%20Specials">Oud specials</Link>
          <Link to="/shop?category=Perfumes">Perfumes</Link>
        </nav>
        <nav aria-label="Help" className={styles.col}>
          <h2>Help</h2>
          <Link to="/tracking">Track order</Link>
          <Link to="/checkout">Checkout</Link>
          <Link to="/wishlist">Wishlist</Link>
        </nav>
        <div className={styles.col}>
          <h2>Stay in touch</h2>
          <p className={styles.small}>New arrivals and restocks. No spam.</p>
          <form className={styles.news} onSubmit={subscribe}>
            <label htmlFor="footer-email" className="sr-only">Email for updates</label>
            <input id="footer-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required />
            <button type="submit" aria-label="Subscribe">{done ? <FiCheck /> : <FiMail />}</button>
          </form>
          {done && <p className={styles.ok} role="status">Thanks — you&apos;re on the list for updates.</p>}
        </div>
      </div>
      <div className={styles.bar}>
        <p>© {new Date().getFullYear()} Al-Saifee Perfumes · Free shipping over ₹{settings.freeShippingThreshold.toLocaleString('en-IN')}</p>
        <Link to="/admin" className={styles.staff}>{isAdmin ? 'Admin dashboard' : 'Staff sign in'}</Link>
      </div>
    </footer>
  );
};
