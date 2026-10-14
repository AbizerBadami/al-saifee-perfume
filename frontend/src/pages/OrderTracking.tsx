import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import { useStore } from '../context/StoreContext';
import { ordersAPI } from '../lib/api';
import type { Order } from '../types';
import styles from './OrderTracking.module.css';

function normalizeOrder(raw: unknown): Order | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const inner = (o.order as unknown) ?? raw;
  if (!inner || typeof inner !== 'object') return null;
  return inner as Order;
}

export const OrderTracking: React.FC = () => {
  const [params] = useSearchParams();
  const { getOrderById } = useStore();
  const [ref, setRef] = useState(params.get('orderId') || '');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setOrder(null);
    const r = ref.trim();
    if (!r) { setError('Enter your order number (e.g. ASP-123456).'); return; }
    const local = getOrderById(r);
    if (local) {
      if (email && local.customerEmail.toLowerCase() !== email.trim().toLowerCase()) {
        setError('That email doesn’t match this order. Check both fields and try again.');
        return;
      }
      setOrder(local);
      return;
    }
    if (!email.trim()) { setError('Enter the email used at checkout so we can look up your order securely.'); return; }
    setBusy(true);
    try {
      const res = await ordersAPI.lookup(r, email.trim());
      const found = normalizeOrder(res);
      if (found) setOrder(found);
      else setError(`No order found for “${r}”. Verify the number and email.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const step = (s: Order['status']) => (s === 'Processing' ? 1 : s === 'Shipped' ? 2 : s === 'Delivered' ? 3 : 0);

  return (
    <div className={styles.page}>
      <div className="container">
        <p className="eyebrow">Orders</p>
        <h1 className={styles.h1}>Track your order</h1>
        <p className={styles.sub}>Use your order number and checkout email for live status.</p>

        <form className={styles.card} onSubmit={search}>
          <div className={styles.grid}>
            <div>
              <label htmlFor="tr-ref">Order number *</label>
              <input id="tr-ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="ASP-123456" required autoComplete="off" />
            </div>
            <div>
              <label htmlFor="tr-email">Email *</label>
              <input id="tr-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}><FiSearch /> {busy ? 'Looking up…' : 'Track order'}</button>
          {error && <p className="alert alert-error" role="alert" style={{ marginTop: '1rem' }}>{error}</p>}
        </form>

        {order && (
          <section className={styles.result} aria-live="polite" aria-label={`Order ${order.orderNumber} status`}>
            <div className={styles.resultHead}>
              <div>
                <h2>Order {order.orderNumber}</h2>
                <p className="muted">Placed {new Date(order.createdAt).toLocaleDateString('en-IN')} · {order.items.length} item(s) · ₹{order.total.toLocaleString('en-IN')}</p>
              </div>
              <span className={`${styles.badge} ${order.status === 'Cancelled' ? styles.cancelled : ''}`}>{order.status}</span>
            </div>
            {order.status === 'Cancelled' ? (
              <p className="alert alert-info">This order was cancelled. Contact support if you need help.</p>
            ) : (
              <ol className={styles.steps}>
                {['Processing', 'Shipped', 'Delivered'].map((s, i) => (
                  <li key={s} className={i < step(order.status) ? styles.done : ''} aria-current={order.status === s ? 'step' : undefined}>
                    <span className={styles.dot}>{i + 1}</span> {s === 'Shipped' ? 'Shipped' : s}
                  </li>
                ))}
              </ol>
            )}
            <dl className={styles.meta}>
              <div><dt>Name</dt><dd>{order.customerName}</dd></div>
              <div><dt>Email</dt><dd>{order.customerEmail}</dd></div>
              <div><dt>Tracking</dt><dd>{order.trackingNumber || 'Assigned after dispatch'}</dd></div>
              <div><dt>Payment</dt><dd>{order.paymentStatus} · {order.paymentMethod}</dd></div>
            </dl>
          </section>
        )}
      </div>
    </div>
  );
};
