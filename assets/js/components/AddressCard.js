import { escapeHtml, escapeAttr } from '../utils/htmlEscape.js';

const AddressCard = {
  render(address, texts = {}) {
    if (!address) return '';

    const title = address.title || texts.defaultBadge || 'آدرس';
    const isDefault = Number(address.is_default) === 1;
    const summary = [
      address.province,
      address.city,
      address.address,
      address.postal_code ? `کد پستی: ${address.postal_code}` : '',
    ].filter(Boolean).join(' — ');

    return `
      <div class="address-card bg-surface/40 border border-border rounded-xl p-4 text-right" data-address-id="${escapeAttr(address.id)}">
        <div class="flex items-start justify-between gap-3 flex-row-reverse mb-2">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-row-reverse justify-end flex-wrap">
              <h3 class="font-bold text-body">${escapeHtml(title)}</h3>
              ${isDefault ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">${escapeHtml(texts.defaultBadge || 'پیش‌فرض')}</span>` : ''}
            </div>
            ${address.receiver ? `<p class="text-xs text-muted mt-1">${escapeHtml(address.receiver)}${address.phone ? ` — ${escapeHtml(address.phone)}` : ''}</p>` : ''}
          </div>
        </div>
        <p class="text-sm text-muted leading-relaxed mb-4">${escapeHtml(summary)}</p>
        <div class="flex flex-wrap gap-2 justify-end">
          ${!isDefault ? `<button type="button" data-action="default" class="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-accent text-muted hover:text-accent transition-colors">${escapeHtml(texts.setDefault || 'پیش‌فرض')}</button>` : ''}
          <button type="button" data-action="edit" class="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-accent text-body hover:text-accent transition-colors">${escapeHtml(texts.editAddress || 'ویرایش')}</button>
          <button type="button" data-action="delete" class="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors">${escapeHtml(texts.deleteAddress || 'حذف')}</button>
        </div>
      </div>`;
  },

  bind(container, callbacks = {}) {
    container.querySelectorAll('.address-card').forEach((card) => {
      const id = Number(card.dataset.addressId);
      if (!id) return;

      card.querySelector('[data-action="edit"]')?.addEventListener('click', () => callbacks.onEdit?.(id));
      card.querySelector('[data-action="delete"]')?.addEventListener('click', () => callbacks.onDelete?.(id));
      card.querySelector('[data-action="default"]')?.addEventListener('click', () => callbacks.onSetDefault?.(id));
    });
  },
};

export default AddressCard;
