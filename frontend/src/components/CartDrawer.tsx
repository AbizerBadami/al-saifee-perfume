import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiTrash2, FiShoppingBag, FiMinus, FiPlus } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import styles from './CartDrawer.module.css';

export const CartDrawer: React.FC = () => {
  const {
    cart, isCartOpen, closeCart, removeFromCart, updateQuantity,
    subtotal, tax, taxRate, shippingFee, total, freeShippingThreshold, freeShippingProgress, itemCount,
  } = useCart();
  const navigate = useNavigate();
  const drawerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isCartOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart(); };
    window.addEventListener('keydown', onKey);
    drawerRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [isCartOpen, closeCart]);

  if (!isCartOpen) return null;

  const remaining = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <div className={styles.root}>
      <div className={styles.scrim} onClick={closeCart} aria-hidden="true" />
      <div
        ref={drawerRef}
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={`Shopping cart, ${itemCount} items`}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Cart ({itemCount})</h2>
          <button type="button" className={styles.close} onClick={closeCart} aria-label="Close cart"><FiX /></button>
        </div>

        <div className={styles.ship}>
          {subtotal >= freeShippingThreshold ? (
            <p className={styles.shipOk} role="status">You&apos;ve unlocked free shipping</p>
          ) : (
            <p className={styles.shipText} role="status">Add ₹{remaining.toLocaleString('en-IN')} more for free shipping</p>
          )}
          <div className={styles.bar} role="progressbar" aria-valuenow={freeShippingProgress} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free shipping">
            <div className={styles.fill} style={{ width: `${freeShippingProgress}%` }} />
          </div>
        </div>

        <div className={styles.items}>
          {cart.length === 0 ? (
            <div className={styles.empty}>
              <FiShoppingBag aria-hidden="true" />
              <p><strong>Your cart is empty</strong></p>
              <p className="muted">Browse bestsellers or search by note.</p>
              <button type="button" className="btn btn-primary" onClick={() => { closeCart(); navigate('/shop'); }}>Browse fragrances</button>
            </div>
          ) : (
            <ul className={styles.list}>
              {cart.map((item) => (
                <li key={`${item.product.id}-${item.selectedSize}`} className={styles.item}>
                  <img src={item.product.images?.[0] || ''} alt="" loading="lazy" referrerPolicy="no-referrer" />
                  <div className={styles.detail}>
                    <p className={styles.name}>{item.product.title}</p>
                    <p className={styles.meta}>{item.selectedSize} · ₹{item.price.toLocaleString('en-IN')} each</p>
                    <div className={styles.row}>
                      <div className={styles.qty} role="group" aria-label={`Quantity for ${item.product.title}`}>
                        <button type="button" onClick={() => updateQuantity(item.product.id, item.selectedSize, -1)} aria-label="Decrease quantity"><FiMinus /></button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.product.id, item.selectedSize, 1)} aria-label="Increase quantity"><FiPlus /></button>
                      </div>
                      <strong>₹{(item.price * item.quantity).toLocaleString('en-IN')}</strong>
                      <button type="button" className={styles.remove} onClick={() => removeFromCart(item.product.id, item.selectedSize)} aria-label={`Remove ${item.product.title} from cart`}>
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <div className={styles.footer}>
            <dl className={styles.totals}>
              <div><dt>Subtotal</dt><dd>₹{subtotal.toLocaleString('en-IN')}</dd></div>
              <div><dt>Tax ({Math.round(taxRate * 100)}%)</dt><dd>₹{tax.toLocaleString('en-IN')}</dd></div>
              <div><dt>Shipping</dt><dd>{shippingFee === 0 ? 'Free' : `₹${shippingFee}`}</dd></div>
              <div className={styles.grand}><dt>Total</dt><dd>₹{total.toLocaleString('en-IN')}</dd></div>
            </dl>
            <button
              type="button" className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => { closeCart(); navigate('/checkout'); }}
            >
              Continue to checkout · ₹{total.toLocaleString('en-IN')}
            </button>
            <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={closeCart}>Continue shopping</button>
          </div>
        )}
      </div>
    </div>
  );
};
