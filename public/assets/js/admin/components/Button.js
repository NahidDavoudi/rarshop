import { escapeAttr } from '../../utils/htmlEscape.js';

/**
 * admin/components/Button.js — دکمه‌ی استاندارد پنل مدیریت
 * هم‌خانواده‌ی components/Button.js فروشگاه (همان API)، بدون وابستگی به CSS فروشگاه.
 *
 * variant: primary | secondary | outline | ghost | ghostAccent | ghostDanger | soft | danger | dangerOutline | success | none
 * size:    xs | sm | md | lg | icon | iconSm | none
 *
 * نمونه‌ها:
 *   Button.render({ variant: 'primary', label: 'ذخیره', attrs: { id: 'fullPageSave' } })
 *   Button.render({ variant: 'soft', size: 'sm', label: 'حذف', attrs: { onclick: "deleteItem(1)" } })
 *   Button.render({ variant: 'ghostAccent', size: 'icon', icon: '<i data-lucide="trash-2" class="w-4 h-4"></i>', attrs: { title: 'حذف' } })
 *   Button.render({ variant: 'secondary', size: 'xs', className: 'rounded-full', label: 'نمایش غیرفعال‌ها' })
 *
 * اتصال رویداد با delegation (یک listener روی container) — مثل فروشگاه:
 *   Button.bind(container, { save: async (e, btn) => { ... } })  // Promise => loading خودکار
 *
 * نکته: هر جا wiring قدیمی (onclick یا delegation پروژه) وجود دارد، همان با attrs/دیتا-اتریبیوت حفظ شده
 * تا رفتار فعلی دست نخورد؛ فقط ظاهر و ساختار دکمه استاندارد می‌شود.
 */

const BASE =
  'admin-btn inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap select-none '
  + 'cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 '
  + 'disabled:opacity-40 disabled:pointer-events-none';

const VARIANTS = {
  primary: 'bg-accent hover:bg-accent-hover text-white border border-transparent',
  secondary: 'bg-surface hover:bg-card text-muted hover:text-body border border-border',
  outline: 'bg-transparent border border-border text-body hover:border-accent hover:text-accent',
  ghost: 'text-muted hover:text-body hover:bg-surface border border-transparent',
  ghostAccent: 'text-accent hover:bg-accent/10 border border-transparent',
  ghostDanger: 'text-red-600 hover:bg-red-500/10 border border-transparent',
  soft: 'bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 hover:border-accent/60',
  danger: 'bg-red-600 text-white border border-red-600 hover:bg-red-700',
  dangerOutline: 'border border-red-500/30 text-red-600 hover:bg-red-500/10 bg-transparent',
  success: 'bg-green-600 text-white border border-green-600 hover:bg-green-700',
  none: '', // استایل کاملاً سفارشی از طریق className
};

const SIZES = {
  xs: 'min-h-[36px] px-3 py-1.5 text-xs rounded-lg',
  sm: 'min-h-[40px] px-4 py-2 text-sm rounded-xl',
  md: 'min-h-[44px] px-5 py-2.5 text-sm rounded-xl',
  lg: 'min-h-[48px] px-6 py-3 text-base rounded-xl',
  icon: 'w-9 h-9 rounded-xl p-0',
  iconSm: 'w-7 h-7 rounded-lg p-0',
  none: '', // بدون سایز پیش‌فرض — caller خودش می‌دهد
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
    variant = 'secondary',
    label = '',
    href = null,
    type = 'button',
    size = 'sm',
    className = '',
    icon = '',
    iconPosition = 'start', // start | end
    disabled = false,
    loading = false,
    fullWidth = false,
    action = '',
    attrs = {},
  } = {}) {
    const styleClasses = [
      VARIANTS[variant] != null ? VARIANTS[variant] : VARIANTS.secondary,
      SIZES[size] != null ? SIZES[size] : SIZES.sm,
    ].filter(Boolean).join(' ');

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

    const inner = `<span class="btn-inner flex items-center justify-center gap-1.5">${spinner}${iconStart}${labelHtml}${iconEnd}</span>`;

    const common = [
      'data-btn',
      action ? `data-action="${escapeAttr(action)}"` : '',
      isDisabled ? 'aria-disabled="true"' : '',
      loading ? 'aria-busy="true"' : '',
      buildAttrs(attrs),
    ].filter(Boolean).join(' ');

    if (href) {
      const isExternal = /^https?:\/\//i.test(href);
      const linkAttrs = [
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
   * اگر handler یک Promise برگرداند، دکمه تا پایان کار در حالت loading می‌ماند.
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

  setDisabled(btn, disabled) {
    if (!btn) return;
    btn.disabled = disabled;
    btn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  },

  setLoading(btn, loading) {
    if (!btn) return;
    Button.setDisabled(btn, loading);
    btn.toggleAttribute('aria-busy', loading);
    btn.querySelector('.btn-spinner')?.classList.toggle('hidden', !loading);
  },

  setLabel(btn, label) {
    const el = btn?.querySelector('.btn-inner > span:not(.btn-spinner)');
    if (el) el.textContent = label;
  },
};

export default Button;
