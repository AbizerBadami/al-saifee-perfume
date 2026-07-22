import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiAward } from 'react-icons/fi';
import styles from './Hero.module.css';

export const Hero: React.FC = () => {
  return (
    <section className={styles.heroSection}>
      <div className={styles.bgOverlay} />

      <div className={styles.content}>
        <div className={styles.pill}>
          <span style={{ color: 'var(--gold-primary)', display: 'inline-block' }}><FiAward /></span>
          Al-Saifee Perfumes • Haute Parfumerie & Wild Aged Oud
        </div>

        <h1 className={styles.headline}>
          Scent of Sovereignty & <span className={styles.goldText}>Pure Artisanal Alchemy</span>
        </h1>

        <p className={styles.subhead}>
          Handcrafted in micro-batches using 30-year aged wild Cambodian agarwood, night-blooming Grasse jasmine, and rare steam-distilled attar oils.
        </p>

        <div className={styles.btnGroup}>
          <Link to="/shop" className={styles.primaryBtn}>
            Explore Collection <span style={{ marginLeft: '0.5rem', verticalAlign: 'middle', display: 'inline-block' }}><FiArrowRight /></span>
          </Link>
          <Link to="/shop?category=Pure%20Attars" className={styles.secondaryBtn}>
            Pure Attar Oils
          </Link>
        </div>
      </div>
    </section>
  );
};
