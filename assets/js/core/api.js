/**
 * core/api.js — HTTP layer (no UI logic)
 */
import * as auth from './auth.js';
import { createCartStore } from './cartStore.js';
import { formatPrice, attachPriceFormatter } from '../utils/priceFormatter.js';
import { toast } from '../utils/helpers.js';

const CFG = () => window.AppConfig || {};
const API = () => CFG().api || {};
const MSG = () => CFG().messages || {};
const HOOKS = () => CFG().hooks || {};

const BASE_URL = () => API().baseUrl || 'api/v1';

class ApiError extends Error {
  constructor(message, status = 0, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = options.errors ?? null;
    this.raw = options.raw ?? null;
    this.isNetwork = !!options.isNetwork;
    this.isTimeout = !!options.isTimeout;
    this.isParse = !!options.isParse;
  }

  get isValidation() { return this.status === 422; }
  get isAuth() { return this.status === 401; }
  get isForbidden() { return this.status === 403; }
  get isNotFound() { return this.status === 404; }
  get isRateLimit() { return this.status === 429; }
  get isServer() { return this.status >= 500; }

  firstFieldError() {
    if (!this.errors || typeof this.errors !== 'object') return null;
    return Object.values(this.errors).flat()[0] ?? null;
  }

  displayMessage() {
    return this.firstFieldError() || this.message || MSG().unknown;
  }
}

function mapResponse(json, status) {
  if (json && typeof json === 'object' && 'success' in json) {
    return {
      ok: !!json.success,
      data: json.data ?? null,
      message: json.message ?? '',
      errors: json.errors ?? null,
      meta: json.meta ?? null,
      status,
    };
  }
  return {
    ok: status >= 200 && status < 300,
    data: json ?? null,
    message: '',
    errors: null,
    meta: null,
    status,
  };
}

function mapPagination(mapped) {
  const src = mapped.meta || mapped.data;
  if (!src || typeof src !== 'object') return null;
  if ('total' in src && ('page' in src || 'current_page' in src)) {
    return {
      items: src.data ?? src.items ?? mapped.data,
      total: src.total ?? 0,
      page: src.page ?? src.current_page ?? 1,
      perPage: src.per_page ?? src.limit ?? 15,
      lastPage: src.last_page ?? 1,
    };
  }
  return null;
}

function defaultMessage(status) {
  const m = MSG();
  if (status === 401) return m.unauthorized;
  if (status === 403) return m.forbidden;
  if (status === 404) return m.notFound;
  if (status === 422) return m.validation;
  if (status === 429) return m.rateLimit;
  if (status >= 500) return m.server;
  return m.unknown;
}

function emitError(err) {
  if (typeof HOOKS().onError === 'function') {
    try { HOOKS().onError(err); } catch (_) { /* noop */ }
  }
}

function emitUnauthorized() {
  if (typeof HOOKS().onUnauthorized === 'function') {
    try { HOOKS().onUnauthorized(); } catch (_) { /* noop */ }
  }
}

function buildUrl(path, queryParams = {}) {
  const base = BASE_URL().replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const pageBase = window.location.href.replace(/[#?].*$/, '').replace(/[^/]+$/, '');
  const relative = base.startsWith('/') ? `${base.slice(1)}${cleanPath}` : `${base}${cleanPath}`;
  const url = new URL(relative, pageBase);
  Object.entries(queryParams).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') url.searchParams.set(k, v);
  });
  return url.toString();
}

function serializeProductFilters(filters = {}) {
  const query = { ...filters };
  const attrs = query.attrs;

  if (attrs && typeof attrs === 'object' && !Array.isArray(attrs)) {
    Object.entries(attrs).forEach(([slug, values]) => {
      const list = Array.isArray(values) ? values : String(values).split(',').filter(Boolean);
      if (list.length) query[`attrs[${slug}]`] = list.join(',');
    });
  }

  delete query.attrs;
  return query;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseJsonSafe(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(MSG().parse || 'پاسخ سرور قابل پردازش نیست.', res.status, { isParse: true });
  }
}

