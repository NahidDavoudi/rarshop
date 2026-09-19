/**
 * admin/pages/products/productList.js
 */
import { openProductEditor, initProductEditor } from './productEditor.js';
import { renderImageWithFallback } from '../../../utils/imagePlaceholder.js';
import { escapeHtml } from '../../../utils/htmlEscape.js';

let _products = [];
let _categories = [];

function _t(path, fallback) {
  return window.getAdminText?.(path, fallback) ?? fallback;
}

function _statusBadge(status) {
  const map = {
    draft: ['bg-card text-muted', _t('products.statusDraft', 'پیش‌نویس')],
    active: ['bg-green-100 text-green-800', _t('products.statusActive', 'فعال')],
    archived: ['bg-red-100 text-red-700', _t('products.statusArchived', 'آرشیو')],
  };
  const [cls, label] = map[status] || map.draft;
  return `<span class="px-2 py-1 rounded-full text-xs font-medium ${cls}">${label}</span>`;
}

function _fillCatFilter() {
  ['productCategoryFilter', 'productCategory'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const opts = _categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    el.innerHTML = id === 'productCategoryFilter'
      ? `<option value="">${_t('products.allCategories', 'همه دسته‌بندی‌ها')}</option>` + opts
      : `<option value="">${_t('products.selectCategory', 'انتخاب دسته‌بندی')}</option>` + opts;
  });
}

function _renderProducts(list) {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-12 text-dim">${_t('products.empty', 'محصولی یافت نشد')}</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((p) => {
    const img = p.main_image || p.images?.find((i) => i.is_main)?.url || p.images?.[0]?.url || '';
    const stockCls = p.stock === 0 ? 'text-accent' : p.stock < 5 ? 'text-yellow-600' : 'text-green-600';
    const priceLabel = p.price_min != null && p.price_max != null && p.price_min !== p.price_max
      ? `${window.API.utils.formatPrice(p.price_min)} – ${window.API.utils.formatPrice(p.price_max)}`
      : window.API.utils.formatPrice(p.price);

    return `<tr class="hover:bg-row transition-colors">
      <td class="px-4 py-3">
        <div class="w-12 h-12 rounded-xl overflow-hidden bg-surface relative">
          ${renderImageWithFallback({ src: img, alt: p.name, iconSize: 'w-5 h-5' })}
        </div>
      </td>
      <td class="px-4 py-3">
        <p class="font-medium text-body text-sm">${escapeHtml(p.name)}</p>
        <p class="text-xs text-dim">${escapeHtml(p.slug || '')}</p>
      </td>
      <td class="px-4 py-3 text-sm">${priceLabel}</td>
      <td class="px-4 py-3 text-sm font-bold ${stockCls}">${p.stock ?? 0}</td>
      <td class="px-4 py-3 text-sm text-muted">${p.variant_count ?? 1}</td>
      <td class="px-4 py-3 text-sm text-muted">${escapeHtml(p.category_name || '—')}</td>
      <td class="px-4 py-3">${_statusBadge(p.status || (p.is_active ? 'active' : 'archived'))}</td>
      <td class="px-4 py-3">
        <div class="flex gap-1">
          <button onclick="editProduct(${p.id})" title="${_t('common.edit', 'ویرایش')}"
                  class="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-1.414.914l-3 1 1-3a4 4 0 01.914-1.414z"/>
            </svg>
          </button>
          <button onclick="deleteProduct(${p.id},'${escapeHtml(p.name).replace(/'/g, "\\'")}')" title="${_t('common.delete', 'حذف')}"
                  class="p-2 rounded-lg hover:bg-accent/10 text-accent transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

window.loadProducts = async function () {
  try {
    window.setLoading(true);
    const [data, catsRes] = await Promise.all([
      window.API.products.list({ limit: 100 }),
      window.API.categories.list(),
    ]);
    window.setLoading(false);
    _products = data.data?.data || data.data || [];
    _categories = Array.isArray(catsRes) ? catsRes : (catsRes.data || []);
    _renderProducts(_products);
    _fillCatFilter();
  } catch (e) {
    window.setLoading(false);
    window.toast(e.message, 'error');
  }
};

window.deleteProduct = async function (id, name) {
  if (!confirm(`آیا از حذف "${name}" مطمئن هستید؟`)) return;
  try {
    window.setLoading(true);
    await window.API.products.delete(id);
    window.setLoading(false);
    window.toast('محصول حذف شد');
    window.loadProducts();
  } catch (e) {
    window.setLoading(false);
    window.toast(e.message, 'error');
  }
};

window.uploadProductImage = function (input) {
  const grid = document.getElementById('productImagesGrid');
  if (!grid) return;
  const files = Array.from(input.files);
  if (!files.length) return;

  files.forEach((f, idx) => {
    if (!f.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const div = document.createElement('div');
      div.id = `img-preview-${Date.now()}-${idx}`;
      div.style.cssText = 'position:relative;aspect-ratio:1;border-radius:12px;overflow:hidden;background:#f5f5f4;';
      div.innerHTML = `
        <img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">
        <div class="upload-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;">
          <span style="color:#fff;font-size:10px;">در حال آپلود...</span>
        </div>`;
      grid.appendChild(div);
    };
    reader.readAsDataURL(f);
  });
};

document.getElementById('productSearch')?.addEventListener('input', function () {
  const q = this.value.toLowerCase();
  _renderProducts(_products.filter((p) =>
    p.name.toLowerCase().includes(q) || (p.category_name || '').toLowerCase().includes(q),
  ));
});

document.getElementById('productCategoryFilter')?.addEventListener('change', function () {
  _renderProducts(this.value
    ? _products.filter((p) => String(p.category_id) === this.value)
    : _products);
});

initProductEditor();

export default { loadProducts: window.loadProducts };
