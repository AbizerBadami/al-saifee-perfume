import React from 'react';
import { Hero } from '../components/Hero';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import styles from './Home.module.css';

export const Home: React.FC = () => {
  const { products } = useStore();

  const featured = products.filter((p) => p.isFeatured).slice(0, 4);
  const bestSellers = products.filter((p) => p.isBestSeller).slice(0, 4);

  return (
    <div className={styles.page}>
      <Hero />

      {/* Featured Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Curated Masterpieces</h2>
          <p className={styles.sectionSub}>
            Discover rare olfactory creations distilled from wild aged agarwood resins and haute French extracts.
          </p>
        </div>

        <div className={styles.productGrid}>
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Brand Heritage Story Banner */}
      <section className={styles.storyBanner}>
        <div className={styles.storyContainer}>
          <img
            src="https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&q=80&w=800"
            alt="Artisanal Oud Alchemy"
            className={styles.storyImage}
            referrerPolicy="no-referrer"
          />

          <div>
            <h2 className={styles.storyTitle}>Three Decades of Wild Agarwood Mastery</h2>
            <p className={styles.storyText}>
              In our private atelier, master perfumers slow-distill 30-year-old Cambodian wild agarwood in traditional hand-hammered copper stills. Each drop of pure attar oil undergoes six months of subterranean dark maturation, yielding an intoxicating depth impossible to replicate artificially.
            </p>
            <p className={styles.storyText}>
              Free from synthetic extenders or industrial fillers. Pure unadulterated luxury.
            </p>
          </div>
        </div>
      </section>

      {/* Best Sellers Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>The Sovereign Collection</h2>
          <p className={styles.sectionSub}>
            Our most revered signatures requested by discerning royal families and perfume connoisseurs worldwide.
          </p>
        </div>

        <div className={styles.productGrid}>
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
};
