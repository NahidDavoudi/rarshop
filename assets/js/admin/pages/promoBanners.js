/**
 * admin/pages/promoBanners.js — مدیریت پوسترهای تبلیغاتی صفحه اصلی
 */

import Button from '../../components/Button.js';

;(function () {
  'use strict';

  let _list = [];

  function _t(path, fallback) {
    return window.getAdminText?.(path, fallback) ?? fallback;
  }

  function _esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderList(list) {
    const el = $('promoBannersContainer');
    if (!el) return;

    _list = Array.isArray(list) ? list : [];

    if (!_list.length) {
      el.innerHTML = `<p class="text-dim col-span-full text-center py-8">${_t('promoBanners.empty', 'پوستری ثبت نشده')}</p>`;
      return;
    }

    el.innerHTML = _list.map((b, index) => {
      const active = Number(b.is_active) === 1;
      const statusBadge = active
        ? 'bg-green-100 text-green-800 border border-green-200'
        : 'bg-surface text-dim border border-border';
      const statusLabel = active
        ? _t('promoBanners.active', 'فعال')
        : _t('promoBanners.inactive', 'غیرفعال');

      return `
        <div class="admin-card rounded-2xl overflow-hidden border border-border bg-body flex flex-col" data-banner-id="${b.id}">
          <div class="aspect-[21/9] bg-surface overflow-hidden">
            <img src="${_esc(b.image_url)}" alt="${_esc(b.title || 'پوستر')}" class="w-full h-full object-cover">
          </div>
          <div class="p-4 space-y-3 flex-1 flex flex-col">
            <div class="flex items-center justify-between gap-2">
              <input type="text" value="${_esc(b.title || '')}" placeholder="${_t('promoBanners.titlePlaceholder', 'عنوان (alt)')}"
                class="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-body focus:border-accent outline-none"
                onchange="updatePromoBannerTitle(${b.id}, this.value)">
              <span class="text-xs px-2.5 py-1 rounded-full font-bold whitespace-nowrap ${statusBadge}">${statusLabel}</span>
            </div>
            <div class="flex flex-wrap gap-2 pt-2 border-t border-border mt-auto">
              ${Button.render({
                variant: 'secondary', size: 'sm',
                label: _t('promoBanners.moveUp', 'بالا'),
                disabled: index === 0,
                attrs: { onclick: `movePromoBanner(${b.id}, -1)` },
              })}
              ${Button.render({
                variant: 'secondary', size: 'sm',
                label: _t('promoBanners.moveDown', 'پایین'),
                disabled: index === _list.length - 1,
                attrs: { onclick: `movePromoBanner(${b.id}, 1)` },
              })}
              ${Button.render({
                variant: 'secondary', size: 'sm', className: 'flex-1',
                label: active ? _t('promoBanners.deactivate', 'غیرفعال') : _t('promoBanners.activate', 'فعال'),
                attrs: { onclick: `togglePromoBanner(${b.id}, ${active ? 0 : 1})` },
              })}
              ${Button.render({
                variant: 'soft', size: 'sm', className: 'flex-1',
                label: _t('promoBanners.delete', 'حذف'),
                attrs: { onclick: `deletePromoBanner(${b.id})` },
              })}
            </div>
          </div>
        </div>`;
    }).join('');
  }

  async function _reload() {
    const el = $('promoBannersContainer');
    if (!el) return;
    el.innerHTML = `<p class="text-dim col-span-full text-center py-8 animate-pulse">${_t('promoBanners.loading', 'در حال بارگذاری...')}</p>`;
    try {
      const list = await API.promoBanners.adminList();
      renderList(Array.isArray(list) ? list : (list?.data || []));
    } catch (e) {
      el.innerHTML = `<p class="text-accent col-span-full text-center py-8">${e.message}</p>`;
    }
    if (window.lucide) lucide.createIcons();
  }

  window.loadPromoBanners = async function () {
    await _reload();
  };

  window.triggerPromoBannerUpload = function () {
    $('promoBannerFileInput')?.click();
  };

  window.handlePromoBannerUpload = async function (input) {
    const file = input?.files?.[0];
    if (!file) return;
    const title = $('promoBannerTitleInput')?.value?.trim() || '';
    try {
      setLoading(true);
      await API.promoBanners.create(file, title);
      if ($('promoBannerTitleInput')) $('promoBannerTitleInput').value = '';
      input.value = '';
      toast(_t('promoBanners.uploadSuccess', 'پوستر اضافه شد'));
      await _reload();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  window.updatePromoBannerTitle = async function (id, title) {
    try {
      await API.promoBanners.update(id, { title });
      toast(_t('promoBanners.saved', 'ذخیره شد'));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  window.togglePromoBanner = async function (id, isActive) {
    try {
      await API.promoBanners.update(id, { is_active: isActive });
      toast(_t('promoBanners.saved', 'ذخیره شد'));
      await _reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  window.deletePromoBanner = async function (id) {
    if (!confirm(_t('promoBanners.confirmDelete', 'حذف شود؟'))) return;
    try {
      await API.promoBanners.delete(id);
      toast(_t('promoBanners.deleted', 'پوستر حذف شد'));
      await _reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  window.movePromoBanner = async function (id, direction) {
    const idx = _list.findIndex((b) => Number(b.id) === Number(id));
    if (idx < 0) return;
    const next = idx + direction;
    if (next < 0 || next >= _list.length) return;

    const ids = _list.map((b) => b.id);
    [ids[idx], ids[next]] = [ids[next], ids[idx]];

    try {
      await API.promoBanners.reorder(ids);
      await _reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };
})();
