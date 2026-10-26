import { storeConfig } from '../config/bootstrap.js';
import { formatPrice } from '../utils/priceFormatter.js';
import { escapeHtml, escapeAttr } from '../utils/htmlEscape.js';
import { isLowStock, formatLowStockMessage } from '../utils/stockHint.js';
import {
  getVisibleAxes,
  applyHiddenAxisDefaults,
  isAxisSelectionComplete,
  getSwatchStyle,
} from '../utils/productVariants.js';
import Button from './Button.js';

function buildValueMap(variant) {
  const map = {};
  (variant.attribute_values || []).forEach((av) => {
    map[av.type_slug] = Number(av.id);
  });
  return map;
}

function findMatchingVariant(variants, variantAxes, selected) {
  const active = (variants || []).filter((v) => Number(v.is_active ?? 1) === 1);
  const axisSlugs = (variantAxes || []).filter((a) => Number(a.is_active ?? 1) === 1).map((a) => a.type_slug);
  if (!axisSlugs.length) {
    return active.find((v) => v.is_default)
      || active[0]
      || null;
  }

  if (!axisSlugs.every((slug) => selected[slug])) return null;

  return variants.find((v) => {
    if (!v.is_active) return false;
    const valueMap = buildValueMap(v);
    return axisSlugs.every((slug) => valueMap[slug] === Number(selected[slug]));
  }) || null;
}

function isValueSelectable(variants, variantAxes, selected, axisSlug, valueId) {
  const axisSlugs = (variantAxes || []).filter((a) => Number(a.is_active ?? 1) === 1).map((a) => a.type_slug);

  return (variants || []).some((v) => {
    if (Number(v.is_active ?? 1) !== 1 || (v.inventory?.quantity ?? 0) <= 0) return false;
    const valueMap = buildValueMap(v);
    if (valueMap[axisSlug] !== Number(valueId)) return false;
    return axisSlugs.every((slug) => {
      if (slug === axisSlug) return true;
      if (selected[slug] == null) return true;
      return valueMap[slug] === Number(selected[slug]);
    });
  });
}

function findInitialSelection(variants, variantAxes) {
  const selected = {};
  const axisSlugs = (variantAxes || []).filter((a) => Number(a.is_active ?? 1) === 1).map((a) => a.type_slug);
  const firstInStock = (variants || []).find(
    (v) => Number(v.is_active ?? 1) === 1 && (v.inventory?.quantity ?? 0) > 0,
  );

  if (firstInStock) {
    const valueMap = buildValueMap(firstInStock);
    axisSlugs.forEach((slug) => {
      if (valueMap[slug]) selected[slug] = valueMap[slug];
    });
  }

  return applyHiddenAxisDefaults(variantAxes, selected);
}

function getVariantUi() {
  return storeConfig.ui.variant || {};
}

function isColorAxis(axis) {
  return axis.type_slug === 'color' || axis.input_type === 'swatch';
}

function renderAxis(axis, variants, variantAxes, selectedValues) {
  const ui = getVariantUi();
  const selected = selectedValues[axis.type_slug] || null;
  const isSwatch = isColorAxis(axis);

  return (axis.values || []).filter((val) => Number(val.is_active ?? 1) === 1).map((val) => {
    const selectable = isValueSelectable(variants, variantAxes, selectedValues, axis.type_slug, val.id);
    const active = Number(selected) === Number(val.id);
    const style = getSwatchStyle(val.swatch_hex);

    if (isSwatch) {
      const stateClass = !selectable
        ? ui.swatchDisabled
        : active
          ? ui.swatchActive
          : ui.swatchInactive;
      return `<button type="button" data-axis="${escapeAttr(axis.type_slug)}" data-value-id="${val.id}"
        data-value-label="${escapeAttr(val.value)}"
        ${selectable ? '' : 'disabled'}
        class="product-variant-btn product-color-swatch flex flex-col items-center gap-1.5 min-w-[2.75rem] transition-all"
        title="${escapeAttr(val.value)}">
        <span class="w-9 h-9 rounded-full border-2 shrink-0 ${stateClass}" style="${style}"></span>
        <span class="text-[10px] leading-none text-muted ${active ? 'text-body font-medium' : ''}">${escapeHtml(val.value)}</span>
      </button>`;
    }

    const stateClass = !selectable
      ? ui.textDisabled
      : active
        ? ui.textActive
        : ui.textInactive;
    return `<button type="button" data-axis="${escapeAttr(axis.type_slug)}" data-value-id="${val.id}"
      ${selectable ? '' : 'disabled'}
      class="product-variant-btn relative min-w-[2.75rem] h-11 px-3 rounded-lg border text-sm font-medium transition-colors ${stateClass}
        ${!selectable ? 'product-size-unavailable' : ''}">${escapeHtml(val.value)}</button>`;
  }).join('');
}

