/**
 * core/router.js — Navigo hash router with auth guards
 */
import { storeConfig } from '../config/bootstrap.js';
import auth from './auth.js';
import { pageTitle, setMetaDescription } from './theme.js';

const AUTH_ROUTES = new Set(['/checkout', '/payment', '/orders', '/profile']);

const ROUTES = [
  { path: '/', page: 'home', script: 'home', title: () => storeConfig.name },
  { path: '/shop', page: 'shop', script: 'shop', title: () => `فروشگاه | ${storeConfig.name}` },
  { path: '/product', page: 'product', script: 'products', title: () => storeConfig.name },
  { path: '/categories', page: 'categories', script: 'categories', title: () => `دسته‌بندی‌ها | ${storeConfig.name}` },
  { path: '/cart', page: 'cart', script: 'cart', title: () => `سبد خرید | ${storeConfig.name}` },
  { path: '/checkout', page: 'checkout', script: 'checkout', title: () => `تکمیل سفارش | ${storeConfig.name}` },
  { path: '/payment', page: 'payment', script: 'payment', title: () => `پرداخت | ${storeConfig.name}` },
  { path: '/payment/result', page: 'payment_result', script: 'payment-result', title: () => `نتیجه پرداخت | ${storeConfig.name}` },
  { path: '/orders', page: 'orders', script: 'orders', title: () => `سفارشات | ${storeConfig.name}`, meta: () => '' },
  { path: '/profile', page: 'profile', script: 'profile', title: () => `پروفایل | ${storeConfig.name}`, meta: () => '' },
  { path: '/about', page: 'about', script: 'about', title: () => `درباره ما | ${storeConfig.name}`, meta: () => storeConfig.texts.legal?.about?.meta || '' },
  { path: '/contact', page: 'contact', script: 'contact', title: () => `تماس با ما | ${storeConfig.name}`, meta: () => storeConfig.texts.legal?.contact?.meta || '' },
  { path: '/terms', page: 'terms', script: 'terms', title: () => `قوانین و مقررات | ${storeConfig.name}`, meta: () => storeConfig.texts.legal?.terms?.meta || '' },
  { path: '/privacy', page: 'privacy', script: 'privacy', title: () => `حریم خصوصی | ${storeConfig.name}`, meta: () => storeConfig.texts.legal?.privacy?.meta || '' },
  { path: '/refund', page: 'refund', script: 'refund', title: () => `شرایط بازگشت وجه و لغو سفارش | ${storeConfig.name}`, meta: () => storeConfig.texts.legal?.refund?.meta || '' },
  { path: '/faq', page: 'faq', script: 'faq', title: () => `سوالات متداول | ${storeConfig.name}`, meta: () => storeConfig.texts.legal?.faq?.meta || '' },
];

const pageHandlers = new Map();
let navigo = null;

function parseQueryFromHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [, qs = ''] = raw.split('?');
  return Object.fromEntries(new URLSearchParams(qs));
}

function showPage(pageKey) {
  document.querySelectorAll('[data-page]').forEach((el) => el.classList.remove('active'));
  const target = document.querySelector(`[data-page="${pageKey}"]`);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

function runPageHandler(script, params) {
  const fn = pageHandlers.get(script);
  if (typeof fn === 'function') fn(params);
}

function handleRoute(route, match) {
  const path = route.path === '/' ? '/' : route.path;

  if (AUTH_ROUTES.has(path) && !auth.isLoggedIn()) {
    window.location.href = 'login.html?redirect=' + encodeURIComponent('index.html' + location.hash);
    return;
  }

  const params = { ...parseQueryFromHash(), ...(match?.data || {}) };
  pageTitle(route.title());
  if (route.meta) setMetaDescription(route.meta());
  showPage(route.page);
  runPageHandler(route.script, params);

  if (window.lucide) {
    requestAnimationFrame(() => lucide.createIcons());
  }
}

export function onEnter(name, fn) {
  pageHandlers.set(name, fn);
}

export function go(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const hash = qs ? `#${path}?${qs}` : `#${path}`;
  if (location.hash !== hash) {
    location.hash = hash;
  } else if (navigo) {
    navigo.resolve();
  }
}

export function current() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path] = raw.split('?');
  return { path: path || '/', params: parseQueryFromHash() };
}

export function initRouter() {
  if (!window.Navigo) {
    console.warn('[Router] Navigo not loaded — falling back to hashchange');
    _initFallbackRouter();
    return;
  }

  navigo = new Navigo('/', { hash: true, strategy: 'ONE' });

  ROUTES.forEach((route) => {
    navigo.on(route.path, (match) => handleRoute(route, match));
  });

  navigo.notFound(() => navigo.navigate('/'));
  navigo.resolve();

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-link], a[href^="#/"]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href === '#' || !href.startsWith('#/')) return;
  });
}

function _initFallbackRouter() {
  const routeMap = Object.fromEntries(ROUTES.map((r) => [r.path, r]));
  routeMap[''] = ROUTES[0];

  function navigate() {
    const { path, params } = current();
    const route = routeMap[path] || routeMap['/'];
    handleRoute(route, { data: params });
  }

  window.addEventListener('hashchange', navigate);
  if (!location.hash) location.replace('#/');
  else navigate();
}

const Router = { onEnter, go, current, init: initRouter };
export default Router;