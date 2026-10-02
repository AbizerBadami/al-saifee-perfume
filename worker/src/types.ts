// ============================================================
// Cloudflare Worker Bindings & Database Row Types
// ============================================================

/** Cloudflare Worker environment bindings */
export type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  FRONTEND_URL: string;
  JWT_EXPIRES_IN: string;
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
  discount: number;
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

export interface ReviewRow {
  id: string;
  product_id: string;
  user_name: string;
  user_email: string;
  rating: number;
  comment: string;
  status: string;
  created_at: string;
}

export interface CouponRow {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  active: number; // 0 or 1
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
    topNotes: JSON.parse(row.top_notes),
    middleNotes: JSON.parse(row.middle_notes),
    baseNotes: JSON.parse(row.base_notes),
    longevity: row.longevity,
    projection: row.projection,
    bottleSizes: JSON.parse(row.bottle_sizes),
    images: JSON.parse(row.images),
    isFeatured: Boolean(row.is_featured),
    isBestSeller: Boolean(row.is_best_seller),
    rating: row.rating,
    reviewCount: row.review_count,
    createdAt: row.created_at,
  };
}

export function toCouponJSON(row: CouponRow) {
  return {
    id: row.id,
    code: row.code,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    minOrderAmount: row.min_order_amount,
    active: Boolean(row.active),
    createdAt: row.created_at,
  };
}

export function toReviewJSON(row: ReviewRow) {
  return {
    id: row.id,
    productId: row.product_id,
    userName: row.user_name,
    userEmail: row.user_email,
    rating: row.rating,
    comment: row.comment,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function toOrderJSON(row: OrderRow, items: OrderItemRow[]) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    shippingAddress: JSON.parse(row.shipping_address || '{}'),
    items: items.map((i) => ({
      product: { id: i.product_id, title: i.product_title },
      selectedSize: i.selected_size,
      quantity: i.quantity,
      price: i.price,
    })),
    subtotal: row.subtotal,
    discount: row.discount,
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
