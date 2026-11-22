// constants.ts — Slide definitions for HeroSlideshow.
//
// DATA POLICY: No backend fields are added or changed.
// Product imagery is sourced from the same Unsplash URLs
// already present in seedData.ts (existing product data).
// Slide targets link only to existing routes (/shop, /shop?…).

import { HeroSlideData } from './types';

export const HERO_SLIDES: HeroSlideData[] = [
  {
    id: 'slide-oud-imperial',
    eyebrow: 'Oud Specials · Limited Stock',
    heading: 'Royal Oud Impérial',
    subheading:
      'Aged Cambodian agarwood, Taif rose and dark amber — crafted for those who wear silence like a crown.',
    ctaLabel: 'Shop Oud Specials',
    ctaTo: '/shop?category=Oud%20Specials',
    ctaSecondaryLabel: 'View all fragrances',
    ctaSecondaryTo: '/shop',
    image:
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=1600',
    imageAlt: 'Deep amber oud perfume bottle on a dark luxurious background',
  },
  {
    id: 'slide-attar-velvet',
    eyebrow: 'Pure Attars · Alcohol-Free',
    heading: 'Sultanate Velvet Attar',
    subheading:
      'Copper-still distilled, 100% oil — damask rose, frankincense and Mysore sandalwood in every drop.',
    ctaLabel: 'Explore Pure Attars',
    ctaTo: '/shop?category=Pure%20Attars',
    ctaSecondaryLabel: 'View all fragrances',
    ctaSecondaryTo: '/shop',
    image:
      'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&q=80&w=1600',
    imageAlt: 'Golden attar oil in a crystal decanter bathed in warm light',
  },
  {
    id: 'slide-nocturne-amber',
    eyebrow: 'Perfumes · Bestseller',
    heading: 'Nocturne Amber Nectar',
    subheading:
      'Vanilla, tonka and smoked patchouli — a seductive midnight composition that lingers for hours.',
    ctaLabel: 'Shop Perfumes',
    ctaTo: '/shop?category=Perfumes',
    ctaSecondaryLabel: 'View bestsellers',
    ctaSecondaryTo: '/shop?sort=rating',
    image:
      'https://images.unsplash.com/photo-1615397349754-cfa2066a298e?auto=format&fit=crop&q=80&w=1600',
    imageAlt: 'Dark amber perfume spray bottle on a midnight velvet surface',
  },
  {
    id: 'slide-saffron-leather',
    eyebrow: 'Perfumes · Statement Fragrance',
    heading: 'Saffron & Smoked Leather',
    subheading:
      'Kashmiri saffron, Tuscan leather and birch tar — bold, commanding and unforgettable.',
    ctaLabel: 'Discover More',
    ctaTo: '/shop',
    ctaSecondaryLabel: 'Top rated',
    ctaSecondaryTo: '/shop?sort=rating',
    image:
      'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&q=80&w=1600',
    imageAlt: 'Elegant perfume bottle surrounded by saffron threads and leather',
  },
];

/** Trust / proof strip items — relocated from old Hero */
export const TRUST_ITEMS = [
  { term: 'Alcohol-free', detail: 'Attars & oils' },
  { term: 'Free shipping', detail: 'Orders over ₹999' },
  { term: 'Secure checkout', detail: 'UPI · Cards · Netbanking' },
] as const;

/** Auto-advance interval in milliseconds */
export const SLIDE_INTERVAL_MS = 5500;
