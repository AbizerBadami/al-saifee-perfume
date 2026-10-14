import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Hero.module.css';

export const Hero: React.FC = () => {
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.container}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Pure attars · Oud · Fine fragrance</p>
          <h1 id="hero-heading" className={styles.title}>
            Considered fragrance, made to be worn every day.
          </h1>
          <p className={styles.sub}>
            Alcohol-free attars and modern extraits with clear notes, honest sizes and
            transparent pricing. Start with a bestseller or explore by family.
          </p>
          <div className={styles.ctaRow}>
            <Link to="/shop" className="btn btn-primary">Shop bestsellers</Link>
            <Link to="/shop?category=Pure%20Attars" className="btn btn-secondary">Explore attars</Link>
          </div>
          <dl className={styles.proof}>
            <div><dt>Alcohol-free</dt><dd>Attars & oils</dd></div>
            <div><dt>Free shipping</dt><dd>Orders over ₹999</dd></div>
            <div><dt>Secure checkout</dt><dd>UPI · Cards · Netbanking</dd></div>
          </dl>
        </div>
        <div className={styles.visual}>
          <img
            src="https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=1000"
            alt="Al-Saifee perfume bottle on a neutral background"
            loading="eager"
            fetchPriority="high"
            referrerPolicy="no-referrer"
          />
          <div className={styles.card}>
            <strong>Wild Oud · Rose · Amber</strong>
            <span>Three most-loved notes across the collection</span>
            <Link to="/shop" className={styles.cardLink}>Browse the collection →</Link>
          </div>
        </div>
      </div>
    </section>
  );
};
