// ============================================================
// Cloudflare Worker Bindings & Database Row Types
// ============================================================
/// <reference types="@cloudflare/workers-types" />

/** Cloudflare Worker environment bindings */
export type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  FRONTEND_URL: string;
  JWT_EXPIRES_IN: string;
  ADMIN_SETUP_TOKEN?: string;
  RATE_LIMITER?: RateLimit;
  RAZORPAY_WEBHOOK_SECRET?: string;
};

/** Hono context variables set by auth middleware */
export type Variables = {
  adminId: string;
  adminEmail: string;
};

// ---------- D1 Row Types ----------

export interface ProductRow {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  fragrance_family: string;
  price: number;
  sale_price: number | null;
  stock: number;
  description: string;
  top_notes: string;     // JSON array string
  middle_notes: string;  // JSON array string
  base_notes: string;    // JSON array string
  longevity: string;
  projection: string;
  bottle_sizes: string;  // JSON array string
  images: string;        // JSON array string
  is_featured: number;   // 0 or 1
  is_best_seller: number;
  rating: number;
  review_count: number;
  created_at: string;
}

export interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  shipping_address: string; // JSON object string
  subtotal: number;
  tax: number;
  shipping_fee: number;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string;
  tracking_number: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
}

export interface OrderItemRow {
  id: number;
  order_id: string;
  product_id: string;
  product_title: string;
  selected_size: string;
  quantity: number;
  price: number;
}

export interface PendingOrderRow {
  id: string; // razorpay_order_id
  amount: number;
  currency: string;
  items_json: string;
  subtotal: number;
  tax: number;
  shipping_fee: number;
  total: number;
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  status: string;
  created_at: string;
}

export interface ReviewRow {
  id: string;
  product_id: string;
  user_name: string;
  user_email: string;
  rating: number;
  comment: string;
  status: string;
  order_number: string | null;
  verified_purchase: number;
  created_at: string;
}


export interface StoreSettingsRow {
  id: number;
  store_name: string;
  support_email: string;
  currency_symbol: string;
  tax_rate: number;
  free_shipping_threshold: number;
  promo_message: string;
}

export interface AdminRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}


// ---------- API Response helpers ----------

/** Transforms a ProductRow into the JSON shape the frontend expects */
<<<<<<< HEAD
function safeJsonParse(str: string, fallback: any = {}): any {
  try { return JSON.parse(str); } catch { return fallback; }
=======
function safeJsonParseArray(str: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(str)) return str.map(String);
  if (typeof str !== 'string') return fallback;
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v.map(String) : fallback;
  } catch {
    return fallback;
  }
}

function safeJsonParseObject(str: unknown, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  if (str && typeof str === 'object') return str as Record<string, unknown>;
  if (typeof str !== 'string') return fallback;
  try {
    const v = JSON.parse(str);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
>>>>>>> 03fb960 (rebuild)
}

export function toProductJSON(row: ProductRow) {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    category: row.category,
    fragranceFamily: row.fragrance_family,
    price: row.price,
    salePrice: row.sale_price,
    stock: row.stock,
    description: row.description,
    topNotes: safeJsonParseArray(row.top_notes),
    middleNotes: safeJsonParseArray(row.middle_notes),
    baseNotes: safeJsonParseArray(row.base_notes),
    longevity: row.longevity,
    projection: row.projection,
    bottleSizes: safeJsonParseArray(row.bottle_sizes),
    images: safeJsonParseArray(row.images),
    isFeatured: Boolean(row.is_featured),
    isBestSeller: Boolean(row.is_best_seller),
    rating: row.rating,
    reviewCount: row.review_count,
    createdAt: row.created_at,
  };
}


export function toReviewJSON(row: ReviewRow, includePrivate = false) {
  const base = {
    id: row.id,
    productId: row.product_id,
    userName: row.user_name,
<<<<<<< HEAD
    rating: row.rating,
    comment: row.comment,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function toAdminReviewJSON(row: ReviewRow) {
  return {
    id: row.id,
    productId: row.product_id,
    userName: row.user_name,
    userEmail: row.user_email,
=======
>>>>>>> 03fb960 (rebuild)
    rating: row.rating,
    comment: row.comment,
    status: row.status,
    verifiedPurchase: Boolean(row.verified_purchase),
    createdAt: row.created_at,
  };
  if (!includePrivate) return base;
  return {
    ...base,
    userEmail: row.user_email,
    orderNumber: row.order_number,
  };
}

export function toPublicOrderJSON(row: OrderRow, items: OrderItemRow[]) {
  const addr = safeJsonParse(row.shipping_address, {});
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    // Redact exact physical address, expose only city/country/pincode for privacy
    shippingSummary: {
      city: addr.city || '',
      state: addr.state || '',
      country: addr.country || '',
      pincode: (addr.pincode || addr.postalCode) ? `${String(addr.pincode || addr.postalCode).slice(0, 2)}***` : '',
    },
    items: items.map((i) => ({
      product: { id: i.product_id, title: i.product_title },
      selectedSize: i.selected_size,
      quantity: i.quantity,
      price: i.price,
    })),
    subtotal: row.subtotal,
    tax: row.tax,
    shippingFee: row.shipping_fee,
    total: row.total,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    trackingNumber: row.tracking_number,
    createdAt: row.created_at,
  };
}

export function toOrderJSON(row: OrderRow, items: OrderItemRow[]) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
<<<<<<< HEAD
    shippingAddress: safeJsonParse(row.shipping_address, {}),
=======
    shippingAddress: safeJsonParseObject(row.shipping_address),
>>>>>>> 03fb960 (rebuild)
    items: items.map((i) => ({
      product: { id: i.product_id, title: i.product_title },
      selectedSize: i.selected_size,
      quantity: i.quantity,
      price: i.price,
    })),
    subtotal: row.subtotal,
    tax: row.tax,
    shippingFee: row.shipping_fee,
    total: row.total,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    trackingNumber: row.tracking_number,
    createdAt: row.created_at,
  };
}

export function toSettingsJSON(row: StoreSettingsRow) {
  return {
    storeName: row.store_name,
    supportEmail: row.support_email,
    currencySymbol: row.currency_symbol,
    taxRate: row.tax_rate,
    freeShippingThreshold: row.free_shipping_threshold,
    promoMessage: row.promo_message,
  };
}
