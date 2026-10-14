import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiStar } from 'react-icons/fi';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import styles from './ReviewSection.module.css';

export const ReviewSection: React.FC<{ productId: string }> = ({ productId }) => {
  const { reviews, addReview } = useStore();
  const { isCustomer, customer } = useAuth();
  const list = reviews.filter((r) => r.productId === productId && r.status === 'Approved');
  const [name, setName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (customer?.name) setName((n) => n || customer.name);
  }, [customer]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDone('');
    if (!name.trim() || !comment.trim()) { setError('Please add your name and review.'); return; }
    if (!orderNumber.trim()) { setError('Enter your order number (e.g. ASP-123456) from your confirmation email.'); return; }
    if (rating < 1 || rating > 5) { setError('Rating must be between 1 and 5.'); return; }
    setBusy(true);
    try {
      await addReview(productId, name.trim(), orderNumber.trim(), rating, comment.trim());
      setDone('Thanks — your verified review was submitted for moderation.');
      setOrderNumber(''); setComment(''); setRating(5);
      setTimeout(() => setDone(''), 8000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit review. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.wrap} aria-labelledby="reviews-h">
      <h2 id="reviews-h" className={styles.h}>Reviews ({list.length})</h2>
      {list.length === 0 ? (
        <p className="muted">No verified reviews yet. Only customers who purchased this fragrance can review it.</p>
      ) : (
        <ul className={styles.list}>
          {list.map((r) => (
            <li key={r.id} className={styles.item}>
              <p className={styles.head}>
                <strong>{r.userName}</strong>
                <span> · {new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                {r.verifiedPurchase && <span className={styles.verified}> ✓ Verified purchase</span>}
              </p>
              <p className={styles.stars} aria-label={`${r.rating} out of 5 stars`}>
                {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
              </p>
              <p className={styles.comment}>{r.comment}</p>
            </li>
          ))}
        </ul>
      )}

      {!isCustomer ? (
        <div className={styles.form}>
          <h3>Write a review</h3>
          <p className="muted" style={{ fontSize: '0.87rem' }}>
            <Link to={`/login?redirect=${encodeURIComponent(`/product/${productId}`)}`} style={{ fontWeight: 650, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Sign in</Link>
            {' '}with your shopping account to write a verified review.
          </p>
        </div>
      ) : (
      <form className={styles.form} onSubmit={submit}>
        <h3>Write a review</h3>
        <p className="muted" style={{ fontSize: '0.87rem' }}>
          Reviewing as <strong>{customer?.email}</strong>. Use the order number from your confirmation.
          Reviews are moderated before they appear.
        </p>
        <div className={styles.starsBtn} role="radiogroup" aria-label="Your rating">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s} type="button" role="radio" aria-checked={s === rating} aria-label={`${s} star${s > 1 ? 's' : ''}`}
              className={s <= rating ? styles.on : ''} onClick={() => setRating(s)}
            ><FiStar /></button>
          ))}
        </div>
        <div className={styles.grid}>
          <div>
            <label htmlFor={`rn-${productId}`}>Name *</label>
            <input id={`rn-${productId}`} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="name" />
          </div>
          <div>
            <label htmlFor={`ro-${productId}`}>Order number *</label>
            <input
              id={`ro-${productId}`} value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)}
              required maxLength={64} placeholder="ASP-123456" autoComplete="off"
            />
          </div>
        </div>
        <div>
          <label htmlFor={`rc-${productId}`}>Review *</label>
          <textarea id={`rc-${productId}`} value={comment} onChange={(e) => setComment(e.target.value)} required maxLength={2000} rows={4} />
        </div>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        {done && <p className="alert alert-success" role="status">{done}</p>}
        <button type="submit" className="btn btn-secondary" disabled={busy}>{busy ? 'Submitting…' : 'Submit verified review'}</button>
      </form>
      )}
    </section>
  );
};
