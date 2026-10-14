import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { customerAPI } from '../lib/api';
import type { Order } from '../types';
import styles from './OrderTracking.module.css';

export const Account: React.FC = () => {
  const { customer, logoutCustomer } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    customerAPI.orders(20, 0)
      .then((res) => {
        if (cancelled) return;
        setOrders(res.orders || []);
        setTotal(res.total || 0);
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load orders.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const signOut = () => {
    logoutCustomer();
    navigate('/', { replace: true });
  };

  return (
    <div className={styles.page}>
      <div className="container">
        <p className="eyebrow">My account</p>
        <h1 className={styles.h1}>Hello, {customer?.name}</h1>
        <p className={styles.sub}>{customer?.email} · {total} order{total === 1 ? '' : 's'} placed</p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <Link to="/wishlist" className="btn btn-secondary">My wishlist</Link>
          <Link to="/shop" className="btn btn-secondary">Continue shopping</Link>
          <button type="button" className="btn btn-ghost" onClick={signOut}>Sign out</button>
        </div>

        <h2 style={{ fontSize: '1.2rem', margin: '0 0 1rem' }}>Order history</h2>
        {loading && <p className="muted">Loading orders…</p>}
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        {!loading && !error && orders.length === 0 && (
          <div className="empty">
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem' }}>No orders yet</h3>
            <p>Your paid orders will appear here with live status.</p>
            <p style={{ marginTop: '1rem' }}><Link to="/shop" className="btn btn-primary">Browse fragrances</Link></p>
          </div>
        )}
        {!loading && !error && orders.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', maxWidth: '720px' }}>
            {orders.map((o) => (
              <article key={o.id} className="card" style={{ padding: '1.1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <strong>Order {o.orderNumber}</strong>
                    <p className="muted" style={{ fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                      {new Date(o.createdAt).toLocaleDateString('en-IN')} · {o.items.length} item(s) · ₹{o.total.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <span className={styles.badge}>{o.status}</span>
                </div>
                <p style={{ margin: '0.75rem 0 0' }}>
                  <Link to={`/tracking?orderId=${encodeURIComponent(o.orderNumber)}`} style={{ fontWeight: 650, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                    Track this order
                  </Link>
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
