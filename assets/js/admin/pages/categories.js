/**
 * admin/pages/categories.js
 * مدیریت دسته‌بندی‌ها: لیست، ایجاد، ویرایش، حذف، آپلود پوستر
 * وابستگی: helpers.js, api.js
 */
import Button from '../../components/Button.js';

;(function () {
  'use strict';

  function _t(path, fallback) {
    return window.getAdminText?.(path, fallback) ?? fallback;
  }

  let _editingCatId = null;

  /* ── Public loader ─────────────────────────────────────────── */
  window.loadCategories = async function () {
    try {
      setLoading(true);
      const catsRes = await API.categories.list();
      const cats    = catsRes.data || catsRes || [];
      setLoading(false);
      _renderCategories(cats);
    } catch (e) {
      setLoading(false);
      toast(e.message, 'error');
    }
  };

  /* ── Render table ──────────────────────────────────────────── */
  function _renderCategories(cats) {
    const tbody = $('categoriesTableBody');
    if (!tbody) return;
    if (!cats.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-12 text-dim">${_t('categories.empty', 'دسته‌بندی‌ای یافت نشد')}</td></tr>`;
      return;
    }
    tbody.innerHTML = cats.map((c, i) => `
      <tr class="hover:bg-row transition-colors">
        <td class="px-5 py-4 text-dim text-sm">${i + 1}</td>
        <td class="px-5 py-4">
          <div class="flex items-center gap-3">
            ${(c.poster_image || c.main_image)
              ? `<img src="${c.poster_image || c.main_image}" class="w-10 h-10 rounded-xl object-cover bg-surface">`
              : `<div class="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-dim">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                           d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01"/>
                   </svg>
                 </div>`}
            <span class="font-medium text-body">${c.name}</span>
          </div>
        </td>
        <td class="px-5 py-4 text-muted text-sm font-mono">${c.slug || '—'}</td>
        <td class="px-5 py-4">
          <div class="flex gap-1">
            ${Button.render({
              variant: 'ghost',
              size: 'icon',
              icon: '<i data-lucide="pencil" class="w-5 h-5"></i>',
              attrs: {
                onclick: `editCategory(${c.id},'${c.name.replace(/'/g, "\\'")}','${(c.slug || '').replace(/'/g, "\\'")}','${(c.poster_image || c.main_image || '').replace(/'/g, "\\'")}')`,
                title: _t('common.edit', 'ویرایش'),
              },
            })}
            ${Button.render({
              variant: 'ghostAccent',
              size: 'icon',
              icon: '<i data-lucide="trash-2" class="w-4 h-4"></i>',
              attrs: {
                onclick: `deleteCategory(${c.id},'${c.name.replace(/'/g, "\\'")}')`,
                title: _t('common.delete', 'حذف'),
              },
            })}
          </div>
        </td>
      </tr>`).join('');
    if (window.lucide) lucide.createIcons();
  }

  /* ── Modal: new ────────────────────────────────────────────── */
  window.showCategoryModal = function () {
    _editingCatId = null;
    $('categoryForm')?.reset();
    const ci = $('categoryId');       if (ci) ci.value = '';
    const cp = $('catImagePreview');  if (cp) { cp.src = ''; cp.classList.add('hidden'); }
    setText('categoryModalTitle', _t('categories.modalAdd', 'افزودن دسته‌بندی'));
    setText('categorySubmitText', _t('categories.save', 'ذخیره'));
    showModal('categoryModal');
  };

  /* ── Modal: edit ───────────────────────────────────────────── */
  window.editCategory = function (id, name, slug, imageUrl) {
    _editingCatId = id;
    const ci = $('categoryId');   if (ci) ci.value = id;
    const cn = $('categoryName'); if (cn) cn.value = name;
    const cs = $('categorySlug'); if (cs) cs.value = slug;
    const cp = $('catImagePreview');
    if (cp) {
      if (imageUrl) { cp.src = imageUrl; cp.classList.remove('hidden'); }
      else          { cp.src = '';        cp.classList.add('hidden');    }
    }
    setText('categoryModalTitle', _t('categories.modalEdit', 'ویرایش دسته‌بندی'));
    setText('categorySubmitText', _t('categories.update', 'بروزرسانی'));
    showModal('categoryModal');
  };

  /* ── Delete ────────────────────────────────────────────────── */
  window.deleteCategory = async function (id, name) {
    if (!confirm(`حذف دسته‌بندی "${name}"؟`)) return;
    try {
      setLoading(true);
      await API.categories.delete(id);
      setLoading(false);
      toast('دسته‌بندی حذف شد');
      window.loadCategories();
    } catch (e) {
      setLoading(false);
      toast(e.message, 'error');
    }
  };

  /* ── Save / update form ────────────────────────────────────── */
  $('categoryForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const payload = {
      name: getVal('categoryName'),
      slug: getVal('categorySlug'),
    };
    if (!payload.name) { toast(_t('common.nameRequired', 'نام الزامی است'), 'error'); return; }

    try {
      setLoading(true);
      let catId = _editingCatId;
      if (_editingCatId) {
        await API.categories.update(_editingCatId, payload);
        toast('دسته‌بندی بروزرسانی شد');
      } else {
        const res = await API.categories.create(payload);
        catId     = res.data?.id || res.id;
        toast('دسته‌بندی ایجاد شد');
      }

      const imgInput = $('catImageInput');
      if (catId && imgInput?.files?.length) {
        try {
          await API.categories.uploadPoster(catId, imgInput.files[0]);
          imgInput.value = '';
        } catch (imgErr) {
          toast('دسته‌بندی ذخیره شد ولی آپلود پوستر ناموفق: ' + imgErr.message, 'info');
        }
      }

      setLoading(false);
      hideModal('categoryModal');
      window.loadCategories();
    } catch (e) {
      setLoading(false);
      toast(e.message, 'error');
    }
  });
  /* ── Image picker wiring ───────────────────────────────────── */
  const btn      = $('catImageBtn');
  const input    = $('catImageInput');
  const preview  = $('catImagePreview');

  btn?.addEventListener('click', () => input?.click());

  input?.addEventListener('change', function () {
    const file = this.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (preview) {
      preview.src = url;
      preview.classList.remove('hidden');
    }
  });
})();
