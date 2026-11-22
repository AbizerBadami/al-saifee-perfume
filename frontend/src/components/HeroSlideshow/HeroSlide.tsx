// HeroSlide.tsx — renders a single slide in the carousel.
// Uses CSS modules (HeroSlide.module.css) — no global styles touched.

import React from 'react';
import { Link } from 'react-router-dom';
import styles from './HeroSlide.module.css';
import { HeroSlideData } from './types';

interface Props {
  slide: HeroSlideData;
  /** Whether this slide is currently the active/visible one */
  active: boolean;
  /** Used to give each bg image the correct loading priority */
  priority: boolean;
}

export const HeroSlide: React.FC<Props> = ({ slide, active, priority }) => {
  return (
    <div
      className={styles.slide}
      role="group"
      aria-roledescription="slide"
      aria-label={slide.heading}
      aria-hidden={!active}
    >
      {/* Background image layer */}
      <div className={styles.bg}>
        <img
          src={slide.image}
          alt={slide.imageAlt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'low'}
          referrerPolicy="no-referrer"
          decoding="async"
        />
        <div className={styles.scrim} aria-hidden="true" />
      </div>

      {/* Copy panel */}
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{slide.eyebrow}</p>
        <h1 className={styles.heading}>{slide.heading}</h1>
        <p className={styles.sub}>{slide.subheading}</p>
        <div className={styles.ctaRow}>
          <Link to={slide.ctaTo} className={styles.ctaPrimary} tabIndex={active ? 0 : -1}>
            {slide.ctaLabel}
          </Link>
          {slide.ctaSecondaryLabel && slide.ctaSecondaryTo && (
            <Link
              to={slide.ctaSecondaryTo}
              className={styles.ctaSecondary}
              tabIndex={active ? 0 : -1}
            >
              {slide.ctaSecondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
