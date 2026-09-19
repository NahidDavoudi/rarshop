import { parsePrice, attachPriceFormatterAll } from '../../utils/priceFormatter.js';

const VariantTable = {
  render({ variants = [], t = {} } = {}) {
    if (!variants.length) {
      return `<p class="text-sm text-dim py-4 text-center">${t.emptyVariants || 'واریانتی وجود ندارد'}</p>`;
    }

    const rows = variants.map((v) => {
      const qty = v.inventory?.quantity ?? 0;
      const price = v.price != null && v.price !== '' ? Number(v.price) : '';
      return `
        <tr class="border-b border-border" data-variant-id="${v.id}">
          <td class="px-3 py-2 text-sm">${v.title || '—'}</td>
          <td class="px-3 py-2">
            <input type="text" data-field="sku" value="${v.sku || ''}"
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
        </tr>`;
    }).join('');

    return `
      <div class="overflow-x-auto border border-border rounded-xl">
        <table class="w-full text-right">
          <thead>
            <tr class="bg-surface text-muted text-xs">
              <th class="px-3 py-2 font-medium">${t.variantTitle || 'عنوان'}</th>
              <th class="px-3 py-2 font-medium">SKU</th>
              <th class="px-3 py-2 font-medium">${t.price || 'قیمت'}</th>
              <th class="px-3 py-2 font-medium">${t.stock || 'موجودی'}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
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
