import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiCheck } from 'react-icons/fi';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brandCol}>
          <div className={styles.brandName}>AL-SAIFEE PERFUMES</div>
          <p className={styles.brandDesc}>
            Artisanal fragrance house devoted to rare aged agarwoods, pure steam-distilled attar oils, and French haute-parfumerie extracts.
          </p>
        </div>

        <div>
          <h4 className={styles.colTitle}>Collections</h4>
          <ul className={styles.linkList}>
            <li><Link to="/shop?category=Perfumes" className={styles.linkItem}>Extraits de Parfum</Link></li>
            <li><Link to="/shop?category=Pure%20Attars" className={styles.linkItem}>Concentrated Attar Oils</Link></li>
            <li><Link to="/shop?category=Oud%20Specials" className={styles.linkItem}>Aged Wild Agarwoods</Link></li>
            <li><Link to="/shop?category=Artisanal%20Extracts" className={styles.linkItem}>Artisanal Extracts</Link></li>
          </ul>
        </div>

        <div>
          <h4 className={styles.colTitle}>Customer Care</h4>
          <ul className={styles.linkList}>
            <li><Link to="/tracking" className={styles.linkItem}>Track Order</Link></li>
            <li><Link to="/checkout" className={styles.linkItem}>Guest Checkout</Link></li>
            <li><Link to="/wishlist" className={styles.linkItem}>My Wishlist</Link></li>
            <li><Link to="/admin" className={styles.linkItem}>Admin Portal</Link></li>
          </ul>
        </div>

        <div>
          <h4 className={styles.colTitle}>The Private Club</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Subscribe for private releases of rare wild agarwood harvests and receive 10% off your first acquisition.
          </p>
          <form className={styles.newsForm} onSubmit={handleSubscribe}>
            <div className={styles.inputGroup}>
              <input
                type="email"
                placeholder="Enter email address"
                className={styles.newsInput}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className={styles.newsBtn}>
                {subscribed ? <FiCheck /> : <FiMail />}
              </button>
            </div>
            {subscribed && (
              <span style={{ fontSize: '0.75rem', color: 'var(--gold-primary)' }}>
                Welcome to the inner circle. Code <strong>WELCOME10</strong> unlocked!
              </span>
            )}
          </form>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <div>© {new Date().getFullYear()} Al-Saifee Perfumes House. All rights reserved.</div>
        <div>Complimentary Express Shipping Over ₹999</div>
      </div>
    </footer>
  );
};
