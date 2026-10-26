/**
 * pages/checkout.js
 */
import api from '../core/api.js';
import Router from '../core/router.js';
import { storeConfig } from '../config/bootstrap.js';
import { renderImageWithFallback } from '../utils/imagePlaceholder.js';
import { loadIranLocations, fillSelect } from '../utils/iranLocations.js';
import { escapeHtml, escapeAttr } from '../utils/htmlEscape.js';
import { getCartDisplayName, formatCartVariantLine } from '../utils/productVariants.js';
import DOM from '../utils/dom.js';

const { show, hide, text, reclone } = DOM;

const checkoutTexts = () => storeConfig.texts.checkout || {};
const maxAddresses = () => storeConfig.addresses?.maxCount || 3;

let _checkoutCart = null;
let _checkoutDiscount = null;
let _locations = null;
let _locationsBound = false;
let _savedAddresses = [];
let _selectedAddressId = 'new';

function _shipping(total) {
  return total >= storeConfig.shipping.freeFrom ? 0 : storeConfig.shipping.standardCost;
}

function _renderCheckoutSummary() {
  if (!_checkoutCart) return;

  const shipping = _shipping(_checkoutCart.total);
  const discAmt = _checkoutDiscount
    ? (_checkoutDiscount.type === 'percent'
      ? Math.round(_checkoutCart.total * _checkoutDiscount.value / 100)
      : _checkoutDiscount.value)
    : 0;
  const finalTotal = _checkoutCart.total + shipping - discAmt;

  const itemsEl = document.getElementById('order-items');
  if (itemsEl) {
    itemsEl.innerHTML = _checkoutCart.items.map((item) => {
      const displayName = escapeHtml(getCartDisplayName(item));
      const variantLine = formatCartVariantLine(item);
      const variantHtml = variantLine
        ? `<p class="text-xs text-muted truncate">${escapeHtml(variantLine)}</p>`
        : '';
      return `
      <div class="flex items-center gap-3">
        <div class="w-14 h-14 rounded-lg shrink-0 overflow-hidden bg-[#f5f5f7] relative">
          ${renderImageWithFallback({ src: item.image || '', alt: item.name, iconSize: 'w-6 h-6' })}
        </div>
        <div class="flex-1 text-right min-w-0">
          <p class="text-sm font-medium truncate">${displayName}</p>
          ${variantHtml}
          <p class="text-xs text-muted">× ${item.qty}</p>
        </div>
        <p class="text-sm font-bold shrink-0">${api.utils.formatPrice(item.subtotal || item.price * item.qty)}</p>
      </div>`;
    }).join('');
  }

  const breakdownEl = document.getElementById('price-breakdown');
  if (breakdownEl) {
    breakdownEl.innerHTML = `
      <div class="flex justify-between text-muted text-sm"><span>${api.utils.formatPrice(_checkoutCart.total)}</span><span>جمع کالاها</span></div>
      ${discAmt > 0 ? `<div class="flex justify-between text-green-600 text-sm"><span>-${api.utils.formatPrice(discAmt)}</span><span>تخفیف</span></div>` : ''}
      <div class="flex justify-between text-muted text-sm"><span>${shipping === 0 ? 'رایگان' : api.utils.formatPrice(shipping)}</span><span>ارسال</span></div>`;
  }

  text('checkout-total', api.utils.formatPrice(finalTotal));
}

function _resetCitySelect(cityEl) {
  fillSelect(cityEl, [], 'ابتدا استان انتخاب کنید');
  cityEl.disabled = true;
}

function _findProvinceId(provinceName) {
  if (!_locations || !provinceName) return '';
  const match = _locations.provinces.find((p) => p.name === provinceName);
  return match?.id || '';
}

function _bindLocationSelects(provinceEl, cityEl) {
  if (_locationsBound) return;
  _locationsBound = true;

  provinceEl.addEventListener('change', () => {
    const provinceId = provinceEl.value;
    if (!provinceId || !_locations) {
      _resetCitySelect(cityEl);
      return;
    }

    const cities = _locations.getCities(provinceId).map((name) => ({ value: name, label: name }));
    fillSelect(cityEl, cities, 'انتخاب شهر...');
    cityEl.disabled = false;
  });
}

