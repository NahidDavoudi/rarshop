import GeneralTab from './tabs/generalTab.js';
import VariantGrid from './tabs/variantGridTab.js';
import MediaTab from './tabs/mediaTab.js';

let _editingProdId = null;
let _categories = [];
let _currentProduct = null;
let _isFullPage = false;
let _dirty = false;
let _fullPageInit = false;

function _t(path, fallback) {
  return window.getAdminText?.(path, fallback) ?? fallback;
}

function _texts() {
  return {
    name: _t('products.name', 'نام محصول'),
    slug: _t('products.slug', 'شناسه (slug)'),
    status: _t('products.status', 'وضعیت'),
    statusDraft: _t('products.statusDraft', 'پیش‌نویس'),
    statusActive: _t('products.statusActive', 'فعال'),
    statusArchived: _t('products.statusArchived', 'آرشیو'),
    shortDesc: _t('products.shortDesc', 'توضیح کوتاه'),
    fullDesc: _t('products.fullDesc', 'توضیحات کامل'),
    category: _t('products.category', 'دسته‌بندی'),
    selectCategory: _t('products.selectCategory', 'انتخاب دسته‌بندی'),
    productType: _t('products.productType', 'نوع محصول'),
    typeSimple: _t('products.typeSimple', 'ساده'),
    typeVariable: _t('products.typeVariable', 'چند واریانت'),
    price: _t('products.price', 'قیمت'),
    stock: _t('products.stock', 'موجودی'),
    featured: _t('products.featured', 'محصول ویژه'),
    addImage: _t('products.addImage', 'افزودن تصویر'),
    mainImage: _t('products.mainImage', 'اصلی'),
    tabGeneral: _t('products.tabGeneral', 'عمومی'),
    tabVariants: _t('products.tabVariants', 'واریانت‌ها'),
    tabMedia: _t('products.tabMedia', 'تصاویر'),
  };
}

async function _loadMeta() {
  const catsRes = await window.API.categories.list();
  _categories = Array.isArray(catsRes) ? catsRes : (catsRes.data || []);
}

/* ── Full-page helpers ── */
function _fullPageShell() {
  return document.getElementById('page-productEdit');
}

