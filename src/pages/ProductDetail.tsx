import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiHeart, FiShoppingBag, FiStar, FiArrowLeft, FiClock, FiActivity, FiAward } from 'react-icons/fi';
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

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  if (!product) {
    return (
      <div className={styles.page} style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-light)' }}>Fragrance Creation Not Found</h2>
        <Link to="/shop" style={{ color: 'var(--gold-primary)', marginTop: '1rem', display: 'inline-block' }}>
          <span style={{ verticalAlign: 'middle', display: 'inline-block' }}><FiArrowLeft /></span> Return to Collection
        </Link>
      </div>
    );
  }

  const sizes = product.bottleSizes && product.bottleSizes.length ? product.bottleSizes : ['50ml Spray', '100ml Spray'];
  const activeSize = selectedSize || sizes[0];
  const isWished = isInWishlist(product.id);
  const displayPrice = product.salePrice || product.price;

  const handleAddToCart = () => {
    addToCart(product, activeSize, quantity);
  };

  return (
    <div className={styles.page}>
      <Link to="/shop" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem' }}>
        <FiArrowLeft /> Back to Collection
      </Link>

      <div className={styles.topLayout}>
        {/* Gallery Column */}
        <div className={styles.gallery}>
          <div className={styles.mainImageWrapper}>
            <img
              src={product.images[selectedImageIdx] || product.images[0]}
              alt={product.title}
              className={styles.mainImage}
              referrerPolicy="no-referrer"
            />
          </div>

          {product.images.length > 1 && (
            <div className={styles.thumbRow}>
              {product.images.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className={`${styles.thumb} ${idx === selectedImageIdx ? styles.activeThumb : ''}`}
                  onClick={() => setSelectedImageIdx(idx)}
                >
                  <img src={imgUrl} alt="Thumbnail" className={styles.thumbImg} referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Information Column */}
        <div className={styles.infoCol}>
          <div>
            <div className={styles.categoryTag}>{product.category} • {product.fragranceFamily} Family</div>
            <h1 className={styles.title}>{product.title}</h1>
            <div className={styles.subtitle}>{product.subtitle}</div>
          </div>

          <div className={styles.priceRow}>
            <span className={styles.price}>₹{displayPrice.toLocaleString('en-IN')}</span>
            {product.salePrice && <span className={styles.oldPrice}>₹{product.price.toLocaleString('en-IN')}</span>}
          </div>

          <p className={styles.description}>{product.description}</p>

          <div className={styles.specGrid}>
            <div>
              <div className={styles.specLabel}><span style={{ verticalAlign: 'middle', marginRight: '4px', display: 'inline-block' }}><FiClock /></span> Longevity</div>
              <div className={styles.specVal}>{product.longevity || '12-14 Hours'}</div>
            </div>
            <div>
              <div className={styles.specLabel}><span style={{ verticalAlign: 'middle', marginRight: '4px', display: 'inline-block' }}><FiActivity /></span> Projection</div>
              <div className={styles.specVal}>{product.projection || 'Enveloping Sillage'}</div>
            </div>
          </div>

          {/* Bottle Size Selector */}
          <div>
            <div className={styles.optionTitle}>Select Bottle Concentration / Size</div>
            <div className={styles.sizesRow}>
              {sizes.map((size) => (
                <button
                  key={size}
                  className={`${styles.sizeBtn} ${size === activeSize ? styles.activeSize : ''}`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Add to Cart Controls */}
          <div className={styles.actionRow}>
            <div className={styles.qtyBox}>
              <button className={styles.qtyBtn} onClick={() => setQuantity((q) => Math.max(1, q - 1))}>-</button>
              <span className={styles.qtyVal}>{quantity}</span>
              <button className={styles.qtyBtn} onClick={() => setQuantity((q) => q + 1)}>+</button>
            </div>

            <button className={styles.addBtn} onClick={handleAddToCart}>
              <FiShoppingBag /> Add to Cart — ₹{(displayPrice * quantity).toLocaleString('en-IN')}
            </button>

            <button
              className={`${styles.wishBtn} ${isWished ? styles.activeWish : ''}`}
              onClick={() => toggleWishlist(product.id)}
              title="Toggle Wishlist"
            >
              <span style={{ color: isWished ? '#ef4444' : 'inherit', display: 'inline-block' }}><FiHeart /></span>
            </button>
          </div>

          {/* Notes Pyramid */}
          <FragranceNotes
            topNotes={product.topNotes}
            middleNotes={product.middleNotes}
            baseNotes={product.baseNotes}
          />

          {/* AI Scent Layering Recommendation */}
          <div style={{
            marginTop: '2rem',
            padding: '1.25rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--gold-border)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gold-primary)', fontWeight: '600', marginBottom: '0.5rem' }}>
              <FiAward /> AI Olfactory Layering Guide
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <strong>Master Perfumer's Tip:</strong> Pair <em>{product.title}</em> with our 100% alcohol-free <em>Royal Amber Attar</em> or <em>Tuscan Leather Extract</em> to create a deeper, multi-dimensional signature aura with over 16+ hours of projection.
            </p>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <ReviewSection productId={product.id} />
    </div>
  );
};
