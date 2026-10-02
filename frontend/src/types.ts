export interface FragranceNotes {
  top: string[];
  middle: string[];
  base: string[];
}

export interface Product {
  id: string;
  title: string;
  subtitle: string;
  category: 'Perfumes' | 'Pure Attars' | 'Artisanal Extracts' | 'Oud Specials';
  fragranceFamily: 'Woody' | 'Amber' | 'Floral' | 'Oriental' | 'Fresh' | 'Spicy';
  price: number;
  salePrice?: number;
  stock: number;
  description: string;
  topNotes: string[];
  middleNotes: string[];
  baseNotes: string[];
  longevity: string;
  projection: string;
  bottleSizes: string[];
  images: string[];
  isFeatured: boolean;
  isBestSeller: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  selectedSize: string;
  quantity: number;
  price: number;
}

export interface ShippingAddress {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: ShippingAddress;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  shippingFee: number;
  total: number;
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentStatus: 'Paid' | 'Pending' | 'Failed';
  paymentMethod: string;
  trackingNumber?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userName: string;
  userEmail: string;
  rating: number;
  comment: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  active: boolean;
  createdAt: string;
}

export interface StoreSettings {
  storeName: string;
  supportEmail: string;
  currencySymbol: string;
  taxRate: number; // e.g. 0.10 for 10%
  freeShippingThreshold: number; // e.g. 50
  promoMessage: string;
}
