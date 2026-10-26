/**
 * utils/htmlEscape.js — pure HTML escaping helpers
 */

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch]);
}

export function escapeAttr(value) {
  return escapeHtml(value);
}

export default { escapeHtml, escapeAttr };