async function _tryRefresh() {
  try {
    const res = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return false;
    const json = await parseJsonSafe(res);
    const mapped = mapResponse(json, res.status);
    if (!mapped.ok) return false;
    auth.persistSession(mapped.data);
    return true;
  } catch {
    return false;
  }
}

async function request(method, path, body = null, queryParams = {}, options = {}) {
  const retries = options.retries ?? API().retries ?? 0;
  const timeout = API().timeout ?? 30000;
  let attempt = 0;
  while (true) {
    try {
      return await _requestOnce(method, path, body, queryParams, options, timeout);
    } catch (err) {
      const retryable = err instanceof ApiError && (err.isNetwork || err.isServer || err.isTimeout);
      if (!retryable || attempt >= retries) throw err;
      attempt++;
      await sleep(API().retryDelay ?? 600);
    }
  }
}

async function _requestOnce(method, path, body, queryParams, options, timeout) {
  const url = buildUrl(path, queryParams);
  const headers = { Accept: 'application/json' };

  const isFormData = body instanceof FormData;
  if (body && !isFormData) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body: body ? (isFormData ? body : JSON.stringify(body)) : null,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      const e = new ApiError(MSG().timeout || 'زمان درخواست به پایان رسید.', 0, { isTimeout: true });
      emitError(e);
      throw e;
    }
    const e = new ApiError(MSG().network || 'خطا در اتصال به سرور.', 0, { isNetwork: true });
    emitError(e);
    throw e;
  } finally {
    clearTimeout(timer);
  }

  if (
    res.status === 401 && API().autoRefresh !== false &&
    !options.skipRefresh && !path.includes('/auth/login') && !path.includes('/auth/otp/')
  ) {
    const refreshed = await _tryRefresh();
    if (refreshed) {
      return _requestOnce(method, path, body, queryParams, { ...options, skipRefresh: true }, timeout);
    }
    auth.clearSession();
    emitUnauthorized();
  }

  if (res.status === 204) {
    const empty = mapResponse(null, 204);
    return options.full ? empty : null;
  }

  const json = await parseJsonSafe(res);
  const mapped = mapResponse(json, res.status);

  if (!res.ok || !mapped.ok) {
    const err = new ApiError(
      mapped.message || defaultMessage(res.status),
      res.status,
      { errors: mapped.errors, raw: json },
    );
    emitError(err);
    throw err;
  }

  return options.full ? mapped : mapped.data;
}

async function withFallback(promise, fallback) {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof ApiError && (err.isNetwork || err.isServer || err.isTimeout || err.isNotFound)) {
      return fallback;
    }
    throw err;
  }
}

const get = (path, q, opts) => request('GET', path, null, q, opts);
const post = (path, body, opts) => request('POST', path, body, {}, opts);
const put = (path, body, opts) => request('PUT', path, body, {}, opts);
const patch = (path, body, opts) => request('PATCH', path, body, {}, opts);
const del = (path, opts) => request('DELETE', path, null, {}, opts);
const upload = (path, form, opts) => request('POST', path, form, {}, opts);

let cartStore = null;

function getCartStore() {
  if (!cartStore) {
    cartStore = createCartStore({
      get,
      post,
      patch,
      del,
      withFallback,
      fetchProduct: (id) => get(`/products/${id}`),
    });
  }
  return cartStore;
}

async function afterAuthSession(data) {
  auth.persistSession(data);
  try {
    await getCartStore().mergeGuestIfNeeded();
  } catch (_) { /* merge failure should not block login */ }
  return data;
}

