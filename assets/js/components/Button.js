import { storeConfig } from '../config/bootstrap.js';

const SIZES = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
  icon: 'btn-icon',
};

const Button = {
  render({
    variant = 'aluminum',
    label = '',
    href = null,
    type = 'button',
    size = 'md',
    className = '',
    icon = '',
    disabled = false,
    attrs = {},
  } = {}) {
    const ui = storeConfig.ui;
    const variantClass = variant === 'glass' ? ui.btnGlass : ui.btnAluminum;
    const sizeClass = SIZES[size] || SIZES.md;
    const disabledAttr = disabled ? 'disabled aria-disabled="true"' : '';
    const extraAttrs = Object.entries(attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');

    const content = icon
      ? `<span class="btn-inner flex items-center justify-center gap-2">${icon}<span>${label}</span></span>`
      : `<span class="btn-inner">${label}</span>`;

    const classes = `btn ${variantClass} ${sizeClass} ${className}`.trim();

    if (href) {
      const linkAttrs = href.startsWith('#') ? 'data-link' : '';
      return `<a href="${href}" ${linkAttrs} class="${classes}" ${disabledAttr} ${extraAttrs}>${content}</a>`;
    }

    return `<button type="${type}" class="${classes}" ${disabledAttr} ${extraAttrs}>${content}</button>`;
  },

  bind(container, callbacks = {}) {
    container.querySelectorAll('.btn[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
        const action = btn.dataset.action;
        callbacks[action]?.(e, btn);
      });
    });
  },

  // Keeps the native `disabled` property and the `aria-disabled` attribute
  // (baked into the initial render() output) in sync. Use this everywhere
  // a button's disabled state changes dynamically after render — setting
  // `btn.disabled` alone leaves the stale aria-disabled="true" attribute
  // in place, which Button.bind()'s click guard (and any aria-disabled-based
  // CSS) will keep honoring forever.
  setDisabled(btn, disabled) {
    if (!btn) return;
    btn.disabled = disabled;
    btn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  },
};

export default Button;