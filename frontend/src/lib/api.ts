// ============================================================
// Centralized API Client — fetches from Cloudflare Worker
// Replaces all direct Firebase SDK calls
// ============================================================

const API_BASE = '/api'; // Proxied to Worker in dev, same-origin in prod

/** Get the stored JWT token */
export function getToken(): string | null {
  return localStorage.getItem('al_saifee_token');
}

/** Store the JWT token */
export function setToken(token: string): void {
  localStorage.setItem('al_saifee_token', token);
}

/** Clear the JWT token */
export function clearToken(): void {
  localStorage.removeItem('al_saifee_token');
}

/** Generic fetch wrapper with auth header and error handling */
async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error || `API Error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ---------- Products ----------

export const productsAPI = {
  list: () => apiFetch<{ products: any[]; total: number }>('/products'),
  get: (id: string) => apiFetch<any>(`/products/${id}`),
  create: (data: any) => apiFetch<any>('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<any>(`/products/${id}`, { method: 'DELETE' }),
};

// ---------- Orders ----------

export const ordersAPI = {
  list: () => apiFetch<{ orders: any[]; total: number }>('/orders'),
  get: (id: string) => apiFetch<any>(`/orders/${id}`),
  lookup: (orderNumber: string, email: string) =>
    apiFetch<any>(`/orders/lookup?orderNumber=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`),
  create: (data: any) => apiFetch<any>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, data: any) =>
    apiFetch<any>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ---------- Reviews ----------

export const reviewsAPI = {
  list: (productId?: string) =>
    apiFetch<{ reviews: any[]; total: number }>(productId ? `/reviews?productId=${productId}` : '/reviews'),
  create: (data: any) => apiFetch<any>('/reviews', { method: 'POST', body: JSON.stringify(data) }),
  moderate: (id: string, status: string) =>
    apiFetch<any>(`/reviews/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  delete: (id: string) => apiFetch<any>(`/reviews/${id}`, { method: 'DELETE' }),
};

// ---------- Coupons ----------

export const couponsAPI = {
  list: () => apiFetch<{ coupons: any[]; total: number }>('/coupons'),
  validate: (code: string, cartTotal: number) =>
    apiFetch<{ valid: boolean; message?: string; code?: string; discountType?: string; discountValue?: number }>(
      '/coupons/validate', { method: 'POST', body: JSON.stringify({ code, cartTotal }) }
    ),
  create: (data: any) => apiFetch<any>('/coupons', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch<any>(`/coupons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<any>(`/coupons/${id}`, { method: 'DELETE' }),
};

// ---------- Settings ----------

export const settingsAPI = {
  get: () => apiFetch<any>('/settings'),
  update: (data: any) => apiFetch<any>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};

// ---------- Auth ----------

export const authAPI = {
  register: (email: string, password: string) =>
    apiFetch<{ success: boolean; token: string; admin: any; message: string }>(
      '/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }
    ),
  login: (email: string, password: string) =>
    apiFetch<{ success: boolean; token: string; admin: any }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }
    ),
  me: () => apiFetch<{ id: string; email: string; isAdmin: boolean }>('/auth/me'),
};

// ---------- Checkout (Razorpay) ----------

export const checkoutAPI = {
  createOrder: (amount: number, currency: string, customerName: string, customerEmail: string) =>
    apiFetch<{ orderId: string; amount: number; currency: string; keyId: string }>(
      '/checkout/create-order', { method: 'POST', body: JSON.stringify({ amount, currency, customerName, customerEmail }) }
    ),
  verify: (razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string) =>
    apiFetch<{ verified: boolean; razorpayOrderId: string; razorpayPaymentId: string }>(
      '/checkout/verify', { method: 'POST', body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) }
    ),
};
