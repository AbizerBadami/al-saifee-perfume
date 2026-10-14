import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHeart, FiShoppingBag, FiStar } from 'react-icons/fi';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import styles from './ProductCard.module.css';

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useStore();
  const navigate = useNavigate();
  const wished = isInWishlist(product.id);
  const price = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;
  const out = product.stock <= 0;
  const low = !out && product.stock <= 10;
  const discount = product.salePrice && product.salePrice < product.price
    ? Math.round((1 - product.salePrice / product.price) * 100)
    : 0;

  return (
    <article className={styles.card} aria-labelledby={`p-${product.id}`}>
      <div className={styles.media}>
        <Link to={`/product/${product.id}`} tabIndex={-1} aria-hidden="true">
          <img
            src={product.images?.[0] || 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=800'}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </Link>
        <div className={styles.badges}>
          {discount > 0 && <span className={styles.off}>{discount}% off</span>}
          {product.isBestSeller && <span className={styles.tag}>Bestseller</span>}
          {out && <span className={styles.soldout}>Sold out</span>}
        </div>
        <button
          type="button"
          className={`${styles.wish} ${wished ? styles.wished : ''}`}
          onClick={async () => {
            const r = await toggleWishlist(product.id);
            if (r.authRequired) navigate(`/login?redirect=${encodeURIComponent(`/product/${product.id}`)}`);
          }}
          aria-pressed={wished}
          aria-label={wished ? `Remove ${product.title} from wishlist` : `Save ${product.title} to wishlist (sign-in required)`}
        >
          <FiHeart aria-hidden="true" />
        </button>
      </div>

      <div className={styles.body}>
        <p className={styles.meta}>{product.category} · {product.fragranceFamily}</p>
        <Link to={`/product/${product.id}`} id={`p-${product.id}`} className={styles.title}>
          <h3>{product.title}</h3>
        </Link>
        <p className={styles.sub}>{product.subtitle}</p>
        <p className={styles.rating} aria-label={`Rated ${product.rating.toFixed(1)} out of 5 from ${product.reviewCount} reviews`}>
          <FiStar aria-hidden="true" /> {product.rating.toFixed(1)} <span>({product.reviewCount})</span>
        </p>
        <div className={styles.buy}>
          <p className={styles.price}>
            <strong>{formatINR(price)}</strong>
            {product.salePrice ? <s>{formatINR(product.price)}</s> : null}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={out}
            onClick={() => {
              const r = addToCart(product);
              if (r.reason === 'auth_required') navigate(`/login?redirect=${encodeURIComponent(`/product/${product.id}`)}`);
            }}
            aria-label={out ? `${product.title} is out of stock` : `Add ${product.title} to cart (sign-in required)`}
          >
            <FiShoppingBag aria-hidden="true" /> {out ? 'Sold out' : 'Add'}
          </button>
        </div>
        {low ? <p className={styles.low} role="status">Only {product.stock} left</p> : null}
        <p className={styles.size}>{product.bottleSizes?.[0] ? `From ${product.bottleSizes[0]} · ${product.bottleSizes.length} sizes` : 'Multiple sizes'}</p>
      </div>
    </article>
  );
};
