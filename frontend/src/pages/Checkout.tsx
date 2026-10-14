import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiLock, FiArrowLeft } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { checkoutAPI } from '../lib/api';
import styles from './Checkout.module.css';

const COUNTRIES = ['India', 'United Arab Emirates', 'Saudi Arabia', 'Kuwait', 'Qatar', 'Oman', 'United Kingdom', 'United States'];

export const Checkout: React.FC = () => {
  const { cart, subtotal, tax, taxRate, shippingFee, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '',
    addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'India',
  });
  const [policy, setPolicy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (cart.length === 0) {
    return (
      <div className="container" style={{ padding: '4rem 1.25rem', textAlign: 'center' }}>
        <p className="eyebrow">Checkout</p>
        <h1>Your cart is empty</h1>
        <p className="muted" style={{ margin: '0.75rem 0 1.5rem' }}>Add a fragrance before checking out.</p>
        <Link to="/shop" className="btn btn-primary">Browse the collection</Link>
      </div>
    );
  }

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!policy) { setError('Please accept the returns policy to continue.'); return; }
    if (cart.some((i) => i.product.stock <= 0)) { setError('One or more items in your cart is out of stock. Please remove it and try again.'); return; }
    setBusy(true);
    try {
      const created = await checkoutAPI.createOrder(cart, 'INR', form.fullName.trim(), form.email.trim());
      const options = {
        key: created.keyId,
        amount: created.amount,
        currency: created.currency,
        name: 'Al-Saifee Perfumes',
        description: 'Fragrance order',
        order_id: created.orderId,
        prefill: { name: form.fullName, email: form.email, contact: form.phone },
        notes: { address: `${form.addressLine1}, ${form.city} ${form.postalCode}` },
        theme: { color: '#1c1b1a' },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const result = await checkoutAPI.verify({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              items: cart,
              shippingAddress: form,
              customerName: form.fullName.trim(),
              customerEmail: form.email.trim(),
            });
            if (result.verified && result.orderId) {
              try {
                sessionStorage.setItem('alsaifee_last_order', JSON.stringify({
                  orderId: result.orderId,
                  orderNumber: result.orderNumber || '',
                  total: result.total ?? 0,
                }));
              } catch {}
              clearCart();
              const qs = new URLSearchParams({
                orderId: result.orderId,
                orderNumber: result.orderNumber || '',
                total: String(result.total ?? 0),
              });
              navigate(`/success?${qs.toString()}`);
            } else {
              setError(result.error || 'Payment verification failed. If money was deducted, contact support with your payment ID.');
              setBusy(false);
            }
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Verification failed. If money was deducted, contact support — your payment is recorded by Razorpay.');
            setBusy(false);
          }
        },
      };
      const Razorpay = (window as unknown as { Razorpay?: new (o: unknown) => { open: () => void } }).Razorpay;
      if (Razorpay) {
        new Razorpay(options).open();
      } else {
        setError('Payment window failed to load. Please refresh and try again.');
        setBusy(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not start payment. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className="container">
        <Link to="/shop" className={styles.back}><FiArrowLeft /> Continue shopping</Link>
        <p className="eyebrow">Checkout</p>
        <h1 className={styles.h1}>Shipping & payment</h1>
        <p className={styles.sub}>No account needed · Secure Razorpay checkout (UPI, cards, netbanking)</p>
        {error && <p className="alert alert-error" role="alert" style={{ marginBottom: '1.25rem' }}>{error}</p>}

        <form onSubmit={pay} className={styles.layout}>
          <div className={styles.form}>
            <fieldset>
              <legend>Contact</legend>
              <div className={styles.grid2}>
                <div>
                  <label htmlFor="co-name">Full name *</label>
                  <input id="co-name" name="fullName" value={form.fullName} onChange={set} required minLength={2} maxLength={120} autoComplete="name" />
                </div>
                <div>
                  <label htmlFor="co-email">Email *</label>
                  <input id="co-email" type="email" name="email" value={form.email} onChange={set} required maxLength={160} autoComplete="email" />
                </div>
              </div>
              <div>
                <label htmlFor="co-phone">Phone *</label>
                <input id="co-phone" type="tel" name="phone" value={form.phone} onChange={set} required pattern="[0-9+ -]{10,16}" title="10–16 digits" autoComplete="tel" inputMode="tel" />
              </div>
            </fieldset>

            <fieldset>
              <legend>Shipping address</legend>
              <div>
                <label htmlFor="co-a1">Street address *</label>
                <input id="co-a1" name="addressLine1" value={form.addressLine1} onChange={set} required minLength={5} maxLength={200} autoComplete="street-address" />
              </div>
              <div>
                <label htmlFor="co-a2">Apartment / landmark (optional)</label>
                <input id="co-a2" name="addressLine2" value={form.addressLine2} onChange={set} maxLength={200} />
              </div>
              <div className={styles.grid2}>
                <div>
                  <label htmlFor="co-city">City *</label>
                  <input id="co-city" name="city" value={form.city} onChange={set} required minLength={2} maxLength={80} autoComplete="address-level2" />
                </div>
                <div>
                  <label htmlFor="co-state">State *</label>
                  <input id="co-state" name="state" value={form.state} onChange={set} required minLength={2} maxLength={80} autoComplete="address-level1" />
                </div>
              </div>
              <div className={styles.grid2}>
                <div>
                  <label htmlFor="co-pin">PIN / Postal code *</label>
                  <input id="co-pin" name="postalCode" value={form.postalCode} onChange={set} required pattern="[0-9]{5,6}" title="5–6 digit PIN" inputMode="numeric" autoComplete="postal-code" />
                </div>
                <div>
                  <label htmlFor="co-country">Country *</label>
                  <select id="co-country" name="country" value={form.country} onChange={set}>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend>Payment</legend>
              <p className={styles.payBox}><FiLock aria-hidden="true" /> Razorpay — UPI, cards & netbanking. You&apos;ll confirm in a secure popup.</p>
              <label className={styles.policy}>
                <input type="checkbox" checked={policy} onChange={(e) => setPolicy(e.target.checked)} required />
                I understand that opened or unsealed attars can&apos;t be returned for hygiene reasons.
              </label>
            </fieldset>
          </div>

          <aside className={styles.summary} aria-label="Order summary">
            <h2>Order summary ({cart.reduce((n, i) => n + i.quantity, 0)} items)</h2>
            <ul>
              {cart.map((i) => (
                <li key={`${i.product.id}-${i.selectedSize}`}>
                  <span>{i.product.title} · {i.selectedSize} × {i.quantity}</span>
                  <strong>₹{(i.price * i.quantity).toLocaleString('en-IN')}</strong>
                </li>
              ))}
            </ul>
            <dl>
              <div><dt>Subtotal</dt><dd>₹{subtotal.toLocaleString('en-IN')}</dd></div>
              <div><dt>Tax ({Math.round(taxRate * 100)}%)</dt><dd>₹{tax.toLocaleString('en-IN')}</dd></div>
              <div><dt>Shipping</dt><dd>{shippingFee === 0 ? 'Free' : `₹${shippingFee}`}</dd></div>
              <div className={styles.grand}><dt>Total</dt><dd>₹{total.toLocaleString('en-IN')}</dd></div>
            </dl>
            <button type="submit" className="btn btn-primary" disabled={busy || !policy} style={{ width: '100%' }}>
              {busy ? 'Opening secure payment…' : `Pay ₹${total.toLocaleString('en-IN')}`}
            </button>
            {!policy && <p className={styles.hint}>Accept the returns note above to enable payment.</p>}
          </aside>
        </form>
      </div>
    </div>
  );
};