const authApi = {
  register: async (data) => afterAuthSession(await post('/auth/register', data)),
  login: async (phone, password) => afterAuthSession(await post('/auth/login', { phone, password })),
  adminLogin: async (phone, password) => {
    const data = await post('/auth/admin-login', { phone, password });
    auth.persistSession(data);
    auth.role.set('admin');
    return data;
  },
  otpRequest: (phone, purpose = 'login') => post('/auth/otp/request', { phone, purpose }),
  otpVerify: async (phone, code, purpose = 'login', extras = {}) => {
    const body = { phone, code, purpose, ...extras };
    return afterAuthSession(await post('/auth/otp/verify', body));
  },
  me: () => get('/auth/me'),
  refresh: async () => auth.persistSession(await post('/auth/refresh')),
  logout: async () => {
    try {
      await post('/auth/logout', {}, { skipRefresh: true });
    } catch (_) { /* noop */ }
    auth.clearSession();
  },
  validateSession: async () => {
    try {
      const user = await get('/auth/me');
      auth.persistSession({ user });
      return true;
    } catch {
      auth.clearSession();
      return false;
    }
  },
  isLoggedIn: () => auth.isLoggedIn(),
  isAdmin: () => auth.role.isAdmin(),
  currentUser: () => auth.getCurrentUser(),
};

const settings = {
  get: () => withFallback(get('/settings'), CFG().fallback?.settings ?? null),
  adminGet: () => get('/admin/settings'),
  adminUpdate: (data) => patch('/admin/settings', data),
  uploadImage: (type, file) => {
    const form = new FormData();
    form.append('image', file);
    return upload(`/admin/settings/upload/${type}`, form);
  },
  paymentInfo: async () => {
    const s = await settings.get();
    if (!s) return null;
    return {
      bankCard: s.bank_card ?? '',
      bankOwner: s.bank_owner ?? '',
      method: s.payment_method ?? 'card',
    };
  },
};

const users = {
  getProfile: () => get('/users/me'),
  updateProfile: (data) => patch('/users/me', data),
  changePassword: (cp, np) => put('/users/me/password', { current_password: cp, new_password: np }),
  getAddresses: () => get('/users/me/addresses'),
  addAddress: (data) => post('/users/me/addresses', data),
  updateAddress: (id, data) => patch(`/users/me/addresses/${id}`, data),
  deleteAddress: (id) => del(`/users/me/addresses/${id}`),
  list: () => get('/admin/users'),
  all: () => get('/admin/users'),
  updateRole: (id, role) => patch(`/admin/users/${id}/role`, { role }),
  delete: (id) => patch(`/admin/users/${id}/deactivate`),
  activate: (id) => patch(`/admin/users/${id}/activate`),
  deactivate: (id) => patch(`/admin/users/${id}/deactivate`),
};

