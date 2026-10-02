import React, { useState } from 'react';
import { FiStar } from 'react-icons/fi';
import { useStore } from '../context/StoreContext';
import styles from './ReviewSection.module.css';

interface ReviewSectionProps {
  productId: string;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({ productId }) => {
  const { reviews, addReview } = useStore();
  const productReviews = reviews.filter((r) => r.productId === productId && r.status === 'Approved');

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userName && comment) {
      await addReview(productId, userName, userEmail, rating, comment);
      setSubmitted(true);
      setUserName('');
      setUserEmail('');
      setComment('');
      setRating(5);
    }
  };

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h3 className={styles.title}>Client Testimonials ({productReviews.length})</h3>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formTitle}>Write a Verified Connoisseur Review</div>

        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
            Rating Score
          </label>
          <div className={styles.ratingSelector}>
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={styles.star}
                style={{ color: star <= rating ? 'var(--gold-primary)' : 'var(--text-muted)', display: 'inline-block' }}
                onClick={() => setRating(star)}
              >
                <FiStar />
              </span>
            ))}
          </div>
        </div>

        <div className={styles.inputGrid}>
          <input
            type="text"
            placeholder="Your Full Name *"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Your Email Address *"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            required
          />
        </div>

        <textarea
          placeholder="Share your olfactory impressions of this fragrance formulation *"
          className={styles.textarea}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required
        />

        <button type="submit" className={styles.submitBtn}>
          Submit Testimonial
        </button>

        {submitted && (
          <div style={{ color: 'var(--gold-primary)', fontSize: '0.85rem' }}>
            Thank you! Your review has been recorded.
          </div>
        )}
      </form>

      <div className={styles.reviewList}>
        {productReviews.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Be the first connoisseur to review this artisanal creation.
          </p>
        ) : (
          productReviews.map((rev) => (
            <div key={rev.id} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <span className={styles.userName}>{rev.userName}</span>
                <span className={styles.date}>{new Date(rev.createdAt).toLocaleDateString()}</span>
              </div>

              <div className={styles.starsRow}>
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    style={{
                      color: i < rev.rating ? 'var(--gold-primary)' : 'var(--text-muted)',
                      fontSize: '0.85rem',
                      display: 'inline-block'
                    }}
                  >
                    <FiStar />
                  </span>
                ))}
              </div>

              <p className={styles.comment}>{rev.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
