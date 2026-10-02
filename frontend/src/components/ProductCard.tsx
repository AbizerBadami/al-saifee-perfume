import React from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiShoppingBag, FiStar } from 'react-icons/fi';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useStore();
  const isWished = isInWishlist(product.id);

  const displayPrice = product.salePrice || product.price;

  return (
    <div className={styles.card}>
      <div className={styles.imageWrapper}>
        <Link to={`/product/${product.id}`}>
          <img
            src={product.images && product.images.length > 0 ? product.images[0] : 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=800'}
            alt={product.title}
            className={styles.image}
            referrerPolicy="no-referrer"
          />
        </Link>

        <div className={styles.badgeGroup}>
          {product.isBestSeller && <span className={`${styles.badge} ${styles.bestSellerBadge}`}>Best Seller</span>}
          {product.salePrice && <span className={styles.badge}>Special Offer</span>}
        </div>

        <button
          className={`${styles.wishlistBtn} ${isWished ? styles.activeWishlist : ''}`}
          onClick={() => toggleWishlist(product.id)}
          title={isWished ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <span style={{ color: isWished ? '#ef4444' : 'inherit', display: 'inline-block' }}><FiHeart /></span>
        </button>
      </div>

      <div className={styles.details}>
        <div>
          <div className={styles.category}>{product.category} • {product.fragranceFamily}</div>
          <Link to={`/product/${product.id}`}>
            <h3 className={styles.title}>{product.title}</h3>
          </Link>
          <div className={styles.subtitle}>{product.subtitle}</div>

          <div className={styles.ratingRow}>
            <span style={{ color: 'var(--gold-primary)', display: 'inline-block' }}><FiStar /></span>
            <span>{product.rating.toFixed(1)}</span>
            <span className={styles.reviewCount}>({product.reviewCount})</span>
          </div>
        </div>

        <div className={styles.footerRow}>
          <div className={styles.priceArea}>
            <span className={styles.price}>₹{displayPrice.toLocaleString('en-IN')}</span>
            {product.salePrice && <span className={styles.oldPrice}>₹{product.price.toLocaleString('en-IN')}</span>}
          </div>

          <button className={styles.cartBtn} onClick={() => addToCart(product)}>
            <FiShoppingBag /> Add
          </button>
        </div>
      </div>
    </div>
  );
};