const products = {
  list: (filters = {}, opts = {}) => withFallback(
    get('/products', serializeProductFilters(filters), opts),
    CFG().fallback?.products ?? { data: [], facets: [], price_range: { min: 0, max: 0, step: 1 } },
  ),
  featured: (limit = 8) => withFallback(get('/products/featured', { limit }), CFG().fallback?.products ?? []),
  get: (id) => get(`/products/${id}`),
  create: (data) => post('/admin/products', data),
  update: (id, data) => put(`/admin/products/${id}`, data),
  delete: (id) => del(`/admin/products/${id}`),
  toggle: (id) => patch(`/admin/products/${id}/toggle`),
  addImage: (id, file, meta = {}) => {
    const form = new FormData();
    form.append('image', file);
    if (meta.alt_text !== undefined) form.append('alt_text', meta.alt_text);
    if (meta.is_main !== undefined) form.append('is_main', meta.is_main);
    if (meta.sort_order !== undefined) form.append('sort_order', meta.sort_order);
    return upload(`/admin/products/${id}/images`, form);
  },
  uploadImage: (id, file, isMain = false, sortOrder = 0) => {
    const form = new FormData();
    form.append('image', file);
    form.append('is_main', isMain ? 1 : 0);
    form.append('sort_order', sortOrder);
    return upload(`/admin/products/${id}/images`, form);
  },
  setMainImage: (id, imageId) => patch(`/admin/products/${id}/images/${imageId}`),
  deleteImage: (id, imageId) => del(`/admin/products/${id}/images/${imageId}`),
  listAttributeTypes: () => get('/admin/attribute-types'),
  addAttributeValue: (typeId, data) => post(`/admin/attribute-types/${typeId}/values`, data),
  generateVariants: (id, axes) => post(`/admin/products/${id}/variants/generate`, { axes }),
  previewGenerate: (id, axes) => post(`/admin/products/${id}/variants/preview`, { axes }),
  bulkUpdateVariants: (id, variants) => put(`/admin/products/${id}/variants/bulk`, { variants }),
  bulkInventory: (id, payload) => post(`/admin/products/${id}/variants/bulk-inventory`, payload),
  updateVariant: (id, data) => put(`/admin/variants/${id}`, data),
  listAxes: (id) => get(`/admin/products/${id}/axes`),
  createAxis: (id, data) => post(`/admin/products/${id}/axes`, data),
  createAxisWithAssignment: (id, data) => post(`/admin/products/${id}/axes/with-assignment`, data),
  updateAxis: (id, axisId, data) => put(`/admin/products/${id}/axes/${axisId}`, data),
  deleteAxis: (id, axisId) => del(`/admin/products/${id}/axes/${axisId}`),
  createAxisValue: (id, axisId, data) => post(`/admin/products/${id}/axes/${axisId}/values`, data),
  updateAxisValue: (id, axisId, valueId, data) => put(`/admin/products/${id}/axes/${axisId}/values/${valueId}`, data),
  deleteAxisValue: (id, axisId, valueId) => del(`/admin/products/${id}/axes/${axisId}/values/${valueId}`),
  mergeAxisValues: (id, axisId, keepId, loseId) => post(`/admin/products/${id}/axes/${axisId}/merge`, { keep_value_id: keepId, lose_value_id: loseId }),
};

const categories = {
  list: () => withFallback(get('/categories'), CFG().fallback?.categories ?? []),
  get: (id) => get(`/categories/${id}`),
  bySlug: (slug) => get(`/categories/slug/${slug}`),
  create: (data) => post('/admin/categories', data),
  update: (id, data) => put(`/admin/categories/${id}`, data),
  delete: (id) => del(`/admin/categories/${id}`),
  uploadPoster: (id, file) => {
    const form = new FormData();
    form.append('poster', file);
    return upload(`/admin/categories/${id}/poster`, form);
  },
  getImages: (id) => get(`/admin/categories/${id}/images`),
  addImage: (id, file, meta = {}) => {
    const form = new FormData();
    form.append('image', file);
    if (meta.alt_text !== undefined) form.append('alt_text', meta.alt_text);
    if (meta.is_main !== undefined) form.append('is_main', meta.is_main);
    if (meta.sort_order !== undefined) form.append('sort_order', meta.sort_order);
    return upload(`/admin/categories/${id}/images`, form);
  },
  setMainImage: (id, imageId) => patch(`/admin/categories/${id}/images/${imageId}`),
  deleteImage: (id, imageId) => del(`/admin/categories/${id}/images/${imageId}`),
};

const cart = {
  get: () => getCartStore().get(),
  add: (productId, qty = 1, variantId = null) => getCartStore().add(productId, qty, variantId),
  update: (productId, qty, variantId = null) => getCartStore().update(productId, qty, variantId),
  remove: (productId, variantId = null) => getCartStore().remove(productId, variantId),
  clear: () => getCartStore().clear(),
  applyDiscount: (code) => getCartStore().applyDiscount(code),
  mergeGuestIfNeeded: () => getCartStore().mergeGuestIfNeeded(),
};

