import { parsePrice, attachPriceFormatterAll } from '../../utils/priceFormatter.js';
import { escapeHtml, escapeAttr } from '../../utils/htmlEscape.js';

function labelOf(v) {
  const vals = (v.attribute_values || []).map((av) => av.value).filter(Boolean);
  if (vals.length) return vals.join(' · ');
  const t = String(v.title || '').trim();
  return (t && t !== 'Default') ? t : '—';
}

function desktopRows(list) {
  return list.map((v) => {
    const qty = v.inventory?.quantity ?? 0;
    const price = v.price != null && v.price !== '' ? Number(v.price) : '';
    const inactive = Number(v.is_active ?? 1) !== 1;
    const missing = price === '';
    return `
        <tr class="border-b border-border transition-colors hover:bg-surface/50 ${inactive ? 'opacity-55' : ''}" data-variant-id="${v.id}" data-active="${inactive ? 0 : 1}">
          <td class="px-3 py-3 text-sm">
            <span class="font-medium text-body whitespace-nowrap">${escapeHtml(labelOf(v))}</span>
            ${missing ? '<span class="inline-flex items-center gap-1 ms-2 text-[11px] text-amber-600 whitespace-nowrap" role="status" aria-live="polite"><i data-lucide="alert-circle" class="w-3 h-3"></i> بدون قیمت/موجودی</span>' : ''}
            ${inactive ? '<span class="inline-flex ms-2 text-[11px] text-muted whitespace-nowrap">(غیرفعال)</span>' : ''}
          </td>
          <td class="px-3 py-2">
            <input type="text" data-field="sku" value="${escapeAttr(v.sku || '')}" aria-label="SKU ${escapeAttr(labelOf(v))}"
                    class="w-full min-w-[100px] bg-card border border-border rounded-lg px-3 py-2 text-xs text-body placeholder:text-dim focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none transition-colors">
          </td>
          <td class="px-3 py-2">
            <input type="text" data-field="price" value="${price !== '' ? price.toLocaleString('fa-IR') : ''}" aria-label="قیمت ${escapeAttr(labelOf(v))}"
                    inputmode="numeric" placeholder="—"
                    class="w-full min-w-[90px] bg-card border border-border rounded-lg px-3 py-2 text-xs text-body placeholder:text-dim focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none transition-colors">
          </td>
          <td class="px-3 py-2">
            <input type="number" data-field="quantity" value="${qty}" min="0" aria-label="موجودی ${escapeAttr(labelOf(v))}"
                    class="w-full min-w-[70px] bg-card border border-border rounded-lg px-3 py-2 text-xs text-body focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none transition-colors">
          </td>
          <td class="px-3 py-2">
            <button type="button" data-action="toggle-active" data-variant-id="${v.id}" aria-label="${inactive ? 'فعال‌سازی' : 'غیرفعال‌سازی'} ${escapeAttr(labelOf(v))}"
                    class="inline-flex items-center gap-1.5 min-h-[36px] min-w-[44px] justify-center text-xs px-3 py-1.5 rounded-lg border border-border text-muted hover:text-body hover:border-border/80 hover:bg-surface cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
              <i data-lucide="${inactive ? 'power' : 'archive'}" class="w-3.5 h-3.5 shrink-0" aria-hidden="true"></i>
              <span>${inactive ? 'فعال‌سازی' : 'غیرفعال'}</span>
            </button>
          </td>
        </tr>`;
  }).join('');
}

function mobileCards(list) {
  return list.map((v) => {
    const qty = v.inventory?.quantity ?? 0;
    const price = v.price != null && v.price !== '' ? Number(v.price) : '';
    const inactive = Number(v.is_active ?? 1) !== 1;
    return `
      <div class="border border-border rounded-xl bg-card/50 p-4 space-y-3 ${inactive ? 'opacity-60' : ''}" data-variant-id="${v.id}" data-active="${inactive ? 0 : 1}">
        <div class="flex items-start justify-between gap-2">
          <p class="text-sm font-medium text-body leading-5">${escapeHtml(labelOf(v))}</p>
          <button type="button" data-action="toggle-active" data-variant-id="${v.id}"
                  class="shrink-0 inline-flex items-center gap-1 min-h-[36px] px-3 py-1 rounded-full border text-xs font-medium cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${inactive ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' : 'border-border bg-surface text-muted hover:text-body'}">
            <i data-lucide="${inactive ? 'power' : 'archive'}" class="w-3.5 h-3.5" aria-hidden="true"></i>
            ${inactive ? 'فعال‌سازی' : 'غیرفعال'}
          </button>
        </div>
        ${price === '' ? '<p class="inline-flex items-center gap-1 text-xs text-amber-600" role="status"><i data-lucide="alert-circle" class="w-3 h-3" aria-hidden="true"></i> بدون قیمت — برای نمایش در فروشگاه قیمت وارد کنید</p>' : ''}
        <div class="grid grid-cols-1 gap-3">
          <label class="space-y-1">
            <span class="block text-xs font-medium text-muted">SKU</span>
            <input type="text" data-field="sku" value="${escapeAttr(v.sku || '')}"
                   class="w-full bg-body border border-border rounded-xl px-3 py-2.5 text-sm text-body placeholder:text-dim focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-colors">
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="space-y-1">
              <span class="block text-xs font-medium text-muted">قیمت (تومان)</span>
              <input type="text" data-field="price" value="${price !== '' ? price.toLocaleString('fa-IR') : ''}" inputmode="numeric" placeholder="—"
                     class="w-full bg-body border border-border rounded-xl px-3 py-2.5 text-sm text-body placeholder:text-dim focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-colors">
            </label>
            <label class="space-y-1">
              <span class="block text-xs font-medium text-muted">موجودی</span>
              <input type="number" data-field="quantity" value="${qty}" min="0"
                     class="w-full bg-body border border-border rounded-xl px-3 py-2.5 text-sm text-body focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-colors">
            </label>
          </div>
        </div>
      </div>`;
  }).join('');
}

