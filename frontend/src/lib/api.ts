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

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
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
    // Admin token is single-use session: drop it when the API says it's invalid.
    if (res.status === 401) {
      clearToken();
      try { window.dispatchEvent(new Event('alsaifee_logout')); } catch {}
    }
    throw new ApiError(msg, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

import type { Product, Order, Review, StoreSettings } from '../types';

export const productsAPI = {
  list: () => apiFetch<{ products: Product[]; total: number }>('/products'),
  get: (id: string) => apiFetch<{ product: Product }>(`/products/${encodeURIComponent(id)}`),
  create: (data: Partial<Product>) => apiFetch<{ product: Product }>('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Product>) => apiFetch<{ product: Product }>(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<{ id: string }>(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const ordersAPI = {
  list: (limit = 50, offset = 0) => apiFetch<{ orders: Order[]; total: number }>(`/orders?limit=${limit}&offset=${offset}`),
  get: (id: string) => apiFetch<{ order: Order }>(`/orders/${encodeURIComponent(id)}`),
  lookup: (orderNumber: string, email: string) =>
    apiFetch<{ order: Order }>(`/orders/lookup?orderNumber=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`),
  updateStatus: (id: string, data: { status?: string; trackingNumber?: string; paymentStatus?: string }) =>
    apiFetch<{ order: Order }>(`/orders/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export const reviewsAPI = {
  list: (productId?: string) => apiFetch<{ reviews: Review[]; total: number }>(productId ? `/reviews?productId=${encodeURIComponent(productId)}` : '/reviews'),
  // Admin moderation queue (requires admin JWT; 401 otherwise)
  adminList: (status: 'Pending' | 'Approved' | 'Rejected' = 'Pending', productId?: string) =>
    apiFetch<{ reviews: Review[]; total: number }>(
      `/reviews?status=${status}${productId ? `&productId=${encodeURIComponent(productId)}` : ''}`
    ),
  create: (data: { productId: string; userName: string; userEmail: string; orderNumber: string; rating: number; comment: string }) =>
    apiFetch<{ review: Review; message?: string }>('/reviews', { method: 'POST', body: JSON.stringify(data) }),
  moderate: (id: string, status: string) => apiFetch<{ review: Review }>(`/reviews/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  delete: (id: string) => apiFetch<{ id: string }>(`/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const settingsAPI = {
  get: () => apiFetch<StoreSettings>('/settings'),
  update: (data: StoreSettings) => apiFetch<StoreSettings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};

export const authAPI = {
  login: (email: string, password: string) =>
    apiFetch<{ success: boolean; token: string; admin: unknown }>(`/auth/login`, { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => apiFetch<{ id: string; email: string; isAdmin: boolean }>('/auth/me'),
};

export const checkoutAPI = {
  createOrder: (items: unknown[], currency: string, customerName: string, customerEmail: string) =>
    apiFetch<{ orderId: string; amount: number; currency: string; keyId: string }>('/checkout/create-order', {
      method: 'POST', body: JSON.stringify({ items, currency, customerName, customerEmail }),
    }),
  verify: (payload: {
    razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string;
    items: unknown[]; shippingAddress: unknown; customerName: string; customerEmail: string;
  }) =>
    apiFetch<{ verified: boolean; orderId?: string; orderNumber?: string; subtotal?: number; tax?: number; shippingFee?: number; total?: number; error?: string }>(
      '/checkout/verify', { method: 'POST', body: JSON.stringify(payload) }
    ),
};
