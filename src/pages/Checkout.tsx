import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiLock, FiCreditCard, FiArrowLeft } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import styles from './Checkout.module.css';

export const Checkout: React.FC = () => {
  const { cart, subtotal, discountAmount, tax, shippingFee, total, couponCode, clearCart } = useCart();
  const { createOrder } = useStore();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
  });

  const [isProcessing, setIsProcessing] = useState(false);

  if (cart.length === 0) {
    return (
      <div className={styles.page} style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-light)' }}>Your Shopping Cart is Empty</h2>
        <p style={{ color: 'var(--text-muted)', margin: '1rem 0' }}>Please select a fragrance before proceeding to checkout.</p>
        <Link to="/shop" style={{ color: 'var(--gold-primary)', textDecoration: 'underline' }}>
          Explore Collection
        </Link>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const orderNumber = 'ASP-' + Math.floor(100000 + Math.random() * 900000);

    const newOrder = await createOrder({
      orderNumber,
      customerName: formData.fullName,
      customerEmail: formData.email,
      shippingAddress: formData,
      items: cart,
      subtotal,
      discount: discountAmount,
      tax,
      shippingFee,
      total,
      status: 'Processing',
      paymentStatus: 'Paid',
      paymentMethod: 'Razorpay Checkout (INR ₹)',
    });

    clearCart();
    navigate(`/success?orderId=${newOrder.id}`);
  };

  return (
    <div className={styles.page}>
      <Link to="/shop" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem' }}>
        <FiArrowLeft /> Return to Cart / Collection
      </Link>

      <h1 className={styles.title}>Guest Acquisition Checkout</h1>
      <p className={styles.subtitle}>No account creation required • 256-Bit Encrypted TLS Checkout</p>

      <form onSubmit={handleSubmit} className={styles.layout}>
        <div className={styles.formSection}>
          <div className={styles.formBlockTitle}>1. Contact Details</div>
          <div className={styles.grid2}>
            <input
              type="text"
              name="fullName"
              placeholder="Full Name *"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email Address (for Invoice & Tracking) *"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <input
            type="tel"
            name="phone"
            placeholder="Phone Number (for Courier Updates) *"
            value={formData.phone}
            onChange={handleChange}
            required
          />

          <div className={styles.formBlockTitle} style={{ marginTop: '1rem' }}>2. Shipping Address</div>
          <input
            type="text"
            name="addressLine1"
            placeholder="Street Address *"
            value={formData.addressLine1}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="addressLine2"
            placeholder="Apartment, suite, unit (optional)"
            value={formData.addressLine2}
            onChange={handleChange}
          />

          <div className={styles.grid2}>
            <input
              type="text"
              name="city"
              placeholder="City *"
              value={formData.city}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="state"
              placeholder="State / Region *"
              value={formData.state}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.grid2}>
            <input
              type="text"
              name="postalCode"
              placeholder="Postal / Zip Code *"
              value={formData.postalCode}
              onChange={handleChange}
              required
            />
            <select name="country" value={formData.country} onChange={handleChange}>
              <option value="India">India</option>
              <option value="United Arab Emirates">United Arab Emirates</option>
              <option value="Saudi Arabia">Saudi Arabia</option>
              <option value="Kuwait">Kuwait</option>
              <option value="Qatar">Qatar</option>
              <option value="Oman">Oman</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="United States">United States</option>
            </select>
          </div>
        </div>

        {/* Order Summary Column */}
        <div className={styles.summarySection}>
          <h3 className={styles.summaryTitle}>Order Summary ({cart.length} Items)</h3>

          <div className={styles.itemList}>
            {cart.map((item, idx) => (
              <div key={idx} className={styles.itemRow}>
                <div>
                  <strong>{item.product.title}</strong> x {item.quantity}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.selectedSize}</div>
                </div>
                <span>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>

          <div className={styles.row}>
            <span>Subtotal</span>
            <span>₹{subtotal.toLocaleString('en-IN')}</span>
          </div>

          {discountAmount > 0 && (
            <div className={styles.row} style={{ color: 'var(--gold-primary)' }}>
              <span>Coupon Discount ({couponCode})</span>
              <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className={styles.row}>
            <span>Estimated Tax (10%)</span>
            <span>₹{tax.toLocaleString('en-IN')}</span>
          </div>

          <div className={styles.row}>
            <span>Express Courier Shipping</span>
            <span>{shippingFee === 0 ? 'FREE' : `₹${shippingFee.toLocaleString('en-IN')}`}</span>
          </div>

          <div className={`${styles.row} ${styles.totalRow}`}>
            <span>Grand Total</span>
            <span>₹{total.toLocaleString('en-IN')}</span>
          </div>

          <button type="submit" className={styles.payBtn} disabled={isProcessing}>
            <FiLock /> {isProcessing ? 'Authorizing Razorpay Order...' : `Pay via Razorpay — ₹${total.toLocaleString('en-IN')}`}
          </button>
        </div>
      </form>
    </div>
  );
};
