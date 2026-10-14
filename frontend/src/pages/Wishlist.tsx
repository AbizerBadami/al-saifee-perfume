import React from 'react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import styles from './Wishlist.module.css';

export const Wishlist: React.FC = () => {
  const { products, wishlist } = useStore();
  const saved = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className={styles.page}>
      <div className="container">
        <p className="eyebrow">Saved</p>
        <h1 className={styles.h1}>Wishlist ({saved.length})</h1>
        {saved.length === 0 ? (
          <div className="empty">
            <h2 style={{ fontSize: '1.15rem', margin: '0 0 0.5rem' }}>Nothing saved yet</h2>
            <p>Tap the heart on any product to keep it here.</p>
            <p style={{ marginTop: '1rem' }}><Link to="/shop" className="btn btn-primary">Browse fragrances</Link></p>
          </div>
        ) : (
          <div className={styles.grid}>
            {saved.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
};