async function _initLocationSelects() {
  const provinceEl = document.getElementById('province-select');
  const cityEl = document.getElementById('city-select');
  if (!provinceEl || !cityEl) return;

  _resetCitySelect(cityEl);
  provinceEl.value = '';

  try {
    _locations = await loadIranLocations(storeConfig.data.iranLocations);
  } catch {
    fillSelect(provinceEl, [], 'خطا در بارگذاری استان‌ها');
    provinceEl.disabled = true;
    return;
  }

  provinceEl.disabled = false;
  fillSelect(
    provinceEl,
    _locations.provinces.map((p) => ({ value: p.id, label: p.name })),
    'انتخاب استان...',
  );
  _bindLocationSelects(provinceEl, cityEl);
}

async function _fillFormFromAddress(address) {
  const provinceEl = document.getElementById('province-select');
  const cityEl = document.getElementById('city-select');
  if (!provinceEl || !cityEl || !address) return;

  if (!_locations) {
    _locations = await loadIranLocations(storeConfig.data.iranLocations);
  }

  const provinceId = _findProvinceId(address.province);
  if (provinceId) {
    provinceEl.value = provinceId;
    const cities = _locations.getCities(provinceId).map((name) => ({ value: name, label: name }));
    fillSelect(cityEl, cities, 'انتخاب شهر...');
    cityEl.disabled = false;
    if (address.city) cityEl.value = address.city;
  }

  const nameEl = document.getElementById('customer-name');
  const phoneEl = document.getElementById('customer-phone');
  const postalEl = document.getElementById('postal-code');
  const addressEl = document.getElementById('shipping-address');

  if (nameEl && address.receiver) nameEl.value = address.receiver;
  if (phoneEl && address.phone) phoneEl.value = address.phone;
  if (postalEl) postalEl.value = address.postal_code || '';
  if (addressEl) addressEl.value = address.address || '';
}

function _toggleAddressFields(enabled) {
  const fields = document.getElementById('checkout-address-fields');
  if (!fields) return;
  fields.querySelectorAll('input, select, textarea').forEach((el) => {
    el.disabled = !enabled;
  });
  fields.classList.toggle('opacity-60', !enabled);
}

function _updateSaveAddressOption() {
  const saveSection = document.getElementById('save-address-option');
  const saveCheckbox = document.getElementById('save-address-checkbox');
  const saveLabel = document.getElementById('save-address-label');
  if (!saveSection || !saveCheckbox) return;

  const canSave = _selectedAddressId === 'new' && _savedAddresses.length < maxAddresses();
  saveSection.classList.toggle('hidden', !canSave);
  if (saveLabel) saveLabel.textContent = checkoutTexts().saveAddress || '';
  if (!canSave) saveCheckbox.checked = false;
}

