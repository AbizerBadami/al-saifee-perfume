import React from 'react';
import { Link } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import styles from './Home.module.css';

const COLLECTIONS = [
  { title: 'Pure Attars', blurb: 'Alcohol-free concentrated oils', to: '/shop?category=Pure%20Attars', img: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&q=80&w=800' },
  { title: 'Oud Specials', blurb: 'Aged agarwood & deep woods', to: '/shop?category=Oud%20Specials', img: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&q=80&w=800' },
  { title: 'Perfumes', blurb: 'Everyday extraits & sprays', to: '/shop?category=Perfumes', img: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&q=80&w=800' },
];

export const Home: React.FC = () => {
  const { products } = useStore();
  const featured = products.filter((p) => p.isFeatured).slice(0, 4);
  const bestSellers = products.filter((p) => p.isBestSeller).slice(0, 4);
  const showFeatured = (featured.length ? featured : products.slice(0, 4));
  const showBest = (bestSellers.length ? bestSellers : products.slice(0, 4));

  return (
    <div>
      <Hero />

      <section className={styles.section} aria-labelledby="collections-h">
        <div className="container">
          <p className="eyebrow">Shop by collection</p>
          <h2 id="collections-h" className={styles.h2}>Three ways to start</h2>
          <div className={styles.collections}>
            {COLLECTIONS.map((c) => (
              <Link key={c.title} to={c.to} className={styles.tile}>
                <img src={c.img} alt="" loading="lazy" referrerPolicy="no-referrer" />
                <span className={styles.tileBody}>
                  <strong>{c.title}</strong>
                  <span>{c.blurb}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="feat-h">
        <div className="container">
          <div className={styles.row}>
            <div>
              <p className="eyebrow">Featured</p>
              <h2 id="feat-h" className={styles.h2}>Loved for everyday wear</h2>
              <p className={styles.lead}>Clear notes, honest longevity, sizes and prices up front.</p>
            </div>
            <Link to="/shop" className="btn btn-secondary">View all</Link>
          </div>
          <div className={styles.grid}>
            {showFeatured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.band}`} aria-labelledby="why-h">
        <div className="container">
          <h2 id="why-h" className={styles.h2}>Simple, transparent shopping</h2>
          <div className={styles.why}>
            <div><strong>Prices include taxes</strong><span>No surprises at checkout. Shipping calculated clearly.</span></div>
            <div><strong>Sizes & stock shown</strong><span>Pick a bottle size, see availability before you buy.</span></div>
            <div><strong>Track every order</strong><span>Order number + email gives you live status.</span></div>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="best-h">
        <div className="container">
          <div className={styles.row}>
            <div>
              <p className="eyebrow">Bestsellers</p>
              <h2 id="best-h" className={styles.h2}>Most repurchased</h2>
            </div>
            <Link to="/shop?sort=rating" className="btn btn-secondary">Top rated</Link>
          </div>
          <div className={styles.grid}>
            {showBest.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>
    </div>
  );
};
