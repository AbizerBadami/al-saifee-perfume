import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiCheck, FiDownload, FiTruck, FiShoppingBag } from 'react-icons/fi';
import { useStore } from '../context/StoreContext';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import styles from './Success.module.css';

export const Success: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { getOrderById } = useStore();

  const order = orderId ? getOrderById(orderId) : undefined;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.checkIcon}>
          <FiCheck />
        </div>

        <h1 className={styles.title}>Acquisition Confirmed</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '500px' }}>
          Thank you for choosing Al-Saifee Perfumes. Your order has been registered in our subterranean vault and is being prepared for climate-controlled dispatch.
        </p>

        {order ? (
          <>
            <div className={styles.orderNum}>Order Reference: {order.orderNumber}</div>

            <div className={styles.summaryBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gold-primary)', fontWeight: '600' }}>
                <span>Billed To: {order.customerName}</span>
                <span>Total: ₹{order.total.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Confirmation sent to: <strong>{order.customerEmail}</strong>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Estimated Delivery: <strong>2 - 4 Business Days (Express Courier)</strong>
              </div>
            </div>

            <div className={styles.btnGroup}>
              <button className={styles.downloadBtn} onClick={() => downloadInvoicePDF(order)}>
                <FiDownload /> Download Official Invoice (PDF)
              </button>

              <Link to={`/tracking?orderId=${order.orderNumber}`} className={styles.trackBtn}>
                <FiTruck /> Track Dispatch Status
              </Link>
            </div>
          </>
        ) : (
          <div className={styles.btnGroup}>
            <Link to="/shop" className={styles.downloadBtn}>
              <FiShoppingBag /> Return to Collection
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
