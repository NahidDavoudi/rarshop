/**
 * utils/helpers.js — shared UI helpers (toast, DOM shortcuts)
 */
import defaultStoreConfig from '../config/store.config.js';
import { escapeHtml, escapeAttr } from './htmlEscape.js';

const TOAST_TYPES = new Set(['success', 'error', 'warning', 'info']);

export function toast(msg, type = 'success', duration = 3000) {
  const resolvedType = TOAST_TYPES.has(type) ? type : 'success';
  const palette = defaultStoreConfig.ui?.toast?.[resolvedType]
    || defaultStoreConfig.ui?.toast?.success
    || { bg: '#16a34a', text: '#ffffff', border: '#15803d' };

  const el = document.createElement('div');
  el.className = `app-toast app-toast--${resolvedType}`;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.style.cssText = [
    'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);',
    `background:${palette.bg};color:${palette.text};`,
    `border:1px solid ${palette.border};`,
    'padding:12px 24px;border-radius:12px;font-size:14px;',
    'box-shadow:0 8px 24px rgba(0,0,0,.25);z-index:9999;',
    'transition:opacity .3s;max-width:min(90vw,420px);',
    'text-align:center;white-space:normal;line-height:1.5;',
    'font-family:var(--font-vazir, Vazirmatn, sans-serif);',
  ].join('');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fa-IR');
}

/** Admin DOM shortcuts — exposed on window for admin pages */
const DEFAULT_STATUS_MAP = {
  pending:   { label: 'در انتظار',       cls: 'bg-yellow-100 text-yellow-800' },
  paid:      { label: 'پرداخت شده',      cls: 'bg-blue-100 text-blue-800' },
  shipped:   { label: 'ارسال شده',       cls: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'تحویل داده شده', cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'لغو شده',         cls: 'bg-card text-muted' },
};

export function refreshStatusMap() {
  window.STATUS_MAP = window.StoreConfig?.texts?.admin?.orderStatuses || DEFAULT_STATUS_MAP;
}

