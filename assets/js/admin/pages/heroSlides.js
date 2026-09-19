/**
 * admin/pages/heroSlides.js — مدیریت تصاویر Hero صفحه اصلی
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
    const el = $('heroSlidesContainer');
    if (!el) return;

    _list = Array.isArray(list) ? list : [];

    if (!_list.length) {
      el.innerHTML = `<p class="text-dim col-span-full text-center py-8">${_t('heroSlides.empty', 'تصویری ثبت نشده')}</p>`;
      return;
    }

    el.innerHTML = _list.map((slide, index) => {
      const active = Number(slide.is_active) === 1;
      const statusBadge = active
        ? 'bg-green-100 text-green-800 border border-green-200'
        : 'bg-surface text-dim border border-border';
      const statusLabel = active
        ? _t('heroSlides.active', 'فعال')
        : _t('heroSlides.inactive', 'غیرفعال');

      return `
        <div class="admin-card rounded-2xl overflow-hidden border border-border bg-body flex flex-col" data-slide-id="${slide.id}">
          <div class="aspect-[21/9] bg-surface overflow-hidden">
            <img src="${_esc(slide.image_url)}" alt="${_t('heroSlides.imageAlt', 'تصویر Hero')}" class="w-full h-full object-cover">
          </div>
          <div class="p-4 flex flex-col gap-3 flex-1">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm text-muted">${_t('heroSlides.imageOnlyHint', 'فقط تصویر پس‌زمینه — متن و دکمه‌ها از تنظیمات فروشگاه')}</span>
              <span class="text-xs px-2.5 py-1 rounded-full font-bold whitespace-nowrap ${statusBadge}">${statusLabel}</span>
            </div>
            <div class="flex flex-wrap gap-2 pt-2 border-t border-border mt-auto">
              <button type="button" onclick="moveHeroSlide(${slide.id}, -1)" ${index === 0 ? 'disabled' : ''}
                class="py-2 px-3 text-xs font-bold bg-surface hover:bg-card text-muted border border-border rounded-lg transition-all disabled:opacity-40">
                ${_t('heroSlides.moveUp', 'بالا')}
              </button>
              <button type="button" onclick="moveHeroSlide(${slide.id}, 1)" ${index === _list.length - 1 ? 'disabled' : ''}
                class="py-2 px-3 text-xs font-bold bg-surface hover:bg-card text-muted border border-border rounded-lg transition-all disabled:opacity-40">
                ${_t('heroSlides.moveDown', 'پایین')}
              </button>
              <button type="button" onclick="toggleHeroSlide(${slide.id}, ${active ? 0 : 1})"
                class="flex-1 py-2 text-xs font-bold bg-surface hover:bg-card text-muted border border-border rounded-lg transition-all">
                ${active ? _t('heroSlides.deactivate', 'غیرفعال') : _t('heroSlides.activate', 'فعال')}
              </button>
              <button type="button" onclick="deleteHeroSlide(${slide.id})"
                class="flex-1 py-2 text-xs font-bold bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 rounded-lg transition-all">
                ${_t('heroSlides.delete', 'حذف')}
              </button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  async function _reload() {
    const el = $('heroSlidesContainer');
    if (!el) return;
    el.innerHTML = `<p class="text-dim col-span-full text-center py-8 animate-pulse">${_t('heroSlides.loading', 'در حال بارگذاری...')}</p>`;
    try {
      const list = await API.heroSlides.adminList();
      renderList(Array.isArray(list) ? list : (list?.data || []));
    } catch (e) {
      el.innerHTML = `<p class="text-accent col-span-full text-center py-8">${e.message}</p>`;
    }
    if (window.lucide) lucide.createIcons();
  }

  window.loadHeroSlides = async function () {
    await _reload();
  };

  window.triggerHeroSlideUpload = function () {
    $('heroSlideFileInput')?.click();
  };

  window.handleHeroSlideUpload = async function (input) {
    const file = input?.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      await API.heroSlides.create(file);
      input.value = '';
      toast(_t('heroSlides.uploadSuccess', 'تصویر Hero اضافه شد'));
      await _reload();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  window.toggleHeroSlide = async function (id, isActive) {
    try {
      await API.heroSlides.update(id, { is_active: isActive });
      toast(_t('heroSlides.saved', 'ذخیره شد'));
      await _reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  window.deleteHeroSlide = async function (id) {
    if (!confirm(_t('heroSlides.confirmDelete', 'حذف شود؟'))) return;
    try {
      await API.heroSlides.delete(id);
      toast(_t('heroSlides.deleted', 'تصویر حذف شد'));
      await _reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  window.moveHeroSlide = async function (id, direction) {
    const idx = _list.findIndex((s) => Number(s.id) === Number(id));
    if (idx < 0) return;
    const next = idx + direction;
    if (next < 0 || next >= _list.length) return;

    const ids = _list.map((s) => s.id);
    [ids[idx], ids[next]] = [ids[next], ids[idx]];

    try {
      await API.heroSlides.reorder(ids);
      await _reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };
})();