function _renderSavedAddresses() {
  const section = document.getElementById('saved-addresses-section');
  const listEl = document.getElementById('saved-addresses-list');
  const labelEl = document.getElementById('saved-addresses-label');
  if (!section || !listEl) return;

  if (!api.auth.isLoggedIn() || !_savedAddresses.length) {
    hide('saved-addresses-section');
    _selectedAddressId = 'new';
    _toggleAddressFields(true);
    _updateSaveAddressOption();
    return;
  }

  show('saved-addresses-section');
  if (labelEl) labelEl.textContent = checkoutTexts().savedAddresses || '';

  const defaultAddress = _savedAddresses.find((a) => Number(a.is_default) === 1);
  if (!_selectedAddressId || (_selectedAddressId !== 'new' && !_savedAddresses.some((a) => String(a.id) === String(_selectedAddressId)))) {
    _selectedAddressId = defaultAddress ? String(defaultAddress.id) : String(_savedAddresses[0].id);
  }

  const items = _savedAddresses.map((addr) => {
    const title = addr.title || `${addr.province}، ${addr.city}`;
    const summary = [addr.address, addr.postal_code ? `کد پستی: ${addr.postal_code}` : ''].filter(Boolean).join(' — ');
    const checked = String(addr.id) === String(_selectedAddressId) ? ' checked' : '';
    return `
      <label class="flex items-start gap-3 flex-row-reverse p-3 rounded-xl border cursor-pointer transition-colors ${checked ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40'}">
        <input type="radio" name="saved-address" value="${escapeAttr(addr.id)}" class="mt-1"${checked}>
        <span class="text-right min-w-0 flex-1">
          <span class="block text-sm font-bold text-body">${escapeHtml(title)}</span>
          <span class="block text-xs text-muted mt-1 leading-relaxed">${escapeHtml(summary)}</span>
        </span>
      </label>`;
  }).join('');

  const newChecked = _selectedAddressId === 'new' ? ' checked' : '';
  listEl.innerHTML = `
    ${items}
    <label class="flex items-center gap-3 flex-row-reverse p-3 rounded-xl border cursor-pointer transition-colors ${newChecked ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40'}">
      <input type="radio" name="saved-address" value="new" class="shrink-0"${newChecked}>
      <span class="text-sm font-medium text-body">${escapeHtml(checkoutTexts().newAddress || 'آدرس جدید')}</span>
    </label>`;

  listEl.querySelectorAll('input[name="saved-address"]').forEach((input) => {
    input.addEventListener('change', async () => {
      _selectedAddressId = input.value;
      if (_selectedAddressId === 'new') {
        _toggleAddressFields(true);
      } else {
        const address = _savedAddresses.find((a) => String(a.id) === String(_selectedAddressId));
        await _fillFormFromAddress(address);
        _toggleAddressFields(false);
      }
      _renderSavedAddresses();
      _updateSaveAddressOption();
    });
  });

  if (_selectedAddressId !== 'new') {
    const address = _savedAddresses.find((a) => String(a.id) === String(_selectedAddressId));
    _fillFormFromAddress(address).then(() => _toggleAddressFields(false));
  } else {
    _toggleAddressFields(true);
  }

  _updateSaveAddressOption();
}

async function _loadSavedAddresses() {
  _savedAddresses = [];
  _selectedAddressId = 'new';

  if (!api.auth.isLoggedIn()) {
    _renderSavedAddresses();
    return;
  }

  try {
    const data = await api.users.getAddresses();
    _savedAddresses = Array.isArray(data) ? data : (data?.data || data?.addresses || []);
    const defaultAddress = _savedAddresses.find((a) => Number(a.is_default) === 1);
    _selectedAddressId = defaultAddress ? String(defaultAddress.id) : (_savedAddresses[0] ? String(_savedAddresses[0].id) : 'new');
  } catch {
    _savedAddresses = [];
    _selectedAddressId = 'new';
  }

  _renderSavedAddresses();
}

function _buildShippingAddress(provinceName, city, address, postalCode) {
  return `${provinceName}، ${city}، ${address} — کد پستی: ${postalCode}`;
}

async function _maybeSaveAddress(name, phone, provinceName, city, postalCode, address) {
  const saveCheckbox = document.getElementById('save-address-checkbox');
  if (!saveCheckbox?.checked || _selectedAddressId !== 'new') return;
  if (_savedAddresses.length >= maxAddresses()) {
    api.utils.toast(storeConfig.texts.profile?.maxReached || checkoutTexts().maxReached || 'حداکثر ۳ آدرس', 'warning');
    return;
  }

  await api.users.addAddress({
    title: checkoutTexts().defaultAddressTitle || 'آدرس checkout',
    province: provinceName,
    city,
    address,
    postal_code: postalCode,
    receiver: name,
    phone,
    is_default: _savedAddresses.length === 0 ? 1 : 0,
  });
}

