import { parsePrice, attachPriceFormatterAll } from '../../utils/priceFormatter.js';
import { escapeHtml, escapeAttr } from '../../utils/htmlEscape.js';

function labelOf(v) {
  const vals = (v.attribute_values || []).map((av) => av.value).filter(Boolean);
  if (vals.length) return vals.join(' · ');
  const t = String(v.title || '').trim();
  return (t && t !== 'Default') ? t : '—';
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
      return `<p class="text-sm text-dim py-4 text-center">${escapeHtml(t.emptyVariants || 'واریانتی وجود ندارد')}</p>`;
    }

    const rows = list.map((v) => {
      const qty = v.inventory?.quantity ?? 0;
      const price = v.price != null && v.price !== '' ? Number(v.price) : '';
      const inactive = Number(v.is_active ?? 1) !== 1;
      const missing = price === '' || qty === '' || qty == null;
      return `
        <tr class="border-b border-border ${inactive ? 'opacity-55' : ''}" data-variant-id="${v.id}" data-active="${inactive ? 0 : 1}">
          <td class="px-3 py-2 text-sm">${escapeHtml(labelOf(v))}${missing ? ' <span class="text-[10px] text-amber-600">⚠ بدون قیمت/موجودی</span>' : ''}${inactive ? ' <span class="text-[10px] text-muted">(غیرفعال)</span>' : ''}</td>
          <td class="px-3 py-2">
            <input type="text" data-field="sku" value="${escapeAttr(v.sku || '')}"
                    class="w-full min-w-[100px] bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-body outline-none focus:border-accent">
          </td>
          <td class="px-3 py-2">
            <input type="text" data-field="price" value="${price !== '' ? price.toLocaleString('fa-IR') : ''}"
                    inputmode="numeric" placeholder="ارث‌بری"
                    class="w-full min-w-[90px] bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-body outline-none focus:border-accent">
          </td>
          <td class="px-3 py-2">
            <input type="number" data-field="quantity" value="${qty}" min="0"
                    class="w-full min-w-[70px] bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-body outline-none focus:border-accent">
          </td>
          <td class="px-3 py-2">
            <button type="button" data-action="toggle-active" data-variant-id="${v.id}"
                    class="text-xs px-2 py-1 rounded-lg border border-border text-muted hover:text-body transition-colors">${inactive ? 'فعال‌سازی' : 'غیرفعال‌سازی'}</button>
          </td>
        </tr>`;
    }).join('');

    const inactiveBar = (!showInactive && inact.length)
      ? `<button type="button" data-action="show-inactive" class="mt-2 text-xs text-muted hover:text-body">نمایش ${inact.length.toLocaleString('fa-IR')} واریانت غیرفعال</button>`
      : '';

    return `
      <div class="border border-border rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-right min-w-[640px]">
            <thead>
              <tr class="bg-surface text-muted text-xs">
                <th class="px-3 py-2 font-medium">${escapeHtml(t.variantTitle || 'عنوان')}</th>
                <th class="px-3 py-2 font-medium">SKU</th>
                <th class="px-3 py-2 font-medium">${escapeHtml(t.price || 'قیمت')}</th>
                <th class="px-3 py-2 font-medium">${escapeHtml(t.stock || 'موجودی')}</th>
                <th class="px-3 py-2 font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>${inactiveBar}`;
  },

  bindPriceInputs(container) {
    attachPriceFormatterAll(container);
  },

  collectRows(container) {
    const rows = container?.querySelectorAll('[data-variant-id]') || [];
    return Array.from(rows).map((row) => {
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
