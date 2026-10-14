import React from 'react';
import { FiSun, FiHeart, FiAnchor } from 'react-icons/fi';
import styles from './FragranceNotes.module.css';

interface Props {
  topNotes: string[];
  middleNotes: string[];
  baseNotes: string[];
}

export const FragranceNotes: React.FC<Props> = ({ topNotes = [], middleNotes = [], baseNotes = [] }) => {
  const tiers = [
    { icon: <FiSun aria-hidden="true" />, label: 'Top notes', hint: 'First impression', notes: topNotes },
    { icon: <FiHeart aria-hidden="true" />, label: 'Heart notes', hint: 'Character', notes: middleNotes },
    { icon: <FiAnchor aria-hidden="true" />, label: 'Base notes', hint: 'Lasting drydown', notes: baseNotes },
  ];
  return (
    <section className={styles.box} aria-label="Fragrance notes">
      <h2 className={styles.h}>Fragrance notes</h2>
      {tiers.map((t) => (
        <div key={t.label} className={styles.tier}>
          <p className={styles.label}>{t.icon} {t.label} <span>· {t.hint}</span></p>
          <ul className={styles.tags}>
            {(t.notes?.length ? t.notes : ['—']).map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      ))}
    </section>
  );
};