export function installAdminHelpers() {
  window.$ = (id) => document.getElementById(id);
  window.show = (id) => window.$(id)?.classList.remove('hidden');
  window.hide = (id) => window.$(id)?.classList.add('hidden');
  window.setText = (id, v) => { const e = window.$(id); if (e) e.textContent = v; };
  window.getVal = (id) => window.$(id)?.value.trim() ?? '';
  window.toEnDigit = (s) => String(s)
    .replace(/[۰-۹]/g, (d) => d.charCodeAt(0) - 1776)
    .replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 1632);
  window.setLoading = (on) => (on ? window.show('loadingOverlay') : window.hide('loadingOverlay'));
  window.toast = toast;
  window.escapeHtml = escapeHtml;
  window.escapeAttr = escapeAttr;
  window.showModal = (id) => window.$(id)?.classList.remove('hidden');
  window.hideModal = (id) => window.$(id)?.classList.add('hidden');

  // Generic Prompt Modal
  let _promptResolve = null;
  window.showPromptModal = (options) => {
    const modal = window.$('promptModal');
    if (!modal) return Promise.reject(new Error('Prompt modal not found'));
    const {
      title = 'عنوان',
      message = '',
      type = 'text',
      label = '',
      placeholder = '',
      value = '',
      colorValue = '#000000',
    } = options || {};

    modal.querySelector('#promptModalTitle').textContent = title;
    modal.querySelector('#promptModalMessage').textContent = message;

    const inputWrap = modal.querySelector('#promptModalInputWrap');
    const textareaWrap = modal.querySelector('#promptModalTextareaWrap');
    const colorWrap = modal.querySelector('#promptModalColorWrap');
    const input = modal.querySelector('#promptModalInput');
    const textarea = modal.querySelector('#promptModalTextarea');
    const colorInput = modal.querySelector('#promptModalColorInput');

    inputWrap.classList.add('hidden');
    textareaWrap.classList.add('hidden');
    colorWrap.classList.add('hidden');

    if (type === 'textarea') {
      textareaWrap.classList.remove('hidden');
      modal.querySelector('#promptModalTextareaLabel').textContent = label;
      textarea.value = value;
      textarea.placeholder = placeholder;
    } else if (type === 'color') {
      colorWrap.classList.remove('hidden');
      colorInput.value = colorValue;
    } else {
      inputWrap.classList.remove('hidden');
      modal.querySelector('#promptModalLabel').textContent = label;
      input.value = value;
      input.placeholder = placeholder;
    }

    modal.classList.remove('hidden');
    modal.querySelector('input, textarea')?.focus?.();

    return new Promise((resolve) => {
      _promptResolve = resolve;
    });
  };

  window.hidePromptModal = () => {
    const modal = window.$('promptModal');
    if (modal) modal.classList.add('hidden');
    if (_promptResolve) {
      _promptResolve(null);
      _promptResolve = null;
    }
  };

  window.resolvePrompt = (confirmed) => {
    if (!_promptResolve) return;
    const modal = window.$('promptModal');
    let value = null;
    if (modal) {
      const inputWrap = modal.querySelector('#promptModalInputWrap');
      const textareaWrap = modal.querySelector('#promptModalTextareaWrap');
      const isText = inputWrap && !inputWrap.classList.contains('hidden');
      const isTextarea = textareaWrap && !textareaWrap.classList.contains('hidden');
      if (isTextarea) {
        value = modal.querySelector('#promptModalTextarea')?.value.trim() ?? null;
      } else if (isText) {
        value = modal.querySelector('#promptModalInput')?.value.trim() ?? null;
      } else {
        value = modal.querySelector('#promptModalColorInput')?.value ?? null;
      }
    }
    const resolve = _promptResolve;
    _promptResolve = null;
    const m = window.$('promptModal');
    if (m) m.classList.add('hidden');
    resolve(confirmed ? value : null);
  };

  // Generic Confirm Modal
  let _confirmResolve = null;
  window.showConfirmModal = (options) => {
    const modal = window.$('confirmModal');
    if (!modal) return Promise.reject(new Error('Confirm modal not found'));
    const {
      title = 'تأیید',
      message = '',
      icon = 'alert-triangle',
      iconBg = 'bg-amber-100',
      iconColor = 'text-amber-600',
      confirmText = 'تأیید',
      cancelText = 'انصراف',
      confirmClass = 'bg-accent hover:bg-accent-hover',
    } = options || {};

    modal.querySelector('#confirmModalTitle').textContent = title;
    modal.querySelector('#confirmModalMessage').textContent = message;
    const iconEl = modal.querySelector('#confirmModalIconSvg');
    if (iconEl) iconEl.setAttribute('class', `w-6 h-6 ${iconColor}`);
    const iconWrap = modal.querySelector('#confirmModalIcon');
    if (iconWrap) iconWrap.setAttribute('class', `w-12 h-12 rounded-full ${iconBg} flex items-center justify-center mx-auto mb-4`);
    const confirmBtn = modal.querySelector('[data-confirm-btn]');
    const cancelBtn = modal.querySelector('[data-cancel-btn]');
    if (confirmBtn) {
      confirmBtn.textContent = confirmText;
      confirmBtn.className = `flex-1 ${confirmClass} text-white px-6 py-2.5 rounded-xl font-medium transition-all`;
    }
    if (cancelBtn) cancelBtn.textContent = cancelText;

    modal.classList.remove('hidden');

    return new Promise((resolve) => {
      _confirmResolve = resolve;
    });
  };

  window.hideConfirmModal = () => {
    const modal = window.$('confirmModal');
    if (modal) modal.classList.add('hidden');
    if (_confirmResolve) {
      _confirmResolve(false);
      _confirmResolve = null;
    }
  };

  window.resolveConfirm = (confirmed) => {
    if (!_confirmResolve) return;
    const resolve = _confirmResolve;
    _confirmResolve = null;
    const m = window.$('confirmModal');
    if (m) m.classList.add('hidden');
    resolve(!!confirmed);
  };

  refreshStatusMap();

  window.statusBadge = function (s) {
    const m = window.STATUS_MAP[s] || { label: s, cls: 'bg-card text-muted' };
    return `<span class="px-2.5 py-1 rounded-full text-xs font-medium ${m.cls}">${m.label}</span>`;
  };

  window.refreshStatusMap = refreshStatusMap;
}

if (typeof window !== 'undefined') {
  installAdminHelpers();
}