function _renderFullPage() {
  const shell = _fullPageShell();
  if (!shell) return;
  const t = _texts();
  const isNew = !_editingProdId;
  const title = isNew ? _t('products.modalAdd', 'افزودن محصول') : _t('products.modalEdit', 'ویرایش محصول');
  const locked = isNew;
  shell.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-body">${title}</h1>
          <p class="text-sm text-muted mt-1">${isNew ? 'اطلاعات پایه را ذخیره کنید تا بخش‌های بعدی فعال شوند.' : 'همه بخش‌ها قابل ویرایش هستند.'}</p>
        </div>
        <div class="flex gap-2">
          <button type="button" id="fullPageBack" class="px-4 py-2 rounded-xl border border-border text-muted hover:text-body bg-body">بازگشت به لیست</button>
        </div>
      </div>

      <!-- sticky anchor nav -->
      <div class="sticky top-0 z-20 bg-surface/80 backdrop-blur rounded-2xl border border-border p-2 flex flex-wrap gap-2">
        <a href="#card-general" class="px-3 py-1.5 rounded-lg text-sm bg-accent text-white">عمومی</a>
        <a href="#card-media" class="px-3 py-1.5 rounded-lg text-sm border border-border text-muted hover:text-body">تصاویر</a>
        <a href="#card-variants" class="px-3 py-1.5 rounded-lg text-sm border border-border text-muted hover:text-body">واریانت‌ها</a>
      </div>

      <div id="card-general" class="bg-body border border-border rounded-2xl p-6">
        <h3 class="font-bold text-body mb-4">اطلاعات پایه</h3>
        <div id="fullGeneralWrap">${GeneralTab.render({ t, categories: _categories })}</div>
      </div>

      <div id="card-media" class="bg-body border border-border rounded-2xl p-6 ${locked ? 'opacity-60' : ''}">
        <h3 class="font-bold text-body mb-4">تصاویر</h3>
        ${locked ? '<p class="text-xs text-muted mb-3">ابتدا اطلاعات پایه را ذخیره کنید.</p>' : ''}
        <div class="${locked ? 'pointer-events-none' : ''}" id="fullMediaWrap">${MediaTab.render({ images: _currentProduct?.images || [], t })}</div>
      </div>

      <div id="card-variants" class="bg-body border border-border rounded-2xl p-6 ${locked ? 'opacity-60' : ''}">
        <h3 class="font-bold text-body mb-4">واریانت‌ها</h3>
        ${locked ? '<p class="text-xs text-muted mb-3">ابتدا اطلاعات پایه را ذخیره کنید.</p>' : ''}
        <div class="${locked ? 'pointer-events-none' : ''}">${VariantGrid.render()}</div>
      </div>

      <!-- sticky save bar -->
      <div class="sticky bottom-0 z-20 bg-body/90 backdrop-blur border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <p class="text-xs text-muted" id="fullPageDirtyHint">${_dirty ? 'تغییرات ذخیره‌نشده دارید' : 'آماده ذخیره'}</p>
        <div class="flex gap-2">
          <button type="button" id="fullPageCancel" class="px-6 py-2.5 rounded-xl border border-border text-muted hover:text-body bg-surface">انصراف</button>
          <button type="button" id="fullPageSave" class="px-8 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-medium">ذخیره</button>
        </div>
      </div>
    </div>
  `;

  const markDirty = () => {
    _dirty = true;
    const hint = document.getElementById('fullPageDirtyHint');
    if (hint) hint.textContent = 'تغییرات ذخیره‌نشده دارید';
  };

  // fill general
  if (_currentProduct) GeneralTab.fill(_currentProduct);
  window.attachPriceFormatter?.('productPrice');
  const gWrap = document.getElementById('fullGeneralWrap');
  if (gWrap) {
    GeneralTab.bind(gWrap, { onTypeChange: () => markDirty() });
    gWrap.addEventListener('input', markDirty);
  }

  const mWrap = document.getElementById('fullMediaWrap');
  if (mWrap && !locked) {
    MediaTab.bind(mWrap, {
      onPreviewFiles: (input) => window.uploadProductImage?.(input),
      onSetMain: async (imageId) => {
        await window.API.products.setMainImage(_editingProdId, imageId);
        await openProductPage(_editingProdId);
      },
      onDeleteImage: async (imageId) => {
        const ok = await window.showConfirmModal({
          title: 'حذف تصویر', message: 'این تصویر حذف شود؟',
          icon: 'trash-2', iconBg: 'bg-red-100', iconColor: 'text-red-600',
          confirmText: 'حذف', confirmClass: 'bg-red-600 hover:bg-red-700',
        });
        if (!ok) return;
        await window.API.products.deleteImage(_editingProdId, imageId);
        document.getElementById(`img-item-${imageId}`)?.remove();
      },
    });
  }

  // variant grid
  if (!locked) {
    VariantGrid.mount(document.getElementById('variantGridRoot'), {
      product: _currentProduct,
      productId: _editingProdId,
      onDirty: markDirty,
      onSaved: (p) => { _currentProduct = p; },
    });
  }

  if (window.lucide) lucide.createIcons();
  _bindFullPageActions();
  _installBeforeUnload();
}

async function _confirmDiscard() {
  if (!_dirty) return true;
  return window.showConfirmModal({
    title: 'تغییرات ذخیره‌نشده',
    message: 'تغییرات ذخیره‌نشده از بین می‌رود. ادامه می‌دهید؟',
    icon: 'alert-triangle', iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
    confirmText: 'ادامه', cancelText: 'انصراف',
  });
}

function _bindFullPageActions() {
  document.getElementById('fullPageBack')?.addEventListener('click', async () => {
    if (!(await _confirmDiscard())) return;
    _dirty = false;
    window.switchPage?.('products', document.querySelector('[data-page="products"]'));
  });
  document.getElementById('fullPageCancel')?.addEventListener('click', async () => {
    if (!(await _confirmDiscard())) return;
    _dirty = false;
    window.switchPage?.('products', document.querySelector('[data-page="products"]'));
  });
  document.getElementById('fullPageSave')?.addEventListener('click', async () => {
    const general = GeneralTab.collect();
    if (!general.name) { window.toast?.('نام محصول الزامی است', 'error'); return; }
    if (general.product_type === 'simple' && !general.price) {
      window.toast?.('قیمت محصول الزامی است', 'error'); return;
    }
    try {
      window.setLoading?.(true);
      let productId = _editingProdId;
      if (productId) {
        await window.API.products.update(productId, general);
      } else {
        const res = await window.API.products.create({ ...general, status: general.status || 'draft' });
        productId = res?.id || res?.data?.id;
        _editingProdId = productId;
        _dirty = false;
        window.toast?.('پیش‌نویس ذخیره شد — ادامه ویرایش');
        history.replaceState(null, '', '#product-edit/' + productId);
        await openProductPage(productId);
        window.setLoading?.(false);
        return;
      }

      // ذخیره‌ی گرید واریانت‌ها (فقط اگر تغییر کرده)
      if (VariantGrid.isDirty()) await VariantGrid.save({ silent: true });

      await _uploadPendingImages(productId);
      window.setLoading?.(false);
      window.toast?.('محصول ذخیره شد');
      _dirty = false;
      const hint = document.getElementById('fullPageDirtyHint');
      if (hint) hint.textContent = 'ذخیره شد';
      await openProductPage(productId);
      window.loadProducts?.();
    } catch (err) {
      window.setLoading?.(false);
      window.toast?.(err.displayMessage?.() || err.message, 'error');
    }
  });
}

function _installBeforeUnload() {
  if (_fullPageInit) return;
  _fullPageInit = true;
  window.addEventListener('beforeunload', (e) => {
    if (!_dirty || !_isFullPage) return;
    e.preventDefault();
    e.returnValue = '';
  });
}

export async function openProductPage(id = null) {
  _isFullPage = true;
  _editingProdId = id ? Number(id) : null;
  window.setLoading?.(true);
  try {
    await _loadMeta();
    _currentProduct = id ? (await window.API.products.get(id)) : null;
    if (_currentProduct?.data) _currentProduct = _currentProduct.data;
    // hide all page-sections, show productEdit full page
    document.querySelectorAll('.page-section').forEach((s) => s.classList.add('hidden'));
    const editSec = document.getElementById('page-productEdit');
    if (editSec) editSec.classList.remove('hidden');
    document.querySelectorAll('.nav-link').forEach((a) => a.classList.remove('admin-nav-active'));
    _renderFullPage();
    window.setLoading?.(false);
    _dirty = false;
    if (id) history.replaceState(null, '', '#product-edit/' + id);
    else history.replaceState(null, '', '#product-create');
  } catch (e) {
    window.setLoading?.(false);
    window.toast?.(e.message, 'error');
  }
}

export async function openProductEditor(id = null) {
  return openProductPage(id);
}

export function initProductEditor() {
  // hash routing for full page
  window.addEventListener('hashchange', () => {
    const h = location.hash || '';
    if (h.startsWith('#product-edit/')) {
      const id = h.replace('#product-edit/', '').trim();
      if (id) openProductPage(Number(id));
    } else if (h === '#product-create') {
      openProductPage(null);
    } else if (_isFullPage && !h.startsWith('#product-')) {
      _isFullPage = false;
      _dirty = false;
    }
  });
  // initial hash
  const h0 = location.hash || '';
  if (h0.startsWith('#product-edit/')) {
    const id = h0.replace('#product-edit/', '').trim();
    if (id) setTimeout(() => openProductPage(Number(id)), 300);
  } else if (h0 === '#product-create') {
    setTimeout(() => openProductPage(null), 300);
  }
}

async function _uploadPendingImages(productId) {
  const imgInput = document.getElementById('productImageInput');
  if (!imgInput?.files?.length) return;
  const files = Array.from(imgInput.files);
  let firstImage = !(_currentProduct?.images?.length);
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    try {
      await window.API.products.uploadImage(productId, f, firstImage, 0);
      firstImage = false;
    } catch (e) {
      window.toast?.(`خطا در آپلود ${f.name}: ${e.message}`, 'error');
    }
  }
  imgInput.value = '';
  document.querySelectorAll('.upload-overlay').forEach((el) => el.remove());
}

// Legacy globals — now point to full page
window.showProductModal = () => openProductPage(null);
window.editProduct = (id) => openProductPage(id);
window.openProductPage = openProductPage;

export default { openProductEditor, openProductPage, initProductEditor };