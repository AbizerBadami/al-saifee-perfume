import { Product, Coupon, StoreSettings } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    title: 'Royal Oud Impérial',
    subtitle: 'Extrait de Parfum',
    category: 'Oud Specials',
    fragranceFamily: 'Woody',
    price: 2800,
    salePrice: 2450,
    stock: 18,
    description: 'An majestic blend of 30-year aged Cambodian wild agarwood resin, woven with smoky taif rose petals, velvety saffron, and dark amber crystals. Crafted for royalty.',
    topNotes: ['Taif Rose', 'Cardamom Pods', 'Smoky Bergamot'],
    middleNotes: ['30-Yr Wild Oud', 'Saffron Threads', 'Orris Butter'],
    baseNotes: ['Ambergris', 'Sandalwood Mysore', 'Dark Musk'],
    longevity: '14-16 Hours',
    projection: 'Enveloping & Powerful',
    bottleSizes: ['12ml Attar Oil', '50ml Spray', '100ml Extrait'],
    images: [
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&q=80&w=800'
    ],
    isFeatured: true,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 42,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-002',
    title: 'Sultanate Velvet Attar',
    subtitle: 'Pure Concentrated Perfume Oil',
    category: 'Pure Attars',
    fragranceFamily: 'Amber',
    price: 1850,
    salePrice: 1599,
    stock: 25,
    description: '100% alcohol-free artisanal attar oil distilled in copper stills. Rich golden amber infused with velvety damask rose, rare frankincense, and creamy Mysore sandalwood.',
    topNotes: ['Damask Rose', 'Pink Pepper', 'Sweet Myrrh'],
    middleNotes: ['Omani Frankincense', 'Golden Amber', 'Labdanum'],
    baseNotes: ['Mysore Sandalwood', 'Oakmoss', 'Cashmere Wood'],
    longevity: '18-24 Hours',
    projection: 'Intimate & Radiating',
    bottleSizes: ['6ml Concentrated', '12ml Concentrated', '24ml Royal Crystal Decanter'],
    images: [
      'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&q=80&w=800'
    ],
    isFeatured: true,
    isBestSeller: true,
    rating: 5.0,
    reviewCount: 29,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-003',
    title: 'Nocturne Amber Nectar',
    subtitle: 'Parfum Absolute',
    category: 'Perfumes',
    fragranceFamily: 'Oriental',
    price: 2200,
    salePrice: 1899,
    stock: 14,
    description: 'A seductive midnight composition featuring bourbon vanilla, toasted tonka beans, spicy nutmeg, and rich golden amber resin. Enigmatic and intoxicating.',
    topNotes: ['Toasted Nutmeg', 'Cinnamon Bark', 'Blood Orange'],
    middleNotes: ['Madagascar Vanilla', 'Tonka Bean', 'Cacao Blossom'],
    baseNotes: ['Golden Amber', 'Benzoin', 'Smoky Patchouli'],
    longevity: '12-14 Hours',
    projection: 'Strong Sillage',
    bottleSizes: ['50ml Spray', '100ml Spray'],
    images: [
      'https://images.unsplash.com/photo-1615397349754-cfa2066a298e?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=800'
    ],
    isFeatured: true,
    isBestSeller: false,
    rating: 4.8,
    reviewCount: 31,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-004',
    title: 'Jasmine de Grasse & White Musk',
    subtitle: 'Elixir de Parfum',
    category: 'Artisanal Extracts',
    fragranceFamily: 'Floral',
    price: 1650,
    stock: 30,
    description: 'Hand-harvested night-blooming jasmine blossoms from Grasse, France, layered over crystalline white musk, neroli, and sun-kissed citrus leaves.',
    topNotes: ['Italian Neroli', 'Mandarin Leaf', 'Bergamot Zest'],
    middleNotes: ['Grasse Jasmine Sambac', 'Tuberose Absolute', 'White Lily'],
    baseNotes: ['Crystalline White Musk', 'Cedarwood', 'Ambrette Seed'],
    longevity: '10-12 Hours',
    projection: 'Moderate Elegance',
    bottleSizes: ['50ml Spray', '100ml Spray'],
    images: [
      'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&q=80&w=800'
    ],
    isFeatured: false,
    isBestSeller: true,
    rating: 4.7,
    reviewCount: 18,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-005',
    title: 'Saffron & Smoked Leather',
    subtitle: 'Extrait de Parfum',
    category: 'Perfumes',
    fragranceFamily: 'Spicy',
    price: 2400,
    stock: 12,
    description: 'Sophisticated Tuscan leather infused with precious Kashmiri saffron, black pepper, velvet suede, and smoldering birch tar. A bold statement fragrance.',
    topNotes: ['Kashmiri Saffron', 'Black Pepper', 'Thyme Blossom'],
    middleNotes: ['Tuscan Leather', 'Raspberry Accent', 'Iris Absolute'],
    baseNotes: ['Birch Tar', 'Smoky Amber', 'Vetiver Root'],
    longevity: '14-18 Hours',
    projection: 'Dominant & Commanding',
    bottleSizes: ['50ml Spray', '100ml Spray'],
    images: [
      'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1615397349754-cfa2066a298e?auto=format&fit=crop&q=80&w=800'
    ],
    isFeatured: true,
    isBestSeller: false,
    rating: 4.9,
    reviewCount: 24,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-006',
    title: 'Oasis Citrus & Mint Water',
    subtitle: 'Pure Cologne Intense',
    category: 'Perfumes',
    fragranceFamily: 'Fresh',
    price: 1250,
    stock: 40,
    description: 'Refreshing Mediterranean citrus breeze with crushed spearmint leaves, green tea absolute, sea salt minerals, and crisp white cedar.',
    topNotes: ['Calabrian Bergamot', 'Crushed Mint', 'Grapefruit Zest'],
    middleNotes: ['Green Tea Leaves', 'Sea Salt Accord', 'Neroli'],
    baseNotes: ['White Cedarwood', 'Clean Musk', 'Vetiver'],
    longevity: '8-10 Hours',
    projection: 'Fresh & Vibrant',
    bottleSizes: ['50ml Spray', '100ml Spray'],
    images: [
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&q=80&w=800'
    ],
    isFeatured: false,
    isBestSeller: false,
    rating: 4.6,
    reviewCount: 15,
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_COUPONS: Coupon[] = [
  {
    id: 'coup-1',
    code: 'WELCOME10',
    discountType: 'percent',
    discountValue: 10,
    minOrderAmount: 0,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'coup-2',
    code: 'ROYAL300',
    discountType: 'fixed',
    discountValue: 300,
    minOrderAmount: 2000,
    active: true,
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'Al-Saifee Perfumes',
  supportEmail: 'concierge@alsaifeeperfumes.com',
  currencySymbol: '₹',
  taxRate: 0.1, // 10%
  freeShippingThreshold: 999,
  promoMessage: 'COMPLIMENTARY EXPRESS SHIPPING ON ORDERS OVER ₹999 • USE CODE WELCOME10 FOR 10% OFF',
};
