import React from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiShoppingBag } from 'react-icons/fi';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import styles from './Wishlist.module.css';

export const Wishlist: React.FC = () => {
  const { products, wishlist } = useStore();

  const wishedProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className={styles.page}>
      <div className={styles.titleArea}>
        <h1 className={styles.title}>Private Wishlist Sanctuary</h1>
        <p className={styles.subtitle}>Your curated selection of rare artisanal fragrances saved for acquisition</p>
      </div>

      {wishedProducts.length === 0 ? (
        <div className={styles.emptyState}>
          <div style={{ fontSize: '3rem', color: 'var(--gold-primary)', marginBottom: '1rem' }}><FiHeart /></div>
          <h3>Your Wishlist is Empty</h3>
          <p style={{ margin: '0.75rem 0 1.5rem', fontSize: '0.9rem' }}>
            Tap the heart icon on any fragrance formulation to save it to your private list.
          </p>
          <Link
            to="/shop"
            style={{
              background: 'var(--gold-gradient)',
              color: '#000',
              fontWeight: '700',
              padding: '0.75rem 1.75rem',
              borderRadius: 'var(--radius-sm)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              textTransform: 'uppercase',
              fontSize: '0.85rem'
            }}
          >
            <FiShoppingBag /> Explore Fragrances
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {wishedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};