async function _submitOrder() {
  const name = document.getElementById('customer-name')?.value.trim();
  const phone = document.getElementById('customer-phone')?.value.trim();
  const provinceEl = document.getElementById('province-select');
  const city = document.getElementById('city-select')?.value.trim();
  const postalCode = document.getElementById('postal-code')?.value.trim();
  const address = document.getElementById('shipping-address')?.value.trim();
  const provinceName = provinceEl?.selectedOptions?.[0]?.textContent?.trim() || '';
  const errEl = document.getElementById('form-error');

  if (!name || !phone || !provinceEl?.value || !city || !postalCode || !address) {
    if (errEl) { errEl.textContent = 'لطفاً تمام فیلدهای ضروری را پر کنید'; errEl.classList.remove('hidden'); }
    return;
  }
  if (errEl) errEl.classList.add('hidden');

  const fullAddress = _buildShippingAddress(provinceName, city, address, postalCode);

  const btn = document.getElementById('submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'در حال ثبت سفارش...'; }

  try {
    if (api.auth.isLoggedIn()) {
      try {
        await _maybeSaveAddress(name, phone, provinceName, city, postalCode, address);
      } catch (e) {
        api.utils.toast(e.message, 'warning');
      }
    }

    const discountCode = _checkoutDiscount
      ? document.getElementById('checkout-discount-input')?.value.trim()
      : undefined;
    const items = _checkoutCart.items.map((i) => ({ product_id: i.id, qty: i.qty }));

    const result = await api.orders.create({
      customer_name: name,
      customer_phone: phone,
      shipping_address: fullAddress,
      payment_method: 'card',
      items,
      ...(discountCode ? { discount_code: discountCode } : {}),
    });

    await api.cart.clear();
    window.loadCartCount?.();

    sessionStorage.setItem('gb_checkout', JSON.stringify({
      ...result,
      customer_name: name,
      customer_phone: phone,
      shipping_address: fullAddress,
    }));

    Router.go('/payment');
  } catch (e) {
    if (errEl) { errEl.textContent = e.message; errEl.classList.remove('hidden'); }
    if (btn) { btn.disabled = false; btn.textContent = 'ثبت سفارش'; }
  }
}

Router.onEnter('checkout', async function () {
  _checkoutDiscount = null;
  _locationsBound = false;
  _selectedAddressId = 'new';
  show('checkout-loading');
  hide('checkout-empty-msg');
  hide('checkout-form');
  hide('checkout-success');

  const user = api.auth.currentUser();
  if (user) {
    const nameEl = document.getElementById('customer-name');
    const phoneEl = document.getElementById('customer-phone');
    if (nameEl && !nameEl.value) nameEl.value = user.name || '';
    if (phoneEl && !phoneEl.value) phoneEl.value = user.phone || '';
  }

  try {
    const data = _checkoutCart = await api.cart.get();
    hide('checkout-loading');
    if (!data.items?.length) { show('checkout-empty-msg'); return; }
    show('checkout-form');
    _renderCheckoutSummary();
    await _initLocationSelects();
    await _loadSavedAddresses();
  } catch (e) {
    const el = document.getElementById('checkout-loading');
    if (el) el.innerHTML = `<p class="text-accent text-center">${e.message}</p>`;
  }

  reclone('submit-btn')?.addEventListener('click', _submitOrder);

  const newApply = reclone('checkout-apply-discount');
  if (newApply) {
    newApply.addEventListener('click', async () => {
      const code = document.getElementById('checkout-discount-input')?.value.trim();
      const msg = document.getElementById('checkout-discount-msg');
      if (!code) return;
      try {
        const res = await api.discounts.validate(code, _checkoutCart?.total || 0);
        _checkoutDiscount = res?.discount || res;
        if (msg) {
          msg.textContent = '✓ کد تخفیف اعمال شد';
          msg.className = 'text-xs mt-2 text-right text-green-600';
          msg.classList.remove('hidden');
        }
        _renderCheckoutSummary();
      } catch {
        _checkoutDiscount = null;
        if (msg) {
          msg.textContent = '✕ کد تخفیف نامعتبر است';
          msg.className = 'text-xs mt-2 text-right text-red-500';
          msg.classList.remove('hidden');
        }
      }
    });
  }
});
