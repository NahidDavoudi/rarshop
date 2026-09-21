/**
 * admin/admin.js — Admin panel entry (ES module)
 */
import { initConfig } from '../config/bootstrap.js';
import { initTheme } from '../core/theme.js';
import loadStoreSettings from '../core/storeSettings.js';
import api from '../core/api.js';
import { installAdminHelpers } from '../utils/helpers.js';
import { attachPriceFormatter } from '../utils/priceFormatter.js';
import { applyAdminBranding, getAdminText } from './branding.js';

initConfig();
installAdminHelpers();

window.API = api;
window.Api = api;
window.attachPriceFormatter = attachPriceFormatter;

window.getAdminText = getAdminText;

window.toggleSidebar = () => {
  document.getElementById('sidebar')?.classList.toggle('translate-x-full');
  document.getElementById('mobileOverlay')?.classList.toggle('hidden');
};

window.closeSidebar = () => {
  document.getElementById('sidebar')?.classList.add('translate-x-full');
  document.getElementById('mobileOverlay')?.classList.add('hidden');
};

const sessionOk = await api.auth.validateSession();
if (!sessionOk || !api.auth.isAdmin()) {
  location.replace('login.html');
}

await Promise.all([
  import('./pages/dashboard.js'),
  import('./pages/products.js'),
  import('./pages/categories.js'),
  import('./pages/orders.js'),
  import('./pages/users.js'),
  import('./pages/discounts.js'),
  import('./pages/sizeGuides.js'),
  import('./pages/promoBanners.js'),
  import('./pages/heroSlides.js'),
  import('./pages/settings.js'),
  import('./pages/pages.js'),
]);

const _user = api.auth.currentUser();
const _el = document.getElementById('sidebarUsername');
if (_el) _el.textContent = _user?.name || _user?.phone || 'ادمین';

const PAGE_LOADERS = {
  dashboard: window.loadDashboard,
  products: window.loadProducts,
  categories: window.loadCategories,
  orders: window.loadOrders,
  users: window.loadUsers,
  discounts: window.loadDiscounts,
  sizeGuides: window.loadSizeGuides,
  promoBanners: window.loadPromoBanners,
  heroSlides: window.loadHeroSlides,
  settings: window.loadSettings,
  pages: window.loadPages,
};

window.switchPage = function (name, linkEl) {
  document.querySelectorAll('.page-section').forEach((s) => s.classList.add('hidden'));
  document.getElementById(`page-${name}`)?.classList.remove('hidden');

  document.querySelectorAll('.nav-link').forEach((a) =>
    a.classList.remove('admin-nav-active'));
  if (linkEl) linkEl.classList.add('admin-nav-active');

  window.closeSidebar();
  PAGE_LOADERS[name]?.();
  location.hash = name;
};

window.handleLogout = () => api.auth.logout();

async function bootAdmin() {
  await loadStoreSettings(api);
  initTheme();
  applyAdminBranding();
  if (window.lucide) lucide.createIcons();
  attachPriceFormatter('productPrice');
  const page = location.hash.replace('#', '') || 'dashboard';
  const navLink = document.querySelector(`.nav-link[onclick*="${page}"]`);
  window.switchPage(page, navLink);
}

bootAdmin();
