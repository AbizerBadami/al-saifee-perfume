import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiLock, FiArrowLeft } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { checkoutAPI } from '../lib/api';
import styles from './Checkout.module.css';

export const Checkout: React.FC = () => {
  const { cart, subtotal, tax, shippingFee, total, clearCart } = useCart();
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
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [error, setError] = useState('');

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

  const handleRazorpayPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);

    try {
      // Step 1: Create Razorpay order — sends cart items, NOT amount
      const razorpayData = await checkoutAPI.createOrder(
        cart,
        'INR',
        formData.fullName,
        formData.email
      );

      // Step 2: Open Razorpay Checkout popup
      const options = {
        key: razorpayData.keyId,
        amount: razorpayData.amount,
        currency: razorpayData.currency,
        name: 'Al-Saifee Perfumes',
        description: 'Payment for your fragrance order',
        order_id: razorpayData.orderId,
        image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=200',
        handler: async function (response: any) {
          try {
            // Step 3: Verify payment AND create order server-side
            const result = await checkoutAPI.verify(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
              cart,
              formData,
              formData.fullName,
              formData.email
            );

            if (result.verified && result.orderId) {
              clearCart();
              setIsProcessing(false);
              navigate(`/success?orderId=${result.orderId}&orderNumber=${result.orderNumber}`);
            } else {
              setError(result.error || 'Payment verification failed. Please contact support.');
              setIsProcessing(false);
            }
          } catch (err: any) {
            console.error('Verification error:', err);
            setError('Payment verification error. If money was deducted, please contact support — your order will be fulfilled.');
            setIsProcessing(false);
          }
        },
        prefill: {
          name: formData.fullName,
          email: formData.email,
          contact: formData.phone,
        },
        notes: {
          address: `${formData.addressLine1}, ${formData.city}`,
        },
        theme: { color: '#d4af37' },
        modal: {
          ondismiss: function () { setIsProcessing(false); },
        },
      };

      if (typeof (window as any).Razorpay !== 'undefined') {
        const rzpInstance = new (window as any).Razorpay(options);
        rzpInstance.open();
      } else {
        setError('Payment gateway is still loading. Please refresh the page and try again.');
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Could not connect to payment gateway. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.page}>
      <Link to="/shop" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem' }}>
        <FiArrowLeft /> Return to Cart / Collection
      </Link>

      <h1 className={styles.title}>Guest Acquisition Checkout</h1>
      <p className={styles.subtitle}>No account creation required • 256-Bit Encrypted TLS Checkout</p>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem',
          color: '#ef4444', fontSize: '0.85rem'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleRazorpayPayment} className={styles.layout}>
        <div className={styles.formSection}>
          <div className={styles.formBlockTitle}>1. Contact Details</div>
          <div className={styles.grid2}>
            <input
              type="text" name="fullName" placeholder="Full Name *"
              value={formData.fullName} onChange={handleChange}
              required minLength={2}
            />
            <input
              type="email" name="email" placeholder="Email Address (for Tracking) *"
              value={formData.email} onChange={handleChange}
              required
            />
          </div>

          <input
            type="tel" name="phone" placeholder="Phone Number (for Courier Updates) *"
            value={formData.phone} onChange={handleChange}
            required pattern="[0-9]{10,15}" title="Enter a valid 10-15 digit phone number"
          />

          <div className={styles.formBlockTitle} style={{ marginTop: '1rem' }}>2. Shipping Address</div>
          <input
            type="text" name="addressLine1" placeholder="Street Address *"
            value={formData.addressLine1} onChange={handleChange}
            required minLength={5}
          />

          <input
            type="text" name="addressLine2" placeholder="Apartment, suite, unit (optional)"
            value={formData.addressLine2} onChange={handleChange}
          />

          <div className={styles.grid2}>
            <input
              type="text" name="city" placeholder="City *"
              value={formData.city} onChange={handleChange}
              required minLength={2}
            />
            <input
              type="text" name="state" placeholder="State / Region *"
              value={formData.state} onChange={handleChange}
              required minLength={2}
            />
          </div>

          <div className={styles.grid2}>
            <input
              type="text" name="postalCode" placeholder="PIN / Postal Code *"
              value={formData.postalCode} onChange={handleChange}
              required pattern="[0-9]{5,6}" title="Enter a valid 5-6 digit postal code"
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

          <div className={styles.formBlockTitle} style={{ marginTop: '1rem' }}>3. Payment Gateway</div>
          <div
            style={{
              background: 'rgba(255, 215, 0, 0.05)', border: '1px solid var(--gold-border)',
              borderRadius: '8px', padding: '1.25rem', display: 'flex',
              flexDirection: 'column', gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700, color: 'var(--gold-light)' }}>
                <input type="radio" name="paymentOption" checked readOnly style={{ accentColor: 'var(--gold-primary)' }} />
                Razorpay Online Payment Gateway (UPI / Cards / NetBanking)
              </div>
              <FiLock style={{ color: 'var(--gold-primary)' }} />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, paddingLeft: '1.6rem' }}>
              Secure checkout via official Razorpay Gateway API. Supports UPI (Google Pay, PhonePe, Paytm), Cards (Visa, Mastercard, RuPay), and NetBanking.
            </p>
          </div>

          {/* Return Policy Acknowledgement */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
            fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox" checked={policyAccepted}
              onChange={(e) => setPolicyAccepted(e.target.checked)}
              required
              style={{ accentColor: 'var(--gold-primary)', marginTop: '3px', flexShrink: 0 }}
            />
            I acknowledge that opened or unsealed perfume oils and attars cannot be returned due to contamination and sanitary regulations. All sales of unsealed fragrance products are final.
          </label>
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

          <div className={styles.row}>
            <span>Estimated Tax</span>
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

          <button type="submit" className={styles.payBtn} disabled={isProcessing || !policyAccepted}>
            <FiLock /> {isProcessing ? 'Opening Razorpay Gateway...' : `Pay via Razorpay — ₹${total.toLocaleString('en-IN')}`}
          </button>
        </div>
      </form>
    </div>
  );
};
