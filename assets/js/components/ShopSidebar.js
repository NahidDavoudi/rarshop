import { storeConfig } from '../config/bootstrap.js';
import { attachPriceFormatterEl, formatPrice } from '../utils/priceFormatter.js';
import { normalizePriceFilter } from '../utils/normalizePriceFilter.js';
import Button from './Button.js';

function formatInputPrice(value) {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString('fa-IR');
}

function renderAttributeGroup(facet, activeValues = []) {
  const { type_slug, type_name, input_type, is_variant_axis, values = [] } = facet;
  if (!values.length) return '';

  const useButtons = is_variant_axis && values.length <= 12 && input_type !== 'multiselect';
  const activeSet = new Set(activeValues);

  if (useButtons) {
    const btns = values.map((v) => {
      const active = activeSet.has(v.slug);
      return `<button type="button" data-attr="${type_slug}" data-value="${v.slug}"
        class="shop-attr-btn w-10 h-10 rounded-lg text-sm font-medium border transition-colors
               ${active
                 ? 'bg-accent text-white border-accent'
                 : 'bg-card text-body border-border hover:border-accent/40'}">${v.value}</button>`;
    }).join('');

    return `
      <div class="mb-8" data-attr-group="${type_slug}" data-select-mode="single">
        <h3 class="text-sm font-medium text-body mb-3">${type_name}</h3>
        <div class="flex flex-wrap gap-2 justify-end">${btns}</div>
      </div>`;
  }

  const checks = values.map((v) => {
    const checked = activeSet.has(v.slug);
    const swatch = v.swatch_hex
      ? `<span class="w-4 h-4 rounded-full border border-border shrink-0" style="background:${v.swatch_hex}"></span>`
      : '';
    return `
      <label class="flex items-center gap-3 flex-row-reverse cursor-pointer group">
        <input type="checkbox" data-attr="${type_slug}" data-value="${v.slug}" ${checked ? 'checked' : ''}
               class="shop-attr-check w-4 h-4 rounded border-border text-accent focus:ring-0 focus:ring-offset-0">
        ${swatch}
        <span class="text-sm text-body/80 group-hover:text-body transition-colors">${v.value}</span>
      </label>`;
  }).join('');

  return `
    <div class="mb-8" data-attr-group="${type_slug}" data-select-mode="multi">
      <h3 class="text-sm font-medium text-body mb-3">${type_name}</h3>
      <div class="space-y-3">${checks}</div>
    </div>`;
}

