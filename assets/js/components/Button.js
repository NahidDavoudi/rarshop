import { storeConfig } from '../config/bootstrap.js';
import { escapeAttr } from '../utils/htmlEscape.js';

/**
 * Button — کامپوننت دکمه‌ی انعطاف‌پذیر
 *
 * variant: aluminum | glass | outline | ghost | soft | danger | dangerOutline | success
 * size:    xs | sm | md | lg | icon
 *
 * نمونه:
 *   Button.render({ label: 'ذخیره', action: 'save' })
 *   Button.render({ variant: 'danger', size: 'xs', label: 'حذف', action: 'delete' })
 *   Button.render({ variant: 'outline', label: 'بازگشت', href: '#/shop' })
 *   Button.render({ label: 'ثبت', icon: '<i data-lucide="check"></i>', fullWidth: true })
 *
 * اتصال رویداد (یک بار، روی container):
 *   Button.bind(container, {
 *     save: async (e, btn) => { await api.save(); },   // Promise => خودکار loading
 *     delete: (e, btn) => confirmDelete(),
 *   });
 */

// aluminum و glass از کلاس‌های CSS خود پروژه (.btn + btn-*) استفاده می‌کنن
const LEGACY_SIZES = {
  xs: 'btn-sm text-xs',
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
  icon: 'btn-icon',
};

// بقیه‌ی variantها مستقل از CSS سفارشی و فقط با Tailwind ساخته می‌شن
const BASE =
  'inline-flex items-center justify-center gap-2 font-medium transition-colors '
  + 'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 '
  + 'disabled:opacity-40 disabled:pointer-events-none';

const VARIANTS = {
  outline: 'border border-border text-body hover:border-accent hover:text-accent bg-transparent',
  ghost: 'text-muted hover:text-body hover:bg-accent/10',
  soft: 'bg-accent/10 text-accent hover:bg-accent/20',
  danger: 'bg-red-600 text-white border border-red-600 hover:bg-red-700',
  dangerOutline: 'border border-red-500/30 text-red-500 hover:bg-red-500/10',
  success: 'bg-green-600 text-white border border-green-600 hover:bg-green-700',
};

const SIZES = {
  xs: 'text-xs px-3 py-1.5 rounded-lg',
  sm: 'text-sm px-3.5 py-2 rounded-lg',
  md: 'text-sm px-5 py-2.5 rounded-xl',
  lg: 'text-base px-6 py-3 rounded-xl',
  icon: 'w-9 h-9 rounded-full p-0',
};

const SPINNER =
  '<span class="btn-spinner hidden w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" aria-hidden="true"></span>';

function buildAttrs(attrs = {}) {
  return Object.entries(attrs)
    .filter(([, v]) => v !== false && v != null)
    .map(([k, v]) => (v === true ? k : `${k}="${escapeAttr(v)}"`))
    .join(' ');
}

const Button = {
  render({
    variant = 'aluminum',
    label = '',
    href = null,
    type = 'button',
    size = 'md',
    className = '',
    icon = '',
    iconPosition = 'start', // start | end
    disabled = false,
    loading = false,
    fullWidth = false,
    action = '',
    attrs = {},
  } = {}) {
    const isLegacy = variant === 'aluminum' || variant === 'glass';

    let styleClasses;
    if (isLegacy) {
      const ui = storeConfig.ui;
      const variantClass = variant === 'glass' ? ui.btnGlass : ui.btnAluminum;
      styleClasses = `btn ${variantClass} ${LEGACY_SIZES[size] || LEGACY_SIZES.md}`;
    } else {
      styleClasses = `${BASE} ${VARIANTS[variant] || VARIANTS.outline} ${SIZES[size] || SIZES.md}`;
    }

    const isDisabled = disabled || loading;
    const classes = [
      styleClasses,
      fullWidth ? 'w-full' : '',
      isDisabled && href ? 'pointer-events-none opacity-40' : '',
      className,
    ].filter(Boolean).join(' ');

    const labelHtml = label !== '' ? `<span>${label}</span>` : '';
    const iconStart = icon && iconPosition !== 'end' ? icon : '';
    const iconEnd = icon && iconPosition === 'end' ? icon : '';
    const spinner = SPINNER.replace('hidden ', loading ? '' : 'hidden ');

    const inner = `<span class="btn-inner flex items-center justify-center gap-2">${spinner}${iconStart}${labelHtml}${iconEnd}</span>`;

    const common = [
      'data-btn',
      action ? `data-action="${escapeAttr(action)}"` : '',
      isDisabled ? 'aria-disabled="true"' : '',
      loading ? 'aria-busy="true"' : '',
      buildAttrs(attrs),
    ].filter(Boolean).join(' ');

    if (href) {
      const isHash = href.startsWith('#');
      const isExternal = /^https?:\/\//i.test(href);
      const linkAttrs = [
        isHash ? 'data-link' : '',
        isExternal ? 'target="_blank" rel="noopener noreferrer"' : '',
        isDisabled ? 'tabindex="-1"' : '',
      ].filter(Boolean).join(' ');
      return `<a href="${escapeAttr(href)}" ${linkAttrs} class="${classes}" ${common}>${inner}</a>`;
    }

    const disabledAttr = isDisabled ? 'disabled' : '';
    return `<button type="${escapeAttr(type)}" class="${classes}" ${disabledAttr} ${common}>${inner}</button>`;
  },

  /**
   * اتصال handlerها با event delegation (فقط یک listener روی container).
   * اگه handler یک Promise برگردونه، دکمه تا پایان کار در حالت loading می‌مونه.
   * صدا زدن دوباره‌ی bind روی همون container فقط callbackها رو عوض می‌کنه.
   */
  bind(container, callbacks = {}) {
    if (!container) return;
    container._btnCallbacks = callbacks;
    if (container._btnBound) return;
    container._btnBound = true;

    container.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-btn][data-action]');
      if (!btn || !container.contains(btn)) return;
      if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;

      const handler = container._btnCallbacks?.[btn.dataset.action];
      if (typeof handler !== 'function') return;

      const result = handler(e, btn);
      if (result && typeof result.then === 'function') {
        Button.setLoading(btn, true);
        try {
          await result;
        } catch (err) {
          console.error('[Button] action failed:', btn.dataset.action, err);
        } finally {
          if (btn.isConnected) Button.setLoading(btn, false);
        }
      }
    });
  },

  // disabled و aria-disabled رو هماهنگ نگه می‌داره
  setDisabled(btn, disabled) {
    if (!btn) return;
    btn.disabled = disabled;
    btn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  },

  // حالت loading: اسپینر نشون می‌ده و دکمه رو غیرفعال می‌کنه
  setLoading(btn, loading) {
    if (!btn) return;
    Button.setDisabled(btn, loading);
    btn.toggleAttribute('aria-busy', loading);
    btn.querySelector('.btn-spinner')?.classList.toggle('hidden', !loading);
  },

  // تغییر برچسب دکمه بعد از رندر
  setLabel(btn, label) {
    const el = btn?.querySelector('.btn-inner > span:not(.btn-spinner)');
    if (el) el.textContent = label;
  },
};

export default Button;