function renderColorSelectedLabel(axis, selectedValues) {
  const selectedId = selectedValues[axis.type_slug];
  if (!selectedId) return '';
  const match = (axis.values || []).find((v) => Number(v.id) === Number(selectedId));
  if (!match) return '';
  return `<span class="text-xs text-muted font-normal mr-1">(${escapeHtml(match.value)})</span>`;
}

const ProductInfo = {
  render({
    name = '',
    price = 0,
    description = '',
    shortDescription = '',
    variantAxes = [],
    variants = [],
    stock = 0,
    detailBullets = [],
    shippingText = '',
  } = {}) {
    const t = storeConfig.texts.product;
    const priceStr = formatPrice(price);
    const outOfStock = stock === 0;
    const intro = escapeHtml(shortDescription);
    const fullDesc = description;
    const safeName = escapeHtml(name);
    const safeShipping = escapeHtml(shippingText || t.shippingText);
    const initialSelected = variantAxes.length
      ? findInitialSelection(variants, variantAxes)
      : {};
    const visibleAxes = getVisibleAxes(variantAxes);

    const axesHtml = visibleAxes.length
      ? visibleAxes.map((axis) => {
        const isColor = isColorAxis(axis);
        const colorLabel = isColor ? renderColorSelectedLabel(axis, initialSelected) : '';
        return `
          <div class="mb-6" data-variant-axis="${escapeAttr(axis.type_slug)}">
            <p class="text-sm font-medium text-body mb-3 flex items-center justify-end gap-1 flex-wrap">
              <span>${escapeHtml(axis.type_name)}</span>${colorLabel}
            </p>
            <div class="flex flex-wrap gap-2 sm:gap-3 justify-end">${renderAxis(axis, variants, variantAxes, initialSelected)}</div>
          </div>`;
      }).join('')
      : '';

    const bullets = detailBullets.map((item) =>
      `<li class="text-sm text-muted leading-relaxed">${escapeHtml(item)}</li>`).join('');
    const detailsHtml = [
      fullDesc ? `<div style="white-space: pre-line;" class="pb-4 text-sm text-muted leading-relaxed whitespace-pre-line">${fullDesc}</div>` : '',
      bullets ? `<ul class="pb-5 space-y-2 list-disc list-inside marker:text-muted">${bullets}</ul>` : '',
    ].filter(Boolean).join('');

    const qtyBtnDisabled = outOfStock ? ' disabled' : '';
    const qtyBtnState = outOfStock ? ' opacity-30 pointer-events-none' : '';

    return `
      <div class="product-info text-right">
        <h1 class="text-2xl md:text-4xl font-bold text-body leading-tight mb-3">${safeName}</h1>
        <p id="product-live-price" class="text-lg md:text-xl font-medium text-body mb-6">${priceStr}</p>
        ${intro ? `<p class="text-sm md:text-base text-muted leading-relaxed mb-8 max-w-lg">${intro}</p>` : ''}

        <div class="flex items-center gap-3 mb-4">
          <div class="flex items-center border border-black/10 rounded-full overflow-hidden shrink-0" dir="ltr">
            <button type="button" id="qty-minus" aria-label="کاهش تعداد"${qtyBtnDisabled}
                    class="w-10 h-10 flex items-center justify-center text-body hover:bg-black/5 transition-colors${qtyBtnState}">
              <i data-lucide="minus" class="w-4 h-4"></i>
            </button>
            <span id="qty-value" class="w-10 text-center text-sm font-medium text-body">1</span>
            <button type="button" id="qty-plus" aria-label="افزایش تعداد"${qtyBtnDisabled}
                    class="w-10 h-10 flex items-center justify-center text-body hover:bg-black/5 transition-colors${qtyBtnState}">
              <i data-lucide="plus" class="w-4 h-4"></i>
            </button>
          </div>
          <div class="flex-1">
            ${Button.render({
              variant: 'aluminum',
              label: t.addToCart,
              className: 'w-full product-add-btn',
              disabled: outOfStock,
              icon: '<i data-lucide="shopping-bag" class="w-4 h-4"></i>',
            })}
          </div>
        </div>

        <div id="product-variant-selectors">${axesHtml}</div>

        <p id="product-stock-hint" class="text-xs mb-4 ${outOfStock ? 'text-accent' : 'text-muted'}">
          ${outOfStock ? (t.outOfStock || 'ناموجود') : ''}
        </p>

        <div class="border-t border-black/10">
          <button type="button" data-accordion="details" aria-expanded="true"
                  class="product-acc-btn w-full flex items-center justify-between py-4 text-body">
            <i data-lucide="chevron-down" class="product-acc-icon w-4 h-4 transition-transform rotate-180"></i>
            <span class="font-medium text-sm">${t.detailsTitle}</span>
          </button>
          <div id="acc-details" class="product-acc-panel overflow-hidden" style="max-height:none">
            ${detailsHtml}
          </div>
        </div>

        <div class="border-t border-black/10">
          <button type="button" data-accordion="shipping" aria-expanded="false"
                  class="product-acc-btn w-full flex items-center justify-between py-4 text-body">
            <i data-lucide="chevron-down" class="product-acc-icon w-4 h-4 transition-transform"></i>
            <span class="font-medium text-sm">${t.shippingTitle}</span>
          </button>
          <div id="acc-shipping" class="product-acc-panel overflow-hidden" style="max-height:0">
            <p class="pb-5 text-sm text-muted leading-relaxed whitespace-pre-line">${safeShipping}</p>
          </div>
        </div>
      </div>`;
  },

  bind(container, callbacks = {}) {
    const {
      variants = [],
      variantAxes = [],
      getVariantPrice = () => 0,
    } = callbacks;

    const t = storeConfig.texts.product;
    const ui = getVariantUi();
    const visibleAxes = getVisibleAxes(variantAxes);
    const selected = variantAxes.length
      ? findInitialSelection(variants, variantAxes)
      : {};
    let qty = 1;

    // موجودی مرجع برای محصولات بدون واریانت (از product.js پاس داده می‌شود)
    const fallbackStock = Number(callbacks.maxQty) || 99;
    let maxQty = Math.max(1, Math.min(fallbackStock, 99));

    // ── خواندن موجودی واریانت با تحمل شکل‌های مختلف داده ──
    // اگر داده‌ی موجودی در پاسخ API نبود، null برمی‌گرداند (نامشخص، نه صفر)
    function readVariantStock(variant) {
      if (!variant) return null;
      const raw = variant.inventory?.quantity
        ?? variant.inventory_quantity
        ?? variant.stock
        ?? variant.qty;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }

    function syncQtyDisplay() {
      const el = container.querySelector('#qty-value');
      if (el) el.textContent = qty;
    }

    // وقتی محصول ناموجود است دکمه‌های تعداد هم غیرفعال می‌شوند
    // تا «کار نکردن» آن‌ها طبیعی و قابل‌فهم به نظر برسد
    function setQtyButtonsDisabled(disabled) {
      ['#qty-minus', '#qty-plus'].forEach((sel) => {
        const btn = container.querySelector(sel);
        if (!btn) return;
        btn.disabled = disabled;
        btn.classList.toggle('opacity-30', disabled);
        btn.classList.toggle('pointer-events-none', disabled);
      });
      const plusBtn = container.querySelector('#qty-plus');
      if (plusBtn) plusBtn.title = maxQty > 1 ? `حداکثر ${maxQty} عدد` : '';
    }

    function applyButtonState(btn, axis, valueId) {
      const selectable = isValueSelectable(variants, variantAxes, selected, axis, valueId);
      const active = Number(selected[axis]) === Number(valueId);
      const isSwatch = btn.classList.contains('product-color-swatch');

      btn.disabled = !selectable;

      if (isSwatch) {
        btn.className = 'product-variant-btn product-color-swatch flex flex-col items-center gap-1.5 min-w-[2.75rem] transition-all';
        const dot = btn.querySelector('span.rounded-full');
        if (dot) {
          dot.className = `w-9 h-9 rounded-full border-2 shrink-0 ${
            !selectable ? ui.swatchDisabled : active ? ui.swatchActive : ui.swatchInactive
          }`;
        }
        const labelEl = btn.querySelector('span:last-child');
        if (labelEl) {
          labelEl.classList.toggle('text-body', active && selectable);
          labelEl.classList.toggle('font-medium', active && selectable);
          labelEl.classList.toggle('text-muted', !active || !selectable);
        }
      } else {
        btn.className = `product-variant-btn relative min-w-[2.75rem] h-11 px-3 rounded-lg border text-sm font-medium transition-colors ${
          !selectable ? ui.textDisabled : active ? ui.textActive : ui.textInactive
        } ${!selectable ? 'product-size-unavailable' : ''}`;
      }

      btn.classList.toggle('is-active', active && selectable);
    }

    function refreshColorLabels() {
      visibleAxes.filter(isColorAxis).forEach((axis) => {
        const wrap = container.querySelector(`[data-variant-axis="${axis.type_slug}"]`);
        const labelHost = wrap?.querySelector('p.text-sm');
        if (!labelHost) return;
        const selectedId = selected[axis.type_slug];
        const match = axis.values.find((v) => Number(v.id) === Number(selectedId));
        const colorSuffix = match
          ? `<span class="text-xs text-muted font-normal mr-1">(${escapeHtml(match.value)})</span>`
          : '';
        labelHost.innerHTML = `<span>${escapeHtml(axis.type_name)}</span>${colorSuffix}`;
      });
    }

    function refreshVariantButtons() {
      container.querySelectorAll('.product-variant-btn').forEach((btn) => {
        applyButtonState(btn, btn.dataset.axis, Number(btn.dataset.valueId));
      });
      refreshColorLabels();
    }

    function updateUI() {
      applyHiddenAxisDefaults(variantAxes, selected);
      const variant = findMatchingVariant(variants, variantAxes, selected);
      const allSelected = isAxisSelectionComplete(variantAxes, selected);
      const hasVariantData = Array.isArray(variants) && variants.length > 0;

      // ── تعیین موجودی مؤثر ──
      // اولویت: موجودی واریانت انتخاب‌شده → موجودی محصول (از product.js)
      // اگر واریانت هنوز کامل انتخاب نشده ولی داده موجودی غایب است،
      // به جای صفر کردن (که دکمه‌ها را می‌کُشت) از موجودی محصول استفاده می‌کنیم.
      const variantStock = readVariantStock(variant);
      const stock = hasVariantData
        ? (variantStock != null ? variantStock : (fallbackStock > 1 ? fallbackStock : 99))
        : fallbackStock;

      maxQty = Math.max(1, Math.min(Number(stock) || 1, 99));
      if (stock > 0 && qty > maxQty) {
        qty = maxQty;
        syncQtyDisplay();
      }

      const priceEl = container.querySelector('#product-live-price');
      if (priceEl && variant) {
        priceEl.textContent = formatPrice(getVariantPrice(variant));
      }

      const addBtn = container.querySelector('.product-add-btn');
      const quickBtn = container.querySelector('#quick-buy-btn');
      const stockHint = container.querySelector('#product-stock-hint');

      const canOrder = hasVariantData ? (!!variant && stock > 0) : stock > 0;
      const out = !canOrder;

      // دکمه‌های +/- فقط وقتی واقعاً ناموجود است غیرفعال می‌شوند
      setQtyButtonsDisabled(out);

      if (addBtn) {
        Button.setDisabled(addBtn, out);
        addBtn.classList.toggle('opacity-40', out);
        addBtn.classList.toggle('pointer-events-none', out);
      }
      if (quickBtn) {
        Button.setDisabled(quickBtn, out);
        quickBtn.classList.toggle('opacity-40', out);
        quickBtn.classList.toggle('pointer-events-none', out);
      }
      if (stockHint) {
        let hint = '';
        let isAccent = false;
        if (hasVariantData && visibleAxes.length && !allSelected) {
          hint = t.selectOptionsHint || t.selectVariant;
          isAccent = true;
        } else if (out) {
          hint = t.outOfStock || 'ناموجود';
          isAccent = true;
        } else if (isLowStock(stock)) {
          hint = formatLowStockMessage(stock);
          isAccent = false;
        }
        stockHint.textContent = hint;
        stockHint.classList.toggle('text-accent', isAccent);
        stockHint.classList.toggle('text-muted', !isAccent);
        stockHint.classList.toggle('text-amber-400/90', !isAccent && !!hint);
      }

      refreshVariantButtons();
      callbacks.onVariantChange?.(variant);
    }

    // ── توجه: همه‌ی listenerها قبل از اولین updateUI() وصل می‌شوند ──
    // تا اگر updateUI خطا بدهد، دکمه‌ها هیچ‌وقت «مرده» باقی نمانند.

    // ── انتخاب واریانت ──
    container.querySelectorAll('.product-variant-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        selected[btn.dataset.axis] = Number(btn.dataset.valueId);
        updateUI();
      });
    });

    // ── دکمه‌های تعداد ──
    container.querySelector('#qty-minus')?.addEventListener('click', () => {
      qty = Math.max(1, qty - 1);
      syncQtyDisplay();
    });
    container.querySelector('#qty-plus')?.addEventListener('click', () => {
      qty = Math.min(maxQty, qty + 1);
      syncQtyDisplay();
    });

    // ── افزودن به سبد ──
    container.querySelector('.product-add-btn')?.addEventListener('click', async () => {
      const variant = findMatchingVariant(variants, variantAxes, selected);
      await callbacks.onAddToCart?.({ variant, qty });
    });

    container.querySelector('#quick-buy-btn')?.addEventListener('click', async () => {
      const variant = findMatchingVariant(variants, variantAxes, selected);
      await callbacks.onQuickBuy?.({ variant, qty });
    });

    // ── آکاردیون توضیحات / ارسال ──
    container.querySelectorAll('.product-acc-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.accordion;
        const panel = container.querySelector(`#acc-${key}`);
        const icon = btn.querySelector('.product-acc-icon');
        if (!panel) return;
        const isOpen = panel.style.maxHeight && panel.style.maxHeight !== '0px';
        panel.style.maxHeight = isOpen ? '0px' : `${panel.scrollHeight}px`;
        btn.setAttribute('aria-expanded', String(!isOpen));
        if (icon) icon.classList.toggle('rotate-180', !isOpen);
      });
    });

    // رندر اولیه‌ی وضعیت — حالا بعد از اتصال کامل eventها
    updateUI();
  },
};

export default ProductInfo;
