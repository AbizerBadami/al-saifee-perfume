import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiCheck, FiTruck, FiShoppingBag } from 'react-icons/fi';
import styles from './Success.module.css';

interface LastOrder {
  orderId: string;
  orderNumber: string;
  total: number;
}

export const Success: React.FC = () => {
  const [params] = useSearchParams();
  const orderId = params.get('orderId') || '';
  const orderNumber = params.get('orderNumber') || '';
  const totalParam = Number(params.get('total') || '0');
  const [receipt, setReceipt] = useState<LastOrder | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('alsaifee_last_order');
      if (saved) setReceipt(JSON.parse(saved) as LastOrder);
    } catch {}
  }, []);

  const number = orderNumber || receipt?.orderNumber || '';
  const total = totalParam || receipt?.total || 0;

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.card} role="status">
          <span className={styles.check}><FiCheck aria-hidden="true" /></span>
          <p className="eyebrow">Payment successful</p>
          <h1 className={styles.h1}>Thank you — order confirmed</h1>
          <p className={styles.lead}>We&apos;ve emailed your receipt and will ship soon. Track progress anytime with your order number.</p>

          {number && (
            <p className={styles.ref}>
              Order <strong>{number}</strong>
              {total > 0 && <> · ₹{total.toLocaleString('en-IN')}</>}
            </p>
          )}
          {!number && !orderId && (
            <p className={styles.lead}>No order reference found. If you just paid, check your email for confirmation.</p>
          )}

          <div className={styles.actions}>
            {number && (
              <Link to={`/tracking?orderId=${encodeURIComponent(number)}`} className="btn btn-primary">
                <FiTruck /> Track order
              </Link>
            )}
            <Link to="/shop" className="btn btn-secondary"><FiShoppingBag /> Continue shopping</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
