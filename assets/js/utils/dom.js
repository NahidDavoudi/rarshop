/**
 * utils/dom.js — DOM helpers (pure, no layer dependencies)
 */

export const DOM = {
  show(id) { document.getElementById(id)?.classList.remove('hidden'); },
  hide(id) { document.getElementById(id)?.classList.add('hidden'); },

  text(id, t) {
    const el = document.getElementById(id);
    if (el) el.textContent = t;
  },

  hashHref(page, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return qs ? `#/${page}?${qs}` : `#/${page}`;
  },

  reclone(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const fresh = el.cloneNode(true);
    el.parentNode.replaceChild(fresh, el);
    return fresh;
  },
};

export default DOM;
