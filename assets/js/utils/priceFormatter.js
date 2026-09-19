/**
 * utils/priceFormatter.js — pure price formatting helpers
 */

export function toEnDigit(s) {
  return String(s)
    .replace(/[۰-۹]/g, (d) => d.charCodeAt(0) - 1776)
    .replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 1632);
}

export function formatPrice(amount, suffix = ' تومان') {
  const n = Number(amount);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('fa-IR') + suffix;
}

function _bindPriceInput(inp) {
  inp.addEventListener('input', function () {
    const raw = toEnDigit(this.value).replace(/[^0-9]/g, '');
    if (!raw) { this.value = ''; return; }
    this.value = Number(raw).toLocaleString('fa-IR');
  });

  inp.addEventListener('focus', function () {
    const raw = toEnDigit(this.value).replace(/[^0-9]/g, '');
    this.value = raw;
  });

  inp.addEventListener('blur', function () {
    const raw = toEnDigit(this.value).replace(/[^0-9]/g, '');
    if (!raw) { this.value = ''; return; }
    this.value = Number(raw).toLocaleString('fa-IR');
  });
}

export function attachPriceFormatterEl(inp) {
  if (!inp || inp.dataset.priceBound === '1') return;
  inp.dataset.priceBound = '1';
  _bindPriceInput(inp);
}

export function attachPriceFormatter(inputId) {
  attachPriceFormatterEl(document.getElementById(inputId));
}

export function attachPriceFormatterAll(container, selector = '[data-field="price"]') {
  const root = typeof container === 'string' ? document.querySelector(container) : container;
  if (!root) return;
  root.querySelectorAll(selector).forEach(attachPriceFormatterEl);
}

/**
 * Safely parse a price input value to integer.
 * Handles Persian/Arabic digits and formatted strings (e.g. "۱۲,۳۴۵").
 * Returns 0 if the value is empty or invalid.
 */
export function parsePrice(value) {
  const raw = toEnDigit(value || '').replace(/[^0-9]/g, '');
  return parseInt(raw, 10) || 0;
}