const ShopSidebar = {
  render({
    facets = [],
    activeAttrs = {},
    priceRange = { min: 0, max: 0, step: 1 },
    priceMin = null,
    priceMax = null,
  } = {}) {
    const t = storeConfig.texts.shop;
    const range = priceRange;
    const hasPriceRange = range.max > range.min;

    const attrGroups = facets.map((facet) => renderAttributeGroup(
      facet,
      activeAttrs[facet.type_slug] || [],
    )).join('');

    const priceSection = hasPriceRange ? `
        <div class="mb-8" data-price-section
             data-range-min="${range.min}" data-range-max="${range.max}">
          <h3 class="text-sm font-medium text-body mb-3">${t.priceLabel}</h3>
          <div class="grid grid-cols-2 gap-2" dir="ltr">
            <label class="block">
              <span class="block text-xs text-muted mb-1.5 text-right">${t.priceFromLabel}</span>
              <input type="text" id="price-min-input" inputmode="numeric" autocomplete="off"
                     value="${formatInputPrice(priceMin)}"
                     placeholder="${formatInputPrice(range.min)}"
                     class="shop-price-input w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-body text-center tabular-nums placeholder:text-muted/60">
            </label>
            <label class="block">
              <span class="block text-xs text-muted mb-1.5 text-right">${t.priceToLabel}</span>
              <input type="text" id="price-max-input" inputmode="numeric" autocomplete="off"
                     value="${formatInputPrice(priceMax)}"
                     placeholder="${formatInputPrice(range.max)}"
                     class="shop-price-input w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-body text-center tabular-nums placeholder:text-muted/60">
            </label>
          </div>
          <p class="mt-3 text-xs text-muted leading-relaxed">
            <span>${t.priceMinAllowed}: ${formatPrice(range.min)}</span>
            <span class="mx-1.5">—</span>
            <span>${t.priceMaxAllowed}: ${formatPrice(range.max)}</span>
          </p>
        </div>` : '';

    return `
      <aside id="shop-sidebar" class="shop-sidebar w-full md:w-56 lg:w-64 shrink-0">
        <div class="flex items-center justify-between mb-6 md:mb-8">
          <h2 class="text-lg font-bold text-body">${t.filtersTitle}</h2>
          <button id="sidebar-close" type="button" class="md:hidden text-muted hover:text-body p-1" aria-label="بستن">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        ${attrGroups || `<p class="text-sm text-muted mb-6">${t.noFilters}</p>`}

        ${priceSection}

        ${Button.render({
          variant: 'aluminum',
          label: t.applyFilters,
          className: 'w-full shop-apply-btn',
          attrs: { 'data-action': 'apply-filters' },
        })}

        <button type="button" id="clear-filters"
                class="hidden w-full mt-3 text-sm text-muted hover:text-body transition-colors text-center">
          ${t.clearFilters}
        </button>
      </aside>`;
  },

  bind(container, callbacks = {}) {
    const singleSelections = {};

    container.querySelectorAll('[data-attr-group][data-select-mode="single"]').forEach((group) => {
      const slug = group.dataset.attrGroup;
      const activeBtn = group.querySelector('.shop-attr-btn.bg-accent');
      singleSelections[slug] = activeBtn?.dataset.value || '';

      group.querySelectorAll('.shop-attr-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const value = btn.dataset.value;
          singleSelections[slug] = singleSelections[slug] === value ? '' : value;
          group.querySelectorAll('.shop-attr-btn').forEach((b) => {
            const active = b.dataset.value === singleSelections[slug];
            b.classList.toggle('bg-accent', active);
            b.classList.toggle('text-white', active);
            b.classList.toggle('border-accent', active);
            b.classList.toggle('bg-card', !active);
            b.classList.toggle('text-body', !active);
            b.classList.toggle('border-border', !active);
          });
        });
      });
    });

    const priceSection = container.querySelector('[data-price-section]');
    const minInput = container.querySelector('#price-min-input');
    const maxInput = container.querySelector('#price-max-input');

    if (minInput) attachPriceFormatterEl(minInput);
    if (maxInput) attachPriceFormatterEl(maxInput);

    function getPriceRange() {
      if (!priceSection) return { min: 0, max: 0 };
      return {
        min: parseInt(priceSection.dataset.rangeMin, 10) || 0,
        max: parseInt(priceSection.dataset.rangeMax, 10) || 0,
      };
    }

    container.querySelector('.shop-apply-btn')?.addEventListener('click', () => {
      const attrs = { ...singleSelections };

      container.querySelectorAll('.shop-attr-check:checked').forEach((el) => {
        const slug = el.dataset.attr;
        if (!attrs[slug]) attrs[slug] = [];
        if (!Array.isArray(attrs[slug])) attrs[slug] = [attrs[slug]].filter(Boolean);
        attrs[slug].push(el.dataset.value);
      });

      Object.keys(attrs).forEach((slug) => {
        if (typeof attrs[slug] === 'string') {
          attrs[slug] = attrs[slug] ? [attrs[slug]] : [];
        }
      });

      const { min: priceMin, max: priceMax } = normalizePriceFilter(
        minInput?.value,
        maxInput?.value,
        getPriceRange(),
      );

      if (minInput && priceMin != null) minInput.value = formatInputPrice(priceMin);
      if (maxInput && priceMax != null) maxInput.value = formatInputPrice(priceMax);

      callbacks.onApply?.({ attrs, priceMin, priceMax });
    });

    container.querySelector('#clear-filters')?.addEventListener('click', () => {
      callbacks.onClear?.();
    });

    container.querySelector('#sidebar-close')?.addEventListener('click', () => {
      callbacks.onClose?.();
    });
  },
};

export default ShopSidebar;
