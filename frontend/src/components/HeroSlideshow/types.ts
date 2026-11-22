// Types for HeroSlideshow — scoped to the hero module only.
// No backend types are referenced here.

export interface HeroSlideData {
  /** Unique key for React reconciliation */
  id: string;
  /** Eyebrow label above heading */
  eyebrow: string;
  /** Large H1 / headline text */
  heading: string;
  /** Supporting sentence beneath the heading */
  subheading: string;
  /** Primary CTA label */
  ctaLabel: string;
  /** Route for primary CTA (uses existing routes only) */
  ctaTo: string;
  /** Secondary CTA label — optional */
  ctaSecondaryLabel?: string;
  /** Route for secondary CTA */
  ctaSecondaryTo?: string;
  /** Hero background image URL */
  image: string;
  /** Accessible alt text for the background image */
  imageAlt: string;
  /**
   * Optional accent colour override per slide (CSS colour string).
   * Falls back to var(--accent) when omitted.
   */
  accentColor?: string;
}
