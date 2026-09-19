/**
 * admin/pages/categories.js
 * مدیریت دسته‌بندی‌ها: لیست، ایجاد، ویرایش، حذف، آپلود پوستر
 * وابستگی: helpers.js, api.js
 */

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
            <button onclick="editCategory(${c.id},'${c.name.replace(/'/g, "\\'")}','${(c.slug || '').replace(/'/g, "\\'")}','${(c.poster_image || c.main_image || '').replace(/'/g, "\\'")}')"
                    class="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="${_t('common.edit', 'ویرایش')}">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-1.414.914l-3 1 1-3a4 4 0 01.914-1.414z"/>
              </svg>
            </button>
            <button onclick="deleteCategory(${c.id},'${c.name.replace(/'/g, "\\'")}')"
                    class="p-2 rounded-lg hover:bg-accent/10 text-accent transition-colors" title="${_t('common.delete', 'حذف')}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>`).join('');
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
