// Centralized API client — typed, consistent errors
const API_BASE = (import.meta.env.VITE_API_URL as string)?.replace(/\/$/, '') || '/api';

<<<<<<< HEAD
const API_BASE = import.meta.env.VITE_API_URL || 'https://al-saifee-api.al-saifee-worker.workers.dev/api';
=======
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
>>>>>>> 03fb960 (rebuild)

export function getToken(): string | null {
  try { return localStorage.getItem('alsaifee_token') || localStorage.getItem('al_saifee_token'); }
  catch { return null; }
}
export function setToken(token: string): void {
  localStorage.setItem('alsaifee_token', token);
  try { localStorage.removeItem('al_saifee_token'); } catch {}
}
export function clearToken(): void {
  try { localStorage.removeItem('alsaifee_token'); localStorage.removeItem('al_saifee_token'); } catch {}
}

const CUSTOMER_KEY = 'alsaifee_customer_token';

export function getCustomerToken(): string | null {
  try { return localStorage.getItem(CUSTOMER_KEY); }
  catch { return null; }
}
export function setCustomerToken(token: string): void {
  try { localStorage.setItem(CUSTOMER_KEY, token); } catch {}
}
export function clearCustomerToken(): void {
  try { localStorage.removeItem(CUSTOMER_KEY); } catch {}
}

type AuthKind = 'admin' | 'customer' | 'none';

async function apiFetch<T>(path: string, options: RequestInit = {}, auth: AuthKind = 'admin'): Promise<T> {
  const token = auth === 'admin' ? getToken() : auth === 'customer' ? getCustomerToken() : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as { error?: string }).error || `Request failed (${res.status})`;
    // Drop only the credential that was actually sent and rejected.
    if (res.status === 401 && token) {
      if (auth === 'admin') {
        clearToken();
        try { window.dispatchEvent(new Event('alsaifee_logout')); } catch {}
      } else {
        clearCustomerToken();
        try { window.dispatchEvent(new Event('alsaifee_customer_logout')); } catch {}
      }
    }
    throw new ApiError(msg, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

import type { Product, Order, Review, StoreSettings, Customer } from '../types';

export const productsAPI = {
  list: () => apiFetch<{ products: Product[]; total: number }>('/products', {}, 'none'),
  get: (id: string) => apiFetch<{ product: Product }>(`/products/${encodeURIComponent(id)}`, {}, 'none'),
  create: (data: Partial<Product>) => apiFetch<{ product: Product }>('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Product>) => apiFetch<{ product: Product }>(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<{ id: string }>(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const ordersAPI = {
  list: (limit = 50, offset = 0) => apiFetch<{ orders: Order[]; total: number }>(`/orders?limit=${limit}&offset=${offset}`),
  get: (id: string) => apiFetch<{ order: Order }>(`/orders/${encodeURIComponent(id)}`),
  lookup: (orderNumber: string, email: string) =>
    apiFetch<{ order: Order }>(`/orders/lookup?orderNumber=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`, {}, 'none'),
  updateStatus: (id: string, data: { status?: string; trackingNumber?: string; paymentStatus?: string }) =>
    apiFetch<{ order: Order }>(`/orders/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export const reviewsAPI = {
  list: (productId?: string) => apiFetch<{ reviews: Review[]; total: number }>(productId ? `/reviews?productId=${encodeURIComponent(productId)}` : '/reviews', {}, 'none'),
  // Admin moderation queue (requires admin JWT; 401 otherwise)
  adminList: (status: 'Pending' | 'Approved' | 'Rejected' = 'Pending', productId?: string) =>
    apiFetch<{ reviews: Review[]; total: number }>(
      `/reviews?status=${status}${productId ? `&productId=${encodeURIComponent(productId)}` : ''}`
    ),
  // Signed-in verified buyers only (customer JWT; email taken from token)
  create: (data: { productId: string; userName: string; orderNumber: string; rating: number; comment: string }) =>
    apiFetch<{ review: Review; message?: string }>('/reviews', { method: 'POST', body: JSON.stringify(data) }, 'customer'),
  moderate: (id: string, status: string) => apiFetch<{ review: Review }>(`/reviews/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  delete: (id: string) => apiFetch<{ id: string }>(`/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const settingsAPI = {
  get: () => apiFetch<StoreSettings>('/settings', {}, 'none'),
  update: (data: StoreSettings) => apiFetch<StoreSettings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};

export const customerAPI = {
  register: (name: string, email: string, password: string) =>
    apiFetch<{ success: boolean; token: string; customer: Customer }>('/customer/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }, 'none'),
  login: (email: string, password: string) =>
    apiFetch<{ success: boolean; token: string; customer: Customer }>('/customer/login', { method: 'POST', body: JSON.stringify({ email, password }) }, 'none'),
  me: () => apiFetch<Customer>('/customer/me', {}, 'customer'),
  wishlist: () => apiFetch<{ products: Product[]; total: number }>('/customer/wishlist', {}, 'customer'),
  wishlistAdd: (productId: string) =>
    apiFetch<{ productId: string }>('/customer/wishlist', { method: 'POST', body: JSON.stringify({ productId }) }, 'customer'),
  wishlistRemove: (productId: string) =>
    apiFetch<{ productId: string }>(`/customer/wishlist/${encodeURIComponent(productId)}`, { method: 'DELETE' }, 'customer'),
  orders: (limit = 20, offset = 0) =>
    apiFetch<{ orders: Order[]; total: number }>(`/customer/orders?limit=${limit}&offset=${offset}`, {}, 'customer'),
};

export const authAPI = {
  login: (email: string, password: string) =>
    apiFetch<{ success: boolean; token: string; admin: unknown }>(`/auth/login`, { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => apiFetch<{ id: string; email: string; isAdmin: boolean }>('/auth/me'),
};

export const checkoutAPI = {
  createOrder: (items: unknown[], currency: string, customerName: string) =>
    apiFetch<{ orderId: string; amount: number; currency: string; keyId: string }>('/checkout/create-order', {
      method: 'POST', body: JSON.stringify({ items, currency, customerName }),
    }, 'customer'),
  verify: (payload: {
    razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string;
    items: unknown[]; shippingAddress: unknown; customerName: string;
  }) =>
    apiFetch<{ verified: boolean; orderId?: string; orderNumber?: string; subtotal?: number; tax?: number; shippingFee?: number; total?: number; error?: string }>(
      '/checkout/verify', { method: 'POST', body: JSON.stringify(payload) }, 'customer'
    ),
};
