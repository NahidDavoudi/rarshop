/**
 * admin/pages/promoBanners.js — مدیریت پوسترهای تبلیغاتی صفحه اصلی
 */

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
              <button type="button" onclick="movePromoBanner(${b.id}, -1)" ${index === 0 ? 'disabled' : ''}
                class="py-2 px-3 text-xs font-bold bg-surface hover:bg-card text-muted border border-border rounded-lg transition-all disabled:opacity-40">
                ${_t('promoBanners.moveUp', 'بالا')}
              </button>
              <button type="button" onclick="movePromoBanner(${b.id}, 1)" ${index === _list.length - 1 ? 'disabled' : ''}
                class="py-2 px-3 text-xs font-bold bg-surface hover:bg-card text-muted border border-border rounded-lg transition-all disabled:opacity-40">
                ${_t('promoBanners.moveDown', 'پایین')}
              </button>
              <button type="button" onclick="togglePromoBanner(${b.id}, ${active ? 0 : 1})"
                class="flex-1 py-2 text-xs font-bold bg-surface hover:bg-card text-muted border border-border rounded-lg transition-all">
                ${active ? _t('promoBanners.deactivate', 'غیرفعال') : _t('promoBanners.activate', 'فعال')}
              </button>
              <button type="button" onclick="deletePromoBanner(${b.id})"
                class="flex-1 py-2 text-xs font-bold bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 rounded-lg transition-all">
                ${_t('promoBanners.delete', 'حذف')}
              </button>
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
