import GeneralTab from './tabs/generalTab.js';
import VariantsTab from './tabs/variantsTab.js';
import MediaTab from './tabs/mediaTab.js';

let _editingProdId = null;
let _categories = [];
let _attributeTypes = [];
let _currentProduct = null;
let _activeTab = 'general';

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
    generateVariants: _t('products.generateVariants', 'تولید واریانت‌ها'),
    selectStandardSizes: _t('products.selectStandardSizes', 'انتخاب سایزهای استاندارد'),
    addColor: _t('products.addColor', 'افزودن رنگ'),
    addColorHint: _t('products.addColorHint', 'رنگ جدید به لیست سراسری اضافه می‌شود. برای نمایش در سایت، رنگ را انتخاب کنید و «تولید واریانت‌ها» را بزنید.'),
    colorNameLabel: _t('products.colorNameLabel', 'نام رنگ'),
    colorNamePlaceholder: _t('products.colorNamePlaceholder', 'مثال: قرمز'),
    colorHexLabel: _t('products.colorHexLabel', 'کد رنگ'),
    noValues: _t('products.noValues', 'مقداری تعریف نشده'),
    noAxes: _t('products.noAxes', 'محور واریانتی تعریف نشده'),
    variantsHint: _t('products.variantsHint', 'محورهای واریانت را انتخاب و تولید کنید.'),
    variantTitle: _t('products.variantTitle', 'عنوان'),
    emptyVariants: _t('products.emptyVariants', 'واریانتی وجود ندارد'),
    addImage: _t('products.addImage', 'افزودن تصویر'),
    mainImage: _t('products.mainImage', 'اصلی'),
    tabGeneral: _t('products.tabGeneral', 'عمومی'),
    tabVariants: _t('products.tabVariants', 'واریانت‌ها'),
    tabMedia: _t('products.tabMedia', 'تصاویر'),
  };
}

function _renderTabs() {
  const panel = document.getElementById('productTabPanels');
  if (!panel) return;

  const t = _texts();
  panel.innerHTML = `
    <div class="product-tab-panel ${_activeTab === 'general' ? '' : 'hidden'}" data-tab-panel="general">
      ${GeneralTab.render({ t, categories: _categories })}
    </div>
    <div class="product-tab-panel ${_activeTab === 'variants' ? '' : 'hidden'}" data-tab-panel="variants">
      ${VariantsTab.render({ attributeTypes: _attributeTypes, variants: _currentProduct?.variants || [], t })}
    </div>
    <div class="product-tab-panel ${_activeTab === 'media' ? '' : 'hidden'}" data-tab-panel="media">
      ${MediaTab.render({ images: _currentProduct?.images || [], t })}
    </div>`;

  _bindActiveTab();
}

function _switchTab(name) {
  _activeTab = name;
  document.querySelectorAll('.product-editor-tab').forEach((btn) => {
    btn.classList.toggle('border-accent', btn.dataset.tab === name);
    btn.classList.toggle('text-accent', btn.dataset.tab === name);
    btn.classList.toggle('border-transparent', btn.dataset.tab !== name);
    btn.classList.toggle('text-muted', btn.dataset.tab !== name);
  });
  document.querySelectorAll('.product-tab-panel').forEach((p) => {
    p.classList.toggle('hidden', p.dataset.tabPanel !== name);
  });
}

