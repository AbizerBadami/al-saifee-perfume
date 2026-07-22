import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiPackage, FiTruck, FiCheckCircle, FiClock } from 'react-icons/fi';
import { useStore } from '../context/StoreContext';
import { Order } from '../types';
import styles from './OrderTracking.module.css';

export const OrderTracking: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRef = searchParams.get('orderId') || '';
  const { getOrderById } = useStore();

  const [orderRefInput, setOrderRefInput] = useState(initialRef);
  const [emailInput, setEmailInput] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (initialRef) {
      const match = getOrderById(initialRef);
      if (match) {
        setSearchedOrder(match);
      }
    }
  }, [initialRef, getOrderById]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderRefInput) return;

    const match = getOrderById(orderRefInput.trim());
    if (match) {
      if (emailInput && match.customerEmail.toLowerCase() !== emailInput.trim().toLowerCase()) {
        setNotFound(true);
        setSearchedOrder(null);
        return;
      }
      setSearchedOrder(match);
      setNotFound(false);
    } else {
      setSearchedOrder(null);
      setNotFound(true);
    }
  };

  // Determine progress status line fill
  const getProgressWidth = (status: Order['status']) => {
    if (status === 'Processing') return '20%';
    if (status === 'Shipped') return '60%';
    if (status === 'Delivered') return '100%';
    return '0%';
  };

  return (
    <div className={styles.page}>
      <div className={styles.titleArea}>
        <h1 className={styles.title}>Dispatch Concierge & Tracking</h1>
        <p className={styles.subtitle}>Enter your acquisition order reference and email to trace real-time transit status</p>
      </div>

      <div className={styles.lookupCard}>
        <form className={styles.formGrid} onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Order Reference (e.g. ASP-8921) *"
            value={orderRefInput}
            onChange={(e) => setOrderRefInput(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Customer Email Address (optional)"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
          />
          <button type="submit" className={styles.searchBtn}>
            <FiSearch /> Track Order
          </button>
        </form>

        {notFound && (
          <div style={{ color: '#ef4444', marginTop: '1rem', fontSize: '0.85rem', textAlign: 'center' }}>
            No acquisition found matching reference "{orderRefInput}". Please verify your order number or email.
          </div>
        )}
      </div>

      {searchedOrder && (
        <div className={styles.statusCard}>
          <div className={styles.statusHeader}>
            <div>
              <div className={styles.orderRef}>Order {searchedOrder.orderNumber}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Placed on: {new Date(searchedOrder.createdAt).toLocaleString()}
              </div>
            </div>

            <div className={styles.statusBadge}>{searchedOrder.status}</div>
          </div>

          {/* Timeline Visual Bar */}
          <div className={styles.trackerTimeline}>
            <div className={styles.timelineLine}>
              <div className={styles.timelineFill} style={{ width: getProgressWidth(searchedOrder.status) }} />
            </div>

            <div className={`${styles.stepNode} ${searchedOrder.status !== 'Cancelled' ? styles.activeStepNode : ''}`}>
              <FiClock />
              <span className={`${styles.stepLabel} ${searchedOrder.status !== 'Cancelled' ? styles.activeStepLabel : ''}`}>
                Processing
              </span>
            </div>

            <div className={`${styles.stepNode} ${searchedOrder.status === 'Shipped' || searchedOrder.status === 'Delivered' ? styles.activeStepNode : ''}`}>
              <FiTruck />
              <span className={`${styles.stepLabel} ${searchedOrder.status === 'Shipped' || searchedOrder.status === 'Delivered' ? styles.activeStepLabel : ''}`}>
                In Transit
              </span>
            </div>

            <div className={`${styles.stepNode} ${searchedOrder.status === 'Delivered' ? styles.activeStepNode : ''}`}>
              <FiCheckCircle />
              <span className={`${styles.stepLabel} ${searchedOrder.status === 'Delivered' ? styles.activeStepLabel : ''}`}>
                Delivered
              </span>
            </div>
          </div>

          {/* Order Details & Address */}
          <div className={styles.detailsGrid}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recipient Details</div>
              <div style={{ color: 'var(--gold-light)', fontWeight: '600', marginTop: '0.25rem' }}>{searchedOrder.customerName}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{searchedOrder.customerEmail}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Carrier & Tracking</div>
              <div style={{ color: 'var(--gold-light)', fontWeight: '600', marginTop: '0.25rem' }}>
                {searchedOrder.trackingNumber || 'DHL Express — Pending Scan'}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Total Items: {searchedOrder.items.length} • Total Paid: ₹{searchedOrder.total.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
