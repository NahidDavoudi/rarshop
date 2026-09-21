import { escapeAttr } from '../utils/htmlEscape.js';

const AddressForm = {
  render({ prefix = 'profile-addr', texts = {}, values = {}, showTitle = true, showDefault = true } = {}) {
    const v = values || {};

    return `
      <div class="address-form space-y-4" data-form-prefix="${escapeAttr(prefix)}">
        ${showTitle ? `
          <div>
            <label class="block text-sm text-accent text-right mb-1">${texts.titleLabel || 'عنوان آدرس'}</label>
            <input type="text" id="${prefix}-title" value="${escapeAttr(v.title || '')}"
              class="w-full bg-body border border-border rounded-lg px-4 py-3 text-body text-right placeholder:text-muted/50 focus:outline-none focus:border-accent"
              placeholder="${escapeAttr(texts.titlePlaceholder || '')}">
          </div>` : ''}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-accent text-right mb-1">${texts.receiverLabel || 'نام گیرنده'}</label>
            <input type="text" id="${prefix}-receiver" value="${escapeAttr(v.receiver || '')}"
              class="w-full bg-body border border-border rounded-lg px-4 py-3 text-body text-right focus:outline-none focus:border-accent">
          </div>
          <div>
            <label class="block text-sm text-accent text-right mb-1">${texts.phoneLabel || 'شماره تماس'}</label>
            <input type="tel" id="${prefix}-phone" dir="ltr" value="${escapeAttr(v.phone || '')}"
              class="w-full bg-body border border-border rounded-lg px-4 py-3 text-body text-left focus:outline-none focus:border-accent">
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-accent text-right mb-1">${texts.provinceLabel || 'استان'} *</label>
            <select id="${prefix}-province" required
              class="w-full bg-body border border-border rounded-lg px-4 py-3 text-body text-right focus:outline-none focus:border-accent">
              <option value="">انتخاب استان...</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-accent text-right mb-1">${texts.cityLabel || 'شهر'} *</label>
            <select id="${prefix}-city" required disabled
              class="w-full bg-body border border-border rounded-lg px-4 py-3 text-body text-right focus:outline-none focus:border-accent disabled:opacity-50">
              <option value="">ابتدا استان انتخاب کنید</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm text-accent text-right mb-1">${texts.postalLabel || 'کد پستی'}</label>
          <input type="text" id="${prefix}-postal" maxlength="10" dir="ltr" value="${escapeAttr(v.postal_code || '')}"
            class="w-full bg-body border border-border rounded-lg px-4 py-3 text-body text-left focus:outline-none focus:border-accent">
        </div>
        <div>
          <label class="block text-sm text-accent text-right mb-1">${texts.addressLabel || 'آدرس دقیق'} *</label>
          <textarea id="${prefix}-address" required rows="3"
            class="w-full bg-body border border-border rounded-lg px-4 py-3 text-body text-right placeholder:text-muted/50 focus:outline-none focus:border-accent resize-none"
            placeholder="${escapeAttr(texts.addressPlaceholder || '')}">${escapeAttr(v.address || '')}</textarea>
        </div>
        ${showDefault ? `
          <label class="flex items-center gap-2 flex-row-reverse justify-end cursor-pointer">
            <span class="text-sm text-body">${texts.defaultLabel || 'آدرس پیش‌فرض'}</span>
            <input type="checkbox" id="${prefix}-default" class="rounded border-border text-accent focus:ring-accent"${Number(v.is_default) === 1 ? ' checked' : ''}>
          </label>` : ''}
        <p id="${prefix}-error" class="hidden text-accent text-sm text-right"></p>
      </div>`;
  },

  bind(element, { prefix = 'profile-addr', onProvinceChange } = {}) {
    const provinceEl = element.querySelector(`#${prefix}-province`);
    if (provinceEl && typeof onProvinceChange === 'function') {
      provinceEl.addEventListener('change', () => onProvinceChange(provinceEl.value));
    }
  },

  readValues(prefix = 'profile-addr') {
    const provinceEl = document.getElementById(`${prefix}-province`);
    const provinceName = provinceEl?.selectedOptions?.[0]?.textContent?.trim() || '';

    return {
      title: document.getElementById(`${prefix}-title`)?.value.trim() || '',
      receiver: document.getElementById(`${prefix}-receiver`)?.value.trim() || '',
      phone: document.getElementById(`${prefix}-phone`)?.value.trim() || '',
      province: provinceName,
      city: document.getElementById(`${prefix}-city`)?.value.trim() || '',
      postal_code: document.getElementById(`${prefix}-postal`)?.value.trim() || '',
      address: document.getElementById(`${prefix}-address`)?.value.trim() || '',
      is_default: document.getElementById(`${prefix}-default`)?.checked ? 1 : 0,
    };
  },

  showError(prefix, message) {
    const errEl = document.getElementById(`${prefix}-error`);
    if (!errEl) return;
    if (message) {
      errEl.textContent = message;
      errEl.classList.remove('hidden');
    } else {
      errEl.textContent = '';
      errEl.classList.add('hidden');
    }
  },
};

export default AddressForm;
