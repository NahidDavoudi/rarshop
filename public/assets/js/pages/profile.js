/**
 * pages/profile.js — مدیریت آدرس‌های کاربر
 */
import api from '../core/api.js';
import Router from '../core/router.js';
import { storeConfig } from '../config/bootstrap.js';
import AddressCard from '../components/AddressCard.js';
import AddressForm from '../components/AddressForm.js';
import { loadIranLocations, fillSelect } from '../utils/iranLocations.js';
import DOM from '../utils/dom.js';

const { show, hide, text } = DOM;

const FORM_PREFIX = 'profile-addr';
const texts = () => storeConfig.texts.profile || {};
const maxAddresses = () => storeConfig.addresses?.maxCount || 3;

let _addresses = [];
let _locations = null;
let _editingId = null;
let _locationsBound = false;

function _findProvinceId(provinceName) {
  if (!_locations || !provinceName) return '';
  const match = _locations.provinces.find((p) => p.name === provinceName);
  return match?.id || '';
}

function _resetCitySelect(cityEl) {
  fillSelect(cityEl, [], 'ابتدا استان انتخاب کنید');
  cityEl.disabled = true;
}

async function _initProvinceSelect(provinceEl, cityEl, values = {}) {
  if (!_locations) {
    _locations = await loadIranLocations(storeConfig.data.iranLocations);
  }

  fillSelect(
    provinceEl,
    _locations.provinces.map((p) => ({ value: p.id, label: p.name })),
    'انتخاب استان...',
  );

  const provinceId = _findProvinceId(values.province);
  if (provinceId) {
    provinceEl.value = provinceId;
    const cities = _locations.getCities(provinceId).map((name) => ({ value: name, label: name }));
    fillSelect(cityEl, cities, 'انتخاب شهر...');
    cityEl.disabled = false;
    if (values.city) cityEl.value = values.city;
  } else {
    _resetCitySelect(cityEl);
  }
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

function _renderAddressList() {
  const listEl = document.getElementById('profile-address-list');
  const addBtn = document.getElementById('profile-add-address-btn');
  const slotEl = document.getElementById('profile-address-slot');
  const emptyEl = document.getElementById('profile-address-empty');
  if (!listEl) return;

  const t = texts();
  const atMax = _addresses.length >= maxAddresses();

  if (slotEl) {
    slotEl.textContent = `${_addresses.length.toLocaleString('fa-IR')} از ${maxAddresses().toLocaleString('fa-IR')} آدرس`;
  }

  if (addBtn) {
    addBtn.disabled = atMax;
    addBtn.classList.toggle('opacity-50', atMax);
    addBtn.title = atMax ? (t.maxReached || '') : '';
  }

  if (!_addresses.length) {
    listEl.innerHTML = '';
    show('profile-address-empty');
    return;
  }

  hide('profile-address-empty');
  listEl.innerHTML = _addresses.map((addr) => AddressCard.render(addr, t)).join('');
  AddressCard.bind(listEl, {
    onEdit: _openEditModal,
    onDelete: _deleteAddress,
    onSetDefault: _setDefaultAddress,
  });
}

function _closeModal() {
  hide('profile-address-modal');
  _editingId = null;
  AddressForm.showError(FORM_PREFIX, '');
}

async function _openAddModal() {
  if (_addresses.length >= maxAddresses()) {
    api.utils.toast(texts().maxReached, 'warning');
    return;
  }

  _editingId = null;
  text('profile-address-modal-title', texts().addAddress);

  const body = document.getElementById('profile-address-modal-body');
  if (!body) return;

  body.innerHTML = AddressForm.render({ prefix: FORM_PREFIX, texts: texts(), showTitle: true, showDefault: true });
  show('profile-address-modal');

  const provinceEl = document.getElementById(`${FORM_PREFIX}-province`);
  const cityEl = document.getElementById(`${FORM_PREFIX}-city`);
  if (provinceEl && cityEl) {
    await _initProvinceSelect(provinceEl, cityEl);
    _bindLocationSelects(provinceEl, cityEl);
  }
}

async function _openEditModal(id) {
  const address = _addresses.find((a) => Number(a.id) === Number(id));
  if (!address) return;

  _editingId = id;
  text('profile-address-modal-title', texts().editAddress);

  const body = document.getElementById('profile-address-modal-body');
  if (!body) return;

  body.innerHTML = AddressForm.render({
    prefix: FORM_PREFIX,
    texts: texts(),
    values: address,
    showTitle: true,
    showDefault: true,
  });
  show('profile-address-modal');

  const provinceEl = document.getElementById(`${FORM_PREFIX}-province`);
  const cityEl = document.getElementById(`${FORM_PREFIX}-city`);
  if (provinceEl && cityEl) {
    await _initProvinceSelect(provinceEl, cityEl, address);
    _bindLocationSelects(provinceEl, cityEl);
  }
}

async function _saveAddress() {
  const data = AddressForm.readValues(FORM_PREFIX);

  if (!data.province || !data.city || !data.address) {
    AddressForm.showError(FORM_PREFIX, 'استان، شهر و آدرس الزامی است');
    return;
  }

  AddressForm.showError(FORM_PREFIX, '');

  try {
    if (_editingId) {
      await api.users.updateAddress(_editingId, data);
      api.utils.toast(texts().updated, 'success');
    } else {
      await api.users.addAddress(data);
      api.utils.toast(texts().saved, 'success');
    }

    _closeModal();
    await _loadAddresses();
  } catch (e) {
    AddressForm.showError(FORM_PREFIX, e.message);
  }
}

async function _deleteAddress(id) {
  if (!window.confirm(texts().confirmDelete)) return;

  try {
    await api.users.deleteAddress(id);
    api.utils.toast(texts().deleted, 'success');
    await _loadAddresses();
  } catch (e) {
    api.utils.toast(e.message, 'error');
  }
}

async function _setDefaultAddress(id) {
  try {
    await api.users.updateAddress(id, { is_default: 1 });
    await _loadAddresses();
  } catch (e) {
    api.utils.toast(e.message, 'error');
  }
}

async function _loadAddresses() {
  const data = await api.users.getAddresses();
  _addresses = Array.isArray(data) ? data : (data?.data || data?.addresses || []);
  _renderAddressList();
}

Router.onEnter('profile', async function () {
  show('profile-loading');
  hide('profile-need-login');
  hide('profile-content');

  if (!api.auth.isLoggedIn()) {
    hide('profile-loading');
    show('profile-need-login');
    return;
  }

  try {
    const profile = await api.users.getProfile();
    text('profile-user-name', profile?.name || 'کاربر');
    text('profile-user-phone', profile?.phone || '');

    await _loadAddresses();
    hide('profile-loading');
    show('profile-content');
  } catch (e) {
    const el = document.getElementById('profile-loading');
    if (el) el.innerHTML = `<p class="text-red-500 text-center">${e.message}</p>`;
  }

  DOM.reclone('profile-add-address-btn')?.addEventListener('click', _openAddModal);
  DOM.reclone('profile-address-save-btn')?.addEventListener('click', _saveAddress);
  DOM.reclone('profile-address-cancel-btn')?.addEventListener('click', _closeModal);
  document.getElementById('profile-address-modal')?.addEventListener('click', (ev) => {
    if (ev.target.id === 'profile-address-modal') _closeModal();
  });
});
