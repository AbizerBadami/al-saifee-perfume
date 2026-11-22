// useCarousel.ts — custom hook for the HeroSlideshow
// Handles: auto-advance, pause-on-hover/focus, pointer-drag,
// keyboard navigation, and reduced-motion opt-out.

import { useState, useEffect, useRef, useCallback } from 'react';
import { SLIDE_INTERVAL_MS } from './constants';

export interface UseCarouselReturn {
  current: number;
  total: number;
  isAnimating: boolean;
  reducedMotion: boolean;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
  pause: () => void;
  resume: () => void;
  /** Bind to the slide container for drag/swipe support */
  dragHandlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerLeave: (e: React.PointerEvent) => void;
  };
}

const DRAG_THRESHOLD = 50; // px to register as a swipe

export function useCarousel(total: number): UseCarouselReturn {
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const paused = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragStart = useRef<number | null>(null);

  // Detect prefers-reduced-motion
  const reducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const goTo = useCallback(
    (index: number) => {
      const next = ((index % total) + total) % total;
      setCurrent(next);
      if (!reducedMotion) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 500);
      }
    },
    [total, reducedMotion],
  );

  const next = useCallback(() => goTo(current + 1), [goTo, current]);
  const prev = useCallback(() => goTo(current - 1), [goTo, current]);

  const pause = useCallback(() => {
    paused.current = true;
  }, []);

  const resume = useCallback(() => {
    paused.current = false;
  }, []);

  // Auto-advance
  useEffect(() => {
    if (reducedMotion) return; // respect user preference
    intervalRef.current = setInterval(() => {
      if (!paused.current) {
        setCurrent((c) => (c + 1) % total);
      }
    }, SLIDE_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [total, reducedMotion]);

  // Drag / swipe handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragStart.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    paused.current = true;
  }, []);

  const onPointerMove = useCallback((_e: React.PointerEvent) => {
    // We only need start → end delta; no live tracking needed
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (dragStart.current === null) return;
      const delta = e.clientX - dragStart.current;
      dragStart.current = null;
      paused.current = false;
      if (Math.abs(delta) >= DRAG_THRESHOLD) {
        delta < 0 ? next() : prev();
      }
    },
    [next, prev],
  );

  const onPointerLeave = useCallback((e: React.PointerEvent) => {
    if (dragStart.current !== null && e.buttons === 0) {
      dragStart.current = null;
      paused.current = false;
    }
  }, []);

  return {
    current,
    total,
    isAnimating,
    reducedMotion,
    goTo,
    next,
    prev,
    pause,
    resume,
    dragHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerLeave },
  };
}
