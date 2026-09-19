/**
 * admin/branding.js — apply store config (theme, texts, logo) to admin panel
 */
import { storeConfig } from '../config/bootstrap.js';
import { pageTitle } from '../core/theme.js';

function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

export function getAdminText(path, fallback = '') {
  const val = getByPath(storeConfig.texts?.admin, path);
  return val != null && typeof val === 'string' ? val : fallback;
}

export function applyAdminBranding() {
  const t = storeConfig.texts?.admin || {};
  pageTitle(t.title || 'پنل مدیریت');

  document.querySelectorAll('[data-admin-text]').forEach((el) => {
    const val = getByPath(t, el.dataset.adminText);
    if (val != null && typeof val === 'string') el.textContent = val;
  });

  document.querySelectorAll('[data-admin-placeholder]').forEach((el) => {
    const val = getByPath(t, el.dataset.adminPlaceholder);
    if (val != null && typeof val === 'string') el.placeholder = val;
  });

  document.querySelectorAll('[data-store-name]').forEach((el) => {
    el.textContent = storeConfig.name;
  });

  document.querySelectorAll('[data-store-logo]').forEach((el) => {
    if (storeConfig.logo) {
      el.src = storeConfig.logo;
      el.alt = storeConfig.name;
    }
  });

  const logoImg = document.getElementById('adminLogo');
  const logoIcon = document.getElementById('adminLogoIcon');
  const logoWrap = document.getElementById('adminLogoWrap');
  if (storeConfig.logo && logoImg) {
    logoImg.src = storeConfig.logo;
    logoImg.alt = storeConfig.name;
    logoImg.classList.remove('hidden');
    logoIcon?.classList.add('hidden');
    logoWrap?.classList.remove('bg-accent');
    logoWrap?.classList.add('bg-surface');
  }

  if (typeof window.refreshStatusMap === 'function') {
    window.refreshStatusMap();
  }
}

export default { applyAdminBranding, getAdminText };