const VariantTable = {
  render({ variants = [], t = {}, showInactive = false, filterValueId = null } = {}) {
    const act = variants.filter((v) => Number(v.is_active ?? 1) === 1);
    const inact = variants.filter((v) => Number(v.is_active ?? 1) !== 1);
    let list = showInactive ? [...act, ...inact] : act;
    if (filterValueId) {
      list = list.filter((v) => (v.attribute_values || []).some((av) => Number(av.id) === Number(filterValueId)));
    }
    if (!list.length) {
      const hasInactive = !showInactive && inact.length > 0;
      return `
        <div class="border border-dashed border-border rounded-2xl p-8 text-center bg-card/20">
          <div class="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center mx-auto mb-3">
            <i data-lucide="layers" class="w-5 h-5 text-muted" aria-hidden="true"></i>
          </div>
          <p class="text-sm text-muted mb-1">${escapeHtml(t.emptyVariants || 'واریانتی وجود ندارد')}</p>
          <p class="text-xs text-dim mb-3">محورها را تکمیل کنید و دکمه «اعمال و تولید واریانت‌ها» را بزنید.</p>
          ${hasInactive ? `<button type="button" data-action="show-inactive" class="inline-flex items-center gap-1.5 min-h-[36px] px-4 py-1.5 rounded-full bg-surface border border-border text-xs text-muted hover:text-body cursor-pointer transition-colors">نمایش ${inact.length.toLocaleString('fa-IR')} واریانت غیرفعال</button>` : ''}
        </div>`;
    }

    const inactiveBar = (!showInactive && inact.length)
      ? `<button type="button" data-action="show-inactive" class="mt-3 inline-flex items-center gap-1.5 min-h-[36px] px-4 py-1.5 rounded-full bg-surface border border-border text-xs text-muted hover:text-body cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"><i data-lucide="eye" class="w-3.5 h-3.5" aria-hidden="true"></i> نمایش ${inact.length.toLocaleString('fa-IR')} غیرفعال</button>`
      : '';

    return `
      <!-- Desktop table -->
      <div data-variant-view="desktop" class="hidden md:block border border-border rounded-xl overflow-hidden bg-body">
        <div class="overflow-x-auto">
          <table class="w-full text-right min-w-[640px]">
            <thead>
              <tr class="bg-surface text-muted text-xs">
                <th class="px-3 py-2.5 font-medium text-right">${escapeHtml(t.variantTitle || 'عنوان')}</th>
                <th class="px-3 py-2.5 font-medium text-right">SKU</th>
                <th class="px-3 py-2.5 font-medium text-right">${escapeHtml(t.price || 'قیمت')}</th>
                <th class="px-3 py-2.5 font-medium text-right">${escapeHtml(t.stock || 'موجودی')}</th>
                <th class="px-3 py-2.5 font-medium text-right">وضعیت</th>
              </tr>
            </thead>
            <tbody>${desktopRows(list)}</tbody>
          </table>
        </div>
      </div>
      <!-- Mobile cards -->
      <div data-variant-view="mobile" class="md:hidden grid grid-cols-1 gap-3">${mobileCards(list)}</div>
      ${inactiveBar}`;
  },

  bindPriceInputs(container) {
    attachPriceFormatterAll(container);
  },

  collectRows(container) {
    const rows = container?.querySelectorAll('[data-variant-id]') || [];
    const desktop = window.matchMedia?.('(min-width: 768px)').matches;
    const selected = new Map();
    Array.from(rows).forEach((row) => {
      if (row.dataset.active !== '1') return;
      const view = row.closest('[data-variant-view]')?.dataset.variantView;
      if (view && view !== (desktop ? 'desktop' : 'mobile')) return;
      if (!selected.has(row.dataset.variantId)) selected.set(row.dataset.variantId, row);
    });
    return Array.from(selected.values()).map((row) => {
      const id = Number(row.dataset.variantId);
      const sku = row.querySelector('[data-field="sku"]')?.value?.trim() || '';
      const price = parsePrice(row.querySelector('[data-field="price"]')?.value);
      const quantity = Number(row.querySelector('[data-field="quantity"]')?.value) || 0;
      const payload = { id, sku, quantity };
      if (price) payload.price = price;
      return payload;
    });
  },
};

export default VariantTable;
