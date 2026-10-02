import React from 'react';
import { FiSun, FiHeart, FiAnchor } from 'react-icons/fi';
import styles from './FragranceNotes.module.css';

interface FragranceNotesProps {
  topNotes: string[];
  middleNotes: string[];
  baseNotes: string[];
}

export const FragranceNotes: React.FC<FragranceNotesProps> = ({ topNotes, middleNotes, baseNotes }) => {
  return (
    <div className={styles.pyramidContainer}>
      <h4 className={styles.title}>Fragrance Olfactory Architecture</h4>

      <div className={styles.noteTier}>
        <div className={styles.tierLabel}>
          <FiSun /> Top Notes (Opening Impression)
        </div>
        <div className={styles.tagList}>
          {topNotes && topNotes.map((note, idx) => (
            <span key={idx} className={styles.noteTag}>{note}</span>
          ))}
        </div>
      </div>

      <div className={styles.noteTier}>
        <div className={styles.tierLabel}>
          <FiHeart /> Heart Notes (Core Character)
        </div>
        <div className={styles.tagList}>
          {middleNotes && middleNotes.map((note, idx) => (
            <span key={idx} className={styles.noteTag}>{note}</span>
          ))}
        </div>
      </div>

      <div className={styles.noteTier}>
        <div className={styles.tierLabel}>
          <FiAnchor /> Base Notes (Enduring Drydown)
        </div>
        <div className={styles.tagList}>
          {baseNotes && baseNotes.map((note, idx) => (
            <span key={idx} className={styles.noteTag}>{note}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
