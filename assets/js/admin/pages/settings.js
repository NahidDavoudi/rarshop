/**
 * admin/pages/settings.js
 * مدیریت تنظیمات فروشگاه: هویت، پرداخت، تماس، ارسال، پیامک، سئو
 */

import { mergeStoreSettings } from '../../config/bootstrap.js';
import { applyAdminBranding } from '../branding.js';

;(function () {
  'use strict';

  let _settings = null;
  let _activeTab = 'identity';
  let _bound = false;

  const TABS = ['identity', 'payment', 'contact', 'shipping', 'sms', 'seo'];

  const UPLOAD_TYPES = [
    { type: 'logo', previewId: 'settingsLogoPreview', inputId: 'settingsLogoInput' },
    { type: 'hero', previewId: 'settingsHeroPreview', inputId: 'settingsHeroInput' },
    { type: 'favicon', previewId: 'settingsFaviconPreview', inputId: 'settingsFaviconInput' },
  ];

  const FIELD_MAP = {
    shop_name: 'settingsShopName',
    shop_slogan: 'settingsShopSlogan',
    shop_description: 'settingsShopDescription',
    bank_card: 'settingsBankCard',
    bank_owner: 'settingsBankOwner',
    payment_method: 'settingsPaymentMethod',
    zarinpal_merchant_id: 'settingsMerchantId',
    contact_phone: 'settingsContactPhone',
    contact_email: 'settingsContactEmail',
    contact_address: 'settingsContactAddress',
    social_instagram: 'settingsSocialInstagram',
    social_telegram: 'settingsSocialTelegram',
    social_whatsapp: 'settingsSocialWhatsapp',
    shipping_standard_cost: 'settingsShippingCost',
    shipping_free_from: 'settingsShippingFreeFrom',
    product_shipping_text: 'settingsProductShippingText',
    min_order_amount: 'settingsMinOrder',
    sms_provider: 'settingsSmsProvider',
    sms_api_key: 'settingsSmsApiKey',
    meta_title: 'settingsMetaTitle',
    meta_description: 'settingsMetaDescription',
    notification_enabled: 'settingsNotificationEnabled',
    notification_text: 'settingsNotificationText',
    notification_bg_color: 'settingsNotificationBgColor',
    notification_text_color: 'settingsNotificationTextColor',
  };

  function _t(path, fallback) {
    return window.getAdminText?.(path, fallback) ?? fallback;
  }

  function _setVal(id, value) {
    const el = $(id);
    if (!el) return;
    if (el.type === 'checkbox') {
      el.checked = !!Number(value);
    } else {
      el.value = value ?? '';
    }
  }

  function _getVal(id) {
    const el = $(id);
    if (!el) return '';
    if (el.type === 'checkbox') return el.checked ? 1 : 0;
    return el.value.trim();
  }

  function _setPreview(id, url) {
    const el = $(id);
    if (!el) return;
    if (url) {
      el.src = url;
      el.classList.remove('hidden');
    } else {
      el.removeAttribute('src');
      el.classList.add('hidden');
    }
  }

  function _enamadToHtml(enamad) {
    if (!enamad?.href || !enamad?.logoUrl) return '';
    const codeAttr = enamad.code ? ` code='${enamad.code}'` : '';
    return `<a referrerpolicy='origin' target='_blank' href='${enamad.href}'><img referrerpolicy='origin' src='${enamad.logoUrl}' alt='' style='cursor:pointer'${codeAttr}></a>`;
  }

  function _updateEnamadPreview(enamad) {
    const wrap = $('settingsEnamadPreviewWrap');
    const preview = $('settingsEnamadPreview');
    if (!wrap || !preview) return;

    if (!enamad?.href || !enamad?.logoUrl) {
      wrap.classList.add('hidden');
      preview.innerHTML = '';
      return;
    }

    wrap.classList.remove('hidden');
    preview.innerHTML = `
      <a href="${enamad.href}" target="_blank" rel="noopener noreferrer" referrerpolicy="origin" class="inline-block">
        <img src="${enamad.logoUrl}" alt="نماد اعتماد" referrerpolicy="origin"
          ${enamad.code ? `code="${enamad.code}"` : ''}
          class="h-16 w-auto object-contain cursor-pointer">
      </a>`;
  }

  function _switchTab(tab) {
    if (!TABS.includes(tab)) return;
    _activeTab = tab;

    document.querySelectorAll('[data-settings-tab]').forEach((btn) => {
      const active = btn.dataset.settingsTab === tab;
      btn.classList.toggle('bg-accent', active);
      btn.classList.toggle('text-white', active);
      btn.classList.toggle('text-muted', !active);
      btn.classList.toggle('hover:bg-surface', !active);
    });

    document.querySelectorAll('[data-settings-panel]').forEach((panel) => {
      panel.classList.toggle('hidden', panel.dataset.settingsPanel !== tab);
    });
  }

  function _normalizeHexColor(value, fallback) {
    const raw = String(value ?? '').trim();
    if (/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(raw)) return raw;
    return fallback;
  }

  function _syncColorPickers() {
    const bg = _normalizeHexColor(_getVal('settingsNotificationBgColor'), '#c41e3a');
    const text = _normalizeHexColor(_getVal('settingsNotificationTextColor'), '#ffffff');
    $('settingsNotificationBgColorPicker')?.setAttribute('value', bg);
    $('settingsNotificationTextColorPicker')?.setAttribute('value', text);
    _updateNotificationPreview();
  }

  function _updateNotificationPreview() {
    const preview = $('settingsNotificationPreview');
    if (!preview) return;

    const enabled = $('settingsNotificationEnabled')?.checked;
    const text = _getVal('settingsNotificationText');
    if (!enabled || !text) {
      preview.classList.add('hidden');
      preview.textContent = '';
      return;
    }

    const bg = _normalizeHexColor(_getVal('settingsNotificationBgColor'), '#c41e3a');
    const color = _normalizeHexColor(_getVal('settingsNotificationTextColor'), '#ffffff');
    preview.classList.remove('hidden');
    preview.style.backgroundColor = bg;
    preview.style.color = color;
    preview.textContent = text;
  }

  function _populateForm(data) {
    Object.entries(FIELD_MAP).forEach(([key, id]) => {
      _setVal(id, data[key]);
    });

    _setPreview('settingsLogoPreview', data.shop_logo);
    _setPreview('settingsHeroPreview', data.shop_hero_image);
    _setPreview('settingsFaviconPreview', data.shop_favicon);

    _setVal('settingsEnamadHtml', data.enamad_html || _enamadToHtml(data.enamad));
    _updateEnamadPreview(data.enamad);

    _syncColorPickers();
    _togglePaymentFields();
    _toggleSmsFields();
  }

  function _togglePaymentFields() {
    const method = _getVal('settingsPaymentMethod');
    const wrap = $('settingsMerchantWrap');
    if (!wrap) return;
    wrap.classList.toggle('hidden', !['zarinpal', 'both'].includes(method));
  }

  function _toggleSmsFields() {
    const enabled = $('settingsSmsEnabled')?.checked;
    ['settingsSmsProvider', 'settingsSmsApiKey'].forEach((id) => {
      const el = $(id);
      if (el) el.closest('[data-sms-field]')?.classList.toggle('hidden', !enabled);
    });
  }

  function _collectPayload() {
    const payload = {
      shop_name: _getVal('settingsShopName'),
      shop_slogan: _getVal('settingsShopSlogan'),
      shop_description: _getVal('settingsShopDescription'),
      bank_card: _getVal('settingsBankCard'),
      bank_owner: _getVal('settingsBankOwner'),
      payment_method: _getVal('settingsPaymentMethod'),
      zarinpal_merchant_id: _getVal('settingsMerchantId') || null,
      contact_phone: _getVal('settingsContactPhone'),
      contact_email: _getVal('settingsContactEmail'),
      contact_address: _getVal('settingsContactAddress'),
      social_instagram: _getVal('settingsSocialInstagram'),
      social_telegram: _getVal('settingsSocialTelegram'),
      social_whatsapp: _getVal('settingsSocialWhatsapp'),
      shipping_standard_cost: Number(_getVal('settingsShippingCost') || 0),
      shipping_free_from: Number(_getVal('settingsShippingFreeFrom') || 0),
      min_order_amount: Number(_getVal('settingsMinOrder') || 0),
      product_shipping_text: _getVal('settingsProductShippingText') || null,
      sms_enabled: _getVal('settingsSmsEnabled'),
      sms_provider: _getVal('settingsSmsProvider'),
      sms_api_key: _getVal('settingsSmsApiKey') || null,
      meta_title: _getVal('settingsMetaTitle'),
      meta_description: _getVal('settingsMetaDescription'),
      notification_enabled: _getVal('settingsNotificationEnabled'),
      notification_text: _getVal('settingsNotificationText'),
      notification_bg_color: _normalizeHexColor(_getVal('settingsNotificationBgColor'), '#c41e3a'),
      notification_text_color: _normalizeHexColor(_getVal('settingsNotificationTextColor'), '#ffffff'),
      enamad_html: _getVal('settingsEnamadHtml') || null,
    };

    return payload;
  }

  async function _saveSettings() {
    const btn = $('settingsSaveBtn');
    if (!btn) return;

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = _t('settings.saving', 'در حال ذخیره...');

    try {
      const data = await API.settings.adminUpdate(_collectPayload());
      _settings = data;
      _populateForm(data);
      mergeStoreSettings(data);
      applyAdminBranding();
      _updateEnamadPreview(data.enamad);
      toast(_t('settings.saved', 'تنظیمات ذخیره شد'));
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  async function _uploadImage(type, file) {
    if (!file) return;

    try {
      setLoading(true);
      const result = await API.settings.uploadImage(type, file);
      _settings = result.settings || result;
      _populateForm(_settings);
      mergeStoreSettings(_settings);
      applyAdminBranding();
      toast(_t('settings.uploadSuccess', 'تصویر آپلود شد'));
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function _bindEvents() {
    if (_bound) return;
    _bound = true;

    document.querySelectorAll('[data-settings-tab]').forEach((btn) => {
      btn.addEventListener('click', () => _switchTab(btn.dataset.settingsTab));
    });

    $('settingsPaymentMethod')?.addEventListener('change', _togglePaymentFields);
    $('settingsSmsEnabled')?.addEventListener('change', _toggleSmsFields);
    $('settingsSaveBtn')?.addEventListener('click', _saveSettings);

    ['settingsNotificationEnabled', 'settingsNotificationText'].forEach((id) => {
      $(id)?.addEventListener('input', _updateNotificationPreview);
      $(id)?.addEventListener('change', _updateNotificationPreview);
    });

    $('settingsNotificationBgColorPicker')?.addEventListener('input', (e) => {
      _setVal('settingsNotificationBgColor', e.target.value);
      _updateNotificationPreview();
    });
    $('settingsNotificationTextColorPicker')?.addEventListener('input', (e) => {
      _setVal('settingsNotificationTextColor', e.target.value);
      _updateNotificationPreview();
    });
    $('settingsNotificationBgColor')?.addEventListener('input', _syncColorPickers);
    $('settingsNotificationTextColor')?.addEventListener('input', _syncColorPickers);

    UPLOAD_TYPES.forEach(({ type, inputId }) => {
      const input = $(inputId);
      if (!input) return;
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (file) _uploadImage(type, file);
        input.value = '';
      });
    });
  }

  window.triggerSettingsUpload = function (inputId) {
    $(inputId)?.click();
  };

  window.loadSettings = async function () {
    const container = $('settingsContainer');
    if (!container) return;

    _bindEvents();
    _switchTab(_activeTab);

    if (!_settings) {
      container.classList.add('opacity-50', 'pointer-events-none');
      try {
        _settings = await API.settings.adminGet();
        _populateForm(_settings);
      } catch (e) {
        toast(e.message, 'error');
      } finally {
        container.classList.remove('opacity-50', 'pointer-events-none');
      }
    } else {
      _populateForm(_settings);
    }

    if (window.lucide) lucide.createIcons();
  };
})();
