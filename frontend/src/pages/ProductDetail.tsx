import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiHeart, FiShoppingBag, FiArrowLeft, FiMinus, FiPlus } from 'react-icons/fi';
import { useStore } from '../context/StoreContext';
import { useCart } from '../context/CartContext';
import { FragranceNotes } from '../components/FragranceNotes';
import { ReviewSection } from '../components/ReviewSection';
import styles from './ProductDetail.module.css';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { products, isInWishlist, toggleWishlist } = useStore();
  const { addToCart } = useCart();
  const product = products.find((p) => p.id === id);

  const [imgIdx, setImgIdx] = useState(0);
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);

  if (!product) {
    return (
      <div className="container" style={{ padding: '4rem 1.25rem', textAlign: 'center' }}>
        <p className="eyebrow">Not found</p>
        <h1>This fragrance isn&apos;t available</h1>
        <p className="muted" style={{ margin: '0.75rem 0 1.5rem' }}>It may have been removed or renamed.</p>
        <Link to="/shop" className="btn btn-primary"><FiArrowLeft /> Back to shop</Link>
      </div>
    );
  }

  const sizes = product.bottleSizes?.length ? product.bottleSizes : ['3ml', '6ml', '12ml'];
  const activeSize = size || sizes[0];
  const price = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;
  const out = product.stock <= 0;
  const maxQty = Math.max(1, Math.min(product.stock || 1, 10));
  const wished = isInWishlist(product.id);

  return (
    <div className={styles.page}>
      <div className="container">
        <nav aria-label="Breadcrumb" className={styles.crumb}>
          <Link to="/">Home</Link> <span aria-hidden="true">/</span> <Link to="/shop">Shop</Link> <span aria-hidden="true">/</span> <span aria-current="page">{product.title}</span>
        </nav>

        <div className={styles.layout}>
          <div className={styles.gallery}>
            <div className={styles.main}>
              <img
                src={product.images?.[imgIdx] || product.images?.[0] || ''}
                alt={`${product.title} — product photo`}
                loading="eager"
                referrerPolicy="no-referrer"
              />
              {out && <span className={styles.soldout}>Out of stock</span>}
            </div>
            {product.images?.length > 1 && (
              <div className={styles.thumbs} role="group" aria-label="Product images">
                {product.images.map((src, i) => (
                  <button
                    key={i} type="button"
                    className={`${styles.thumb} ${i === imgIdx ? styles.active : ''}`}
                    onClick={() => setImgIdx(i)}
                    aria-pressed={i === imgIdx}
                    aria-label={`View image ${i + 1}`}
                  >
                    <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.info}>
            <p className={styles.meta}>{product.category} · {product.fragranceFamily}</p>
            <h1 className={styles.title}>{product.title}</h1>
            <p className={styles.subtitle}>{product.subtitle}</p>
            <p className={styles.rating} aria-label={`Rated ${product.rating.toFixed(1)} from ${product.reviewCount} reviews`}>
              ★ {product.rating.toFixed(1)} · {product.reviewCount} review{product.reviewCount === 1 ? '' : 's'}
            </p>

            <p className={styles.price}>
              <strong>₹{price.toLocaleString('en-IN')}</strong>
              {product.salePrice ? <s>₹{product.price.toLocaleString('en-IN')}</s> : null}
              <span className={styles.perUnit}>Inclusive of taxes</span>
            </p>

            <p className={styles.desc}>{product.description}</p>

            <div className={styles.specs}>
              <div><span>Longevity</span><strong>{product.longevity || '8–12 hours'}</strong></div>
              <div><span>Projection</span><strong>{product.projection || 'Moderate'}</strong></div>
            </div>

            <fieldset className={styles.field}>
              <legend>Size — <strong>{activeSize}</strong></legend>
              <div className={styles.sizes}>
                {sizes.map((s) => (
                  <button
                    key={s} type="button"
                    className={`${styles.size} ${s === activeSize ? styles.sizeActive : ''}`}
                    onClick={() => setSize(s)}
                    aria-pressed={s === activeSize}
                  >{s}</button>
                ))}
              </div>
            </fieldset>

            <div className={styles.buyRow}>
              <div className={styles.qty} role="group" aria-label="Quantity">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity"><FiMinus /></button>
                <span aria-live="polite" aria-label={`Quantity ${qty}`}>{qty}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty || out} aria-label="Increase quantity"><FiPlus /></button>
              </div>
              <button type="button" className="btn btn-primary" disabled={out} onClick={() => addToCart(product, activeSize, qty)} style={{ flex: 1 }}>
                <FiShoppingBag /> {out ? 'Out of stock' : `Add to cart · ₹${(price * qty).toLocaleString('en-IN')}`}
              </button>
              <button
                type="button" className={`${styles.wish} ${wished ? styles.wished : ''}`}
                onClick={() => toggleWishlist(product.id)} aria-pressed={wished}
                aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
              ><FiHeart /></button>
            </div>

            {out
              ? <p className={styles.stockOut} role="status">Currently out of stock. Check back soon or explore similar attars.</p>
              : product.stock <= 10
                ? <p className={styles.stockLow} role="status">Only {product.stock} left in stock</p>
                : <p className={styles.stockOk} role="status">In stock, ready to ship</p>}

            <FragranceNotes topNotes={product.topNotes} middleNotes={product.middleNotes} baseNotes={product.baseNotes} />

            <div className={styles.tip}>
              <strong>How to wear</strong>
              <p>Apply a small amount to pulse points. Attars are concentrated — one swipe is enough for several hours.</p>
            </div>
          </div>
        </div>

        <ReviewSection productId={product.id} />
      </div>
    </div>
  );
};
