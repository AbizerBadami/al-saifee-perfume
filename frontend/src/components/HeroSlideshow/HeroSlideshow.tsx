// HeroSlideshow.tsx — the main carousel component.
//
// Scope: purely presentational + animation.
// No backend calls, no global state changes.
// Consumes data from constants.ts only.

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './HeroSlideshow.module.css';
import { HeroSlide } from './HeroSlide';
import { useCarousel } from './useCarousel';
import { HERO_SLIDES, TRUST_ITEMS, SLIDE_INTERVAL_MS } from './constants';

export const HeroSlideshow: React.FC = () => {
  const slides = HERO_SLIDES;
  const { current, goTo, next, prev, pause, resume, reducedMotion, dragHandlers } = useCarousel(
    slides.length,
  );

  // Progress bar animation
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number>(0);
  const isPausedRef = useRef(false);

  useEffect(() => {
    if (reducedMotion) {
      setProgress(0);
      return;
    }

    // Reset on slide change
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    pausedAtRef.current = 0;
    isPausedRef.current = false;
    setProgress(0);

    const tick = (ts: number) => {
      if (isPausedRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (startRef.current === null) {
        startRef.current = ts - pausedAtRef.current;
      }
      const elapsed = ts - startRef.current;
      const pct = Math.min((elapsed / SLIDE_INTERVAL_MS) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [current, reducedMotion]);

  const handlePause = () => {
    isPausedRef.current = true;
    pausedAtRef.current =
      startRef.current !== null
        ? (progress / 100) * SLIDE_INTERVAL_MS
        : 0;
    pause();
  };

  const handleResume = () => {
    isPausedRef.current = false;
    startRef.current = null; // will be recalculated from pausedAtRef
    resume();
  };

  return (
    <section
      aria-label="Featured fragrances carousel"
      aria-roledescription="carousel"
    >
      {/* ── Slide track ───────────────────────────────────────── */}
      <div
        className={styles.wrapper}
        onMouseEnter={handlePause}
        onMouseLeave={handleResume}
        onFocus={handlePause}
        onBlur={handleResume}
      >
        <div
          className={styles.track}
          {...dragHandlers}
          aria-live="off"
        >
          {/* Inner padding container so copy aligns with page max-width */}
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              className={`${styles.slideWrap}${i === current ? ' ' + styles.active : ''}`}
            >
              <div className={styles.inner}>
                <HeroSlide
                  slide={slide}
                  active={i === current}
                  priority={i === 0}
                />
              </div>
            </div>
          ))}

          {/* Prev / Next arrows */}
          <button
            className={`${styles.arrowBtn} ${styles.arrowPrev}`}
            onClick={prev}
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
          <button
            className={`${styles.arrowBtn} ${styles.arrowNext}`}
            onClick={next}
            aria-label="Next slide"
          >
            <ChevronRight size={20} strokeWidth={2} />
          </button>

          {/* Dot indicators */}
          <ol className={styles.dots} aria-label="Slides">
            {slides.map((slide, i) => (
              <li key={slide.id}>
                <button
                  className={`${styles.dot}${i === current ? ' ' + styles.dotActive : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}: ${slide.heading}`}
                  aria-current={i === current ? 'true' : undefined}
                />
              </li>
            ))}
          </ol>

          {/* Progress bar */}
          {!reducedMotion && (
            <div
              className={styles.progressBar}
              style={{ width: `${progress}%` }}
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {/* ── Trust strip (relocated from old Hero <dl>) ─────────── */}
      <div className={styles.trustWrapper}>
        <dl className={styles.trustStrip}>
          {TRUST_ITEMS.map((item) => (
            <div key={item.term} className={styles.trustItem}>
              <dt className={styles.trustTerm}>{item.term}</dt>
              <dd className={styles.trustDetail}>{item.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};