const orders = {
  place: (data) => post('/orders', data),
  create: (data) => post('/orders', data),
  list: () => get('/orders'),
  get: (id) => get(`/orders/${id}`),
  byNumber: (number) => get(`/orders/number/${number}`),
  cancel: (id) => patch(`/orders/${id}/cancel`),
  adminList: (params = {}) => get('/admin/orders', params),
  adminGet: (id) => get(`/admin/orders/${id}`),
  updateStatus: (id, status, cancelReason) => patch(`/admin/orders/${id}/status`, {
    status,
    ...(cancelReason ? { cancel_reason: cancelReason } : {}),
  }),
};

const discounts = {
  validate: (code, total) => get('/discounts/validate', { code, total }),
  list: () => get('/admin/discounts'),
  active: () => get('/admin/discounts/active'),
  create: (data) => post('/admin/discounts', data),
  update: (id, data) => put(`/admin/discounts/${id}`, data),
  deactivate: (id) => patch(`/admin/discounts/${id}/deactivate`),
  delete: (id) => del(`/admin/discounts/${id}`),
};

const sizeGuides = {
  list: () => withFallback(get('/admin/size'), []),
  get: (id) => get(`/admin/size/${id}`),
  create: (data) => post('/admin/size', data),
  update: (id, data) => put(`/admin/size/${id}`, data),
  delete: (id) => del(`/admin/size/${id}`),
};

const promoBanners = {
  list: () => withFallback(get('/promo-banners'), null),
  adminList: () => get('/admin/promo-banners'),
  create: (file, title = '') => {
    const form = new FormData();
    form.append('image', file);
    if (title) form.append('title', title);
    return upload('/admin/promo-banners', form);
  },
  update: (id, data) => put(`/admin/promo-banners/${id}`, data),
  reorder: (ids) => patch('/admin/promo-banners/reorder', { ids }),
  delete: (id) => del(`/admin/promo-banners/${id}`),
};

const payment = {
  initiate: (orderId) => post('/payment/initiate', { order_id: orderId }),
  verify: (params) => get('/payment/verify', params),
};

const heroSlides = {
  list: () => withFallback(get('/hero-slides'), null),
  adminList: () => get('/admin/hero-slides'),
  create: (file) => {
    const form = new FormData();
    form.append('image', file);
    return upload('/admin/hero-slides', form);
  },
  update: (id, data) => put(`/admin/hero-slides/${id}`, data),
  reorder: (ids) => patch('/admin/hero-slides/reorder', { ids }),
  delete: (id) => del(`/admin/hero-slides/${id}`),
};

const dashboard = {
  overview: () => get('/admin/dashboard'),
  stats: () => get('/admin/dashboard/stats'),
  recentOrders: (limit = 10) => get('/admin/dashboard/orders/recent', { limit }),
  ordersByStatus: () => get('/admin/dashboard/orders/by-status'),
  lowStock: (threshold = 5) => get('/admin/dashboard/products/low-stock', { threshold }),
  topProducts: (limit = 10) => get('/admin/dashboard/products/top', { limit }),
  revenue: (days = 7) => get('/admin/dashboard/revenue', { days }),
};

const utils = {
  formatPrice,
  toast,
  attachPriceFormatter,
};

const api = {
  auth: authApi,
  settings,
  users,
  products,
  categories,
  cart,
  orders,
  payment,
  discounts,
  sizeGuides,
  promoBanners,
  heroSlides,
  dashboard,
  utils,
  token: auth.token,
  refreshToken: auth.refreshToken,
  role: auth.role,
  request,
  get,
  post,
  put,
  patch,
  del,
  upload,
  ApiError,
  mapResponse,
  mapPagination,
  mapError: (err) => {
    if (err instanceof ApiError) return err;
    return new ApiError(err?.message || MSG().unknown, err?.status || 0, { isNetwork: true });
  },
  withFallback,
  serializeProductFilters,
  persistSession: auth.persistSession,
  clearSession: auth.clearSession,
};

export default api;
