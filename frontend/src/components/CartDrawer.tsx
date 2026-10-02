import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiX, FiTrash2, FiShoppingBag, FiCheckCircle } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import styles from './CartDrawer.module.css';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    closeCart,
    removeFromCart,
    updateQuantity,
    subtotal,
    discountAmount,
    tax,
    shippingFee,
    total,
    freeShippingThreshold,
    freeShippingProgress,
    couponCode,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const { coupons } = useStore();
  const navigate = useNavigate();
  const [inputCode, setInputCode] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ success: boolean; text: string } | null>(null);

  if (!isCartOpen) return null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const res = applyCoupon(inputCode, coupons);
    setCouponMsg({ success: res.success, text: res.message });
    if (res.success) setInputCode('');
  };

  const handleCheckoutClick = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <div className={styles.overlay} onClick={closeCart}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Your Luxury Cart ({cart.length})</h3>
          <button className={styles.closeBtn} onClick={closeCart}>
            <FiX />
          </button>
        </div>

        <div className={styles.shippingBarContainer}>
          <div className={styles.shippingText}>
            {subtotal >= freeShippingThreshold ? (
              <span style={{ color: 'var(--gold-primary)' }}>
                <span style={{ verticalAlign: 'middle', marginRight: '4px', display: 'inline-block' }}><FiCheckCircle /></span>
                You unlocked Complimentary Express Shipping!
              </span>
            ) : (
              `Add ₹${Math.max(0, freeShippingThreshold - subtotal).toLocaleString('en-IN')} more for Complimentary Express Shipping`
            )}
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${freeShippingProgress}%` }} />
          </div>
        </div>

        <div className={styles.itemsContainer}>
          {cart.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--text-muted)' }}><FiShoppingBag /></div>
              <p>Your acquisition bag is currently empty.</p>
              <button
                onClick={() => { closeCart(); navigate('/shop'); }}
                style={{
                  marginTop: '1rem',
                  color: 'var(--gold-primary)',
                  borderBottom: '1px solid var(--gold-primary)',
                  paddingBottom: '2px',
                  fontSize: '0.85rem'
                }}
              >
                Discover Rare Fragrances
              </button>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={`${item.product.id}-${item.selectedSize}-${idx}`} className={styles.cartItem}>
                <img
                  src={item.product.images[0]}
                  alt={item.product.title}
                  className={styles.itemImage}
                  referrerPolicy="no-referrer"
                />
                <div className={styles.itemDetails}>
                  <div>
                    <div className={styles.itemTitle}>{item.product.title}</div>
                    <div className={styles.itemMeta}>Size: {item.selectedSize}</div>
                    <div className={styles.itemMeta}>₹{item.price.toLocaleString('en-IN')} each</div>
                  </div>

                  <div className={styles.controlsRow}>
                    <div className={styles.qtyControls}>
                      <button className={styles.qtyBtn} onClick={() => updateQuantity(item.product.id, item.selectedSize, -1)}>-</button>
                      <span className={styles.qtyValue}>{item.quantity}</span>
                      <button className={styles.qtyBtn} onClick={() => updateQuantity(item.product.id, item.selectedSize, 1)}>+</button>
                    </div>

                    <button
                      className={styles.removeBtn}
                      onClick={() => removeFromCart(item.product.id, item.selectedSize)}
                      title="Remove item"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className={styles.footer}>
            <form className={styles.couponArea} onSubmit={handleApplyCoupon}>
              <input
                type="text"
                placeholder="Promo code (e.g. WELCOME10)"
                className={styles.couponInput}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
              />
              <button type="submit" className={styles.applyBtn}>Apply</button>
            </form>

            {couponCode && (
              <div className={styles.summaryRow} style={{ color: 'var(--gold-primary)' }}>
                <span>Coupon Applied ({couponCode})</span>
                <button onClick={removeCoupon} style={{ color: '#ef4444', fontSize: '0.75rem', textDecoration: 'underline' }}>Remove</button>
              </div>
            )}

            {couponMsg && (
              <div style={{ fontSize: '0.75rem', color: couponMsg.success ? 'var(--gold-primary)' : '#ef4444' }}>
                {couponMsg.text}
              </div>
            )}

            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>

            {discountAmount > 0 && (
              <div className={styles.summaryRow} style={{ color: 'var(--gold-primary)' }}>
                <span>Discount</span>
                <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className={styles.summaryRow}>
              <span>Estimated Tax (10%)</span>
              <span>₹{tax.toLocaleString('en-IN')}</span>
            </div>

            <div className={styles.summaryRow}>
              <span>Express Shipping</span>
              <span>{shippingFee === 0 ? 'FREE' : `₹${shippingFee.toLocaleString('en-IN')}`}</span>
            </div>

            <div className={`${styles.summaryRow} ${styles.totalRow}`}>
              <span>Total</span>
              <span>₹{total.toLocaleString('en-IN')}</span>
            </div>

            <button className={styles.checkoutBtn} onClick={handleCheckoutClick}>
              Proceed to Guest Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