function _bindActiveTab() {
  const t = _texts();
  const generalPanel = document.querySelector('[data-tab-panel="general"]');
  const variantsPanel = document.querySelector('[data-tab-panel="variants"]');
  const mediaPanel = document.querySelector('[data-tab-panel="media"]');

  if (generalPanel) {
    GeneralTab.bind(generalPanel);
    if (_currentProduct) GeneralTab.fill(_currentProduct);
    window.attachPriceFormatter?.('productPrice');
  }

  if (variantsPanel) {
    VariantsTab.bindPriceInputs(variantsPanel);

    const variantCallbacks = {
      onValidationError: (msg) => window.toast?.(msg, 'error'),
      onAddColor: async ({ typeId, value, swatch_hex, nameInput, hexInput, pickerInput }) => {
        try {
          window.setLoading?.(true);
          const created = await window.API.products.addAttributeValue(typeId, {
            value,
            swatch_hex,
          });
          const newValue = created?.data || created;
          if (!newValue?.id) {
            throw new Error('پاسخ سرور نامعتبر بود');
          }

          await _loadMeta();

          const checkedByType = {};
          variantsPanel.querySelectorAll('.variant-axis-value:checked').forEach((cb) => {
            const axisTypeId = Number(cb.dataset.typeId);
            if (!checkedByType[axisTypeId]) checkedByType[axisTypeId] = [];
            checkedByType[axisTypeId].push(Number(cb.value));
          });
          if (!checkedByType[typeId]) checkedByType[typeId] = [];
          if (!checkedByType[typeId].includes(Number(newValue.id))) {
            checkedByType[typeId].push(Number(newValue.id));
          }

          VariantsTab.refreshAxesPanel(
            variantsPanel,
            _attributeTypes,
            t,
            _currentProduct?.variants || [],
            variantCallbacks,
          );

          Object.entries(checkedByType).forEach(([axisTypeId, ids]) => {
            ids.forEach((id) => {
              const cb = variantsPanel.querySelector(
                `.variant-axis-value[data-type-id="${axisTypeId}"][value="${id}"]`,
              );
              if (cb) cb.checked = true;
            });
          });

          VariantsTab.ensureColorFormsBound(variantsPanel, variantCallbacks);

          if (nameInput) nameInput.value = '';
          if (hexInput) hexInput.value = '';
          if (pickerInput) pickerInput.value = '#000000';
          window.setLoading?.(false);
          window.toast?.(_t('products.colorAdded', 'رنگ اضافه شد'));
          if (_editingProdId) {
            window.toast?.(
              _t(
                'products.colorRegenerateHint',
                'برای نمایش در سایت، «تولید واریانت‌ها» را بزنید.',
              ),
              'info',
            );
          }
        } catch (e) {
          window.setLoading?.(false);
          window.toast?.(e.message, 'error');
          throw e;
        }
      },
      onGenerate: async (axes) => {
        if (!_editingProdId) {
          window.toast?.('ابتدا محصول را ذخیره کنید', 'error');
          return;
        }
        if (!axes.length) {
          window.toast?.('حداقل یک محور انتخاب کنید', 'error');
          return;
        }
        try {
          window.setLoading?.(true);
          const variants = await window.API.products.generateVariants(_editingProdId, axes);
          _currentProduct.variants = variants;
          _currentProduct.product_type = 'variable';
          VariantsTab.updateTable(variantsPanel, variants, t);
          GeneralTab.toggleSimplePricing('variable');
          const typeEl = document.getElementById('productType');
          if (typeEl) typeEl.value = 'variable';
          window.setLoading?.(false);
          window.toast?.('واریانت‌ها ایجاد شدند');
        } catch (e) {
          window.setLoading?.(false);
          window.toast?.(e.message, 'error');
        }
      },
    };

    VariantsTab.bind(variantsPanel, variantCallbacks);
    VariantsTab.ensureColorFormsBound(variantsPanel, variantCallbacks);
  }

  if (mediaPanel) {
    MediaTab.bind(mediaPanel, {
      onPreviewFiles: (input) => window.uploadProductImage?.(input),
      onSetMain: async (imageId) => {
        if (!_editingProdId) return;
        await window.API.products.setMainImage(_editingProdId, imageId);
        await openProductEditor(_editingProdId);
        window.toast?.('تصویر اصلی تنظیم شد');
      },
      onDeleteImage: async (imageId) => {
        if (!_editingProdId || !confirm('این تصویر حذف شود؟')) return;
        await window.API.products.deleteImage(_editingProdId, imageId);
        document.getElementById(`img-item-${imageId}`)?.remove();
        window.toast?.('تصویر حذف شد');
      },
    });
  }

  if (window.lucide) lucide.createIcons();
}

async function _loadMeta() {
  const [catsRes, attrRes] = await Promise.all([
    window.API.categories.list(),
    window.API.products.listAttributeTypes(),
  ]);
  _categories = Array.isArray(catsRes) ? catsRes : (catsRes.data || []);
  _attributeTypes = Array.isArray(attrRes) ? attrRes : (attrRes.data || attrRes || []);
}

export async function openProductEditor(id = null) {
  try {
    window.setLoading?.(true);
    await _loadMeta();
    _editingProdId = id;
    _activeTab = 'general';
    _currentProduct = id ? (await window.API.products.get(id)) : null;
    if (_currentProduct?.data) _currentProduct = _currentProduct.data;

    window.setText?.('productModalTitle', id
      ? _t('products.modalEdit', 'ویرایش محصول')
      : _t('products.modalAdd', 'افزودن محصول'));
    window.setText?.('productSubmitText', id
      ? _t('products.update', 'بروزرسانی')
      : _t('products.save', 'ذخیره محصول'));

    const pid = document.getElementById('productId');
    if (pid) pid.value = id || '';

    _renderTabs();
    window.setLoading?.(false);
    window.showModal?.('productModal');
  } catch (e) {
    window.setLoading?.(false);
    window.toast?.(e.message, 'error');
  }
}

export function initProductEditor() {
  document.querySelectorAll('.product-editor-tab').forEach((btn) => {
    btn.addEventListener('click', () => _switchTab(btn.dataset.tab));
  });

  document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const general = GeneralTab.collect();
    if (!general.name) { window.toast?.('نام محصول الزامی است', 'error'); return; }
    if (general.product_type === 'simple' && !general.price) {
      window.toast?.('قیمت محصول الزامی است', 'error');
      return;
    }

    try {
      window.setLoading?.(true);
      let productId = _editingProdId;

      if (productId) {
        await window.API.products.update(productId, general);
      } else {
        const res = await window.API.products.create(general);
        productId = res?.id || res?.data?.id;
        _editingProdId = productId;
      }

      const variantsPanel = document.querySelector('[data-tab-panel="variants"]');
      if (variantsPanel && general.product_type === 'variable') {
        const variantRows = VariantsTab.collectVariants(variantsPanel);
        if (variantRows.length) {
          await window.API.products.bulkUpdateVariants(productId, variantRows);
        }
      }

      await _uploadPendingImages(productId);
      window.setLoading?.(false);
      window.toast?.(productId && _editingProdId ? 'محصول بروزرسانی شد' : 'محصول ایجاد شد');
      window.hideModal?.('productModal');
      window.loadProducts?.();
    } catch (err) {
      window.setLoading?.(false);
      window.toast?.(err.message, 'error');
    }
  });
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

// Legacy globals
window.showProductModal = () => openProductEditor(null);
window.editProduct = (id) => openProductEditor(id);

export default { openProductEditor, initProductEditor };
