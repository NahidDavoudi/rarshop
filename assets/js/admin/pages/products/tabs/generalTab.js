import { parsePrice } from '../../../../utils/priceFormatter.js';

const GeneralTab = {
  render({ t = {}, categories = [] } = {}) {
    const catOpts = categories.map((c) =>
      `<option value="${c.id}">${c.name}</option>`).join('');

    return `
      <div class="space-y-4" id="productTabGeneral">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="block text-muted mb-2 text-sm">${t.name || 'نام محصول'} *</label>
            <input type="text" id="productName" required
                   class="w-full bg-card border border-border rounded-xl px-4 py-3 text-body focus:border-accent outline-none">
          </div>
          <div>
            <label class="block text-muted mb-2 text-sm">${t.slug || 'شناسه (slug)'}</label>
            <input type="text" id="productSlug" dir="ltr"
                   class="w-full bg-card border border-border rounded-xl px-4 py-3 text-body focus:border-accent outline-none">
          </div>
          <div>
            <label class="block text-muted mb-2 text-sm">${t.status || 'وضعیت'}</label>
            <select id="productStatus" class="w-full bg-card border border-border rounded-xl px-4 py-3 text-body focus:border-accent outline-none">
              <option value="draft">${t.statusDraft || 'پیش‌نویس'}</option>
              <option value="active">${t.statusActive || 'فعال'}</option>
              <option value="archived">${t.statusArchived || 'آرشیو'}</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-muted mb-2 text-sm">${t.shortDesc || 'توضیح کوتاه'}</label>
          <textarea id="productShortDesc" rows="2" class="w-full bg-card border border-border rounded-xl px-4 py-3 text-body focus:border-accent outline-none"></textarea>
        </div>
        <div>
          <label class="block text-muted mb-2 text-sm">${t.fullDesc || 'توضیحات کامل'}</label>
          <textarea id="productDesc" rows="4" class="w-full bg-card border border-border rounded-xl px-4 py-3 text-body focus:border-accent outline-none"></textarea>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-muted mb-2 text-sm">${t.category || 'دسته‌بندی'}</label>
            <select id="productCategory" class="w-full bg-card border border-border rounded-xl px-4 py-3 text-body focus:border-accent outline-none">
              <option value="">${t.selectCategory || 'انتخاب دسته‌بندی'}</option>${catOpts}
            </select>
          </div>
          <div>
            <label class="block text-muted mb-2 text-sm">${t.productType || 'نوع محصول'}</label>
            <select id="productType" class="w-full bg-card border border-border rounded-xl px-4 py-3 text-body focus:border-accent outline-none">
              <option value="simple">${t.typeSimple || 'ساده'}</option>
              <option value="variable">${t.typeVariable || 'چند واریانت'}</option>
            </select>
          </div>
        </div>
        <div id="simplePricingFields" class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-muted mb-2 text-sm">${t.price || 'قیمت (تومان)'} *</label>
            <input type="text" id="productPrice" inputmode="numeric" class="w-full bg-card border border-border rounded-xl px-4 py-3 text-body focus:border-accent outline-none">
          </div>
          <div>
            <label class="block text-muted mb-2 text-sm">${t.stock || 'موجودی'}</label>
            <input type="number" id="productStock" value="1" min="0"
                   class="w-full bg-card border border-border rounded-xl px-4 py-3 text-body focus:border-accent outline-none">
          </div>
        </div>
        <label class="flex items-center gap-2 text-muted">
          <input type="checkbox" id="productFeatured" class="rounded bg-surface border-border">
          ${t.featured || 'محصول ویژه'}
        </label>
      </div>`;
  },

  fill(product = {}) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    set('productName', product.name);
    set('productSlug', product.slug || '');
    set('productShortDesc', product.short_description || '');
    set('productDesc', product.description || '');
    set('productStatus', product.status || 'active');
    set('productType', product.product_type || 'simple');
    set('productPrice', product.price ? Number(product.price).toLocaleString('fa-IR') : '');
    set('productStock', product.stock ?? 1);
    set('productCategory', product.category_id || '');
    const feat = document.getElementById('productFeatured');
    if (feat) feat.checked = !!(product.featured);
    GeneralTab.toggleSimplePricing(product.product_type || 'simple');
  },

  toggleSimplePricing(type) {
    const el = document.getElementById('simplePricingFields');
    if (el) el.classList.toggle('hidden', type === 'variable');
  },

  bind(container, callbacks = {}) {
    container.querySelector('#productType')?.addEventListener('change', (e) => {
      GeneralTab.toggleSimplePricing(e.target.value);
      callbacks.onTypeChange?.(e.target.value);
    });
  },

  collect() {
    return {
      name: document.getElementById('productName')?.value?.trim() || '',
      slug: document.getElementById('productSlug')?.value?.trim() || '',
      short_description: document.getElementById('productShortDesc')?.value?.trim() || '',
      description: document.getElementById('productDesc')?.value?.trim() || '',
      status: document.getElementById('productStatus')?.value || 'active',
      product_type: document.getElementById('productType')?.value || 'simple',
      price: parsePrice(document.getElementById('productPrice')?.value),
      stock: parseInt(document.getElementById('productStock')?.value || '0', 10) || 0,
      category_id: document.getElementById('productCategory')?.value || null,
      featured: document.getElementById('productFeatured')?.checked ? 1 : 0,
    };
  },
};

export default GeneralTab;