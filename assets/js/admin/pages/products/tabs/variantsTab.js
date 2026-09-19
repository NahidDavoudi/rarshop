import VariantTable from '../../../components/VariantTable.js';
import { STANDARD_SIZES } from '../../../../utils/productVariants.js';
import { storeConfig } from '../../../../config/bootstrap.js';

function getStandardSizes() {
  return storeConfig.texts?.product?.standardSizes || STANDARD_SIZES;
}

function normalizeHex(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(withHash) ? withHash : null;
}

function isColorAxis(axis) {
  if (!axis) return false;
  const slug = String(axis.slug ?? '').trim().toLowerCase();
  if (slug === 'color' || slug === 'colour' || slug === 'رنگ') return true;
  if (axis.input_type === 'swatch') return true;
  return (axis.values || []).some((v) => String(v.swatch_hex ?? '').trim() !== '');
}

function collectCheckedValueIds(variants = [], typeId = null) {
  const ids = new Set();
  variants.forEach((variant) => {
    (variant.attribute_values || []).forEach((av) => {
      const avTypeId = Number(av.attribute_type_id ?? av.type_id ?? 0);
      if (typeId != null && avTypeId !== Number(typeId)) return;
      if (av.id != null) ids.add(Number(av.id));
    });
  });
  return ids;
}

function renderValueChip(axis, v, checked = false) {
  const checkedAttr = checked ? ' checked' : '';
  const showSwatch = isColorAxis(axis) && v.swatch_hex;
  return `
    <label class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-sm cursor-pointer hover:border-accent transition-colors">
      <input type="checkbox" class="variant-axis-value rounded" data-type-id="${axis.id}" data-value-slug="${v.slug || ''}" data-value-label="${v.value || ''}" value="${v.id}"${checkedAttr}>
      ${showSwatch
        ? `<span class="w-4 h-4 rounded-full border border-border shrink-0" style="background:${v.swatch_hex}"></span>` : ''}
      <span>${v.value}</span>
    </label>`;
}

function renderAxisBlock(axis, t, variants = []) {
  const isSizeAxis = axis.slug === 'size';
  const isColor = isColorAxis(axis);
  console.log('[VariantsTab] renderAxisBlock:', { 
    axisName: axis.name, 
    slug: axis.slug, 
    inputType: axis.input_type,
    isColorResult: isColor,
    values: axis.values 
  });
  const checkedIds = collectCheckedValueIds(variants, axis.id);
  const chips = (axis.values || []).map((v) => {
    const checkedAttr = checkedIds.has(Number(v.id)) ? ' checked' : '';
    const showSwatch = isColor && v.swatch_hex;
    return `
    <label class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-sm cursor-pointer hover:border-accent transition-colors">
      <input type="checkbox" class="variant-axis-value rounded" data-type-id="${axis.id}" data-value-slug="${v.slug || ''}" data-value-label="${v.value || ''}" value="${v.id}"${checkedAttr}>
      ${showSwatch ? `<span class="w-4 h-4 rounded-full border border-border shrink-0" style="background:${v.swatch_hex}"></span>` : ''}
      <span>${v.value}</span>
    </label>`;
  }).join('');

  const sizePresetBtn = isSizeAxis ? `
    <button type="button" class="btnSelectStandardSizes mt-2 px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-body hover:border-accent transition-colors"
            data-type-id="${axis.id}">
      ${t.selectStandardSizes || 'انتخاب سایزهای استاندارد'}
    </button>` : '';

  const colorForm = isColor ? `
    <div class="mt-4 p-3 rounded-xl border border-border bg-surface" data-color-add-form="${axis.id}">
      <p class="text-xs font-medium text-body mb-2">+ ${t.addColor || 'افزودن رنگ جدید'}</p>
      <p class="text-xs text-muted mb-3">${t.addColorHint || 'رنگ جدید به لیست اضافه می‌شود و بلافاصله قابل انتخاب است.'}</p>
      <div class="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div class="flex-1 min-w-0">
          <label class="block text-xs text-muted mb-1">${t.colorNameLabel || 'نام رنگ'}</label>
          <input type="text" class="color-add-name w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-body focus:border-accent outline-none" placeholder="${t.colorNamePlaceholder || 'مثال: قرمز'}">
        </div>
        <div class="sm:w-40">
          <label class="block text-xs text-muted mb-1">${t.colorHexLabel || 'کد رنگ (اختیاری)'}</label>
          <div class="flex items-center gap-2">
            <input type="color" class="color-add-picker w-10 h-10 rounded-lg border border-border bg-card cursor-pointer shrink-0" value="#000000">
            <input type="text" dir="ltr" class="color-add-hex flex-1 bg-card border border-border rounded-xl px-3 py-2 text-sm text-body font-mono focus:border-accent outline-none" placeholder="#000000">
          </div>
        </div>
        <button type="button" class="btnAddColor px-5 py-2.5 rounded-xl text-sm bg-accent hover:bg-accent-hover text-white transition-colors shrink-0 font-medium"
                data-type-id="${axis.id}">
          ${t.addColor || 'افزودن رنگ'}
        </button>
      </div>
    </div>` : '';

  return `
    <div class="mb-6" data-axis-type="${axis.id}" data-axis-slug="${axis.slug || ''}">
      <p class="text-sm font-medium text-body mb-2">${axis.name}</p>
      <div class="variant-axis-values flex flex-wrap gap-2">${chips || `<span class="text-xs text-dim">${t.noValues || 'مقداری تعریف نشده'}</span>`}</div>
      ${sizePresetBtn}
      ${colorForm}
    </div>`;
}

const VariantsTab = {
  render({ attributeTypes = [], variants = [], t = {} } = {}) {
    console.log('[VariantsTab] render called with:', { 
      attributeTypesCount: attributeTypes.length, 
      attributeTypes,
      variantsCount: variants.length 
    });
    const axes = attributeTypes.filter((at) => Number(at.is_variant_axis) === 1);
    console.log('[VariantsTab] filtered axes:', axes);
    const axisHtml = axes.map((axis) => renderAxisBlock(axis, t, variants)).join('');

    return `
      <div id="productTabVariants" class="space-y-4">
        <p class="text-sm text-muted">${t.variantsHint || 'محورهای واریانت را انتخاب کنید و دکمه تولید را بزنید.'}</p>
        <div id="variantAxesPanel">${axisHtml || `<p class="text-dim text-sm">${t.noAxes || 'محور واریانتی تعریف نشده'}</p>`}</div>
        <button type="button" id="btnGenerateVariants"
                class="bg-surface hover:bg-card border border-border text-body px-4 py-2 rounded-xl text-sm transition-colors">
          ${t.generateVariants || 'تولید واریانت‌ها'}
        </button>
        <div id="variantTableWrap">${VariantTable.render({ variants, t })}</div>
      </div>`;
  },

  refreshAxesPanel(container, attributeTypes, t = {}, variants = [], callbacks = {}) {
    const panel = container.querySelector('#variantAxesPanel');
    if (!panel) return;

    const checkedByType = {};
    container.querySelectorAll('.variant-axis-value:checked').forEach((cb) => {
      const typeId = Number(cb.dataset.typeId);
      if (!checkedByType[typeId]) checkedByType[typeId] = [];
      checkedByType[typeId].push(Number(cb.value));
    });

    const axes = attributeTypes.filter((at) => Number(at.is_variant_axis) === 1);
    panel.innerHTML = axes.map((axis) => renderAxisBlock(axis, t, variants)).join('')
      || `<p class="text-dim text-sm">${t.noAxes || 'محور واریانتی تعریف نشده'}</p>`;

    Object.entries(checkedByType).forEach(([typeId, ids]) => {
      ids.forEach((id) => {
        const cb = panel.querySelector(`.variant-axis-value[data-type-id="${typeId}"][value="${id}"]`);
        if (cb) cb.checked = true;
      });
    });

    this._bindAxisActions(container);
    this.ensureColorFormsBound(container, callbacks);
  },

  ensureColorFormsBound(container, callbacks = {}) {
    this._bindColorForms(container, callbacks);
    if (!container.querySelector('[data-color-add-form]')) return;
    container.querySelectorAll('[data-color-add-form]').forEach((formWrap) => {
      if (!formWrap.dataset.bound) {
        this._bindColorForms(container, callbacks);
      }
    });
  },

  appendColorValue(container, axis, value, t = {}) {
    const wrap = container.querySelector(`[data-axis-type="${axis.id}"] .variant-axis-values`);
    if (!wrap) return;

    const emptyMsg = wrap.querySelector('.text-dim');
    if (emptyMsg) emptyMsg.remove();

    wrap.insertAdjacentHTML('beforeend', renderValueChip(axis, value, true));
  },

  _bindAxisActions(container) {
    container.querySelectorAll('.btnSelectStandardSizes').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        const standard = getStandardSizes().map((s) => s.toUpperCase());
        const wrap = btn.closest('[data-axis-type]');
        if (!wrap) return;

        wrap.querySelectorAll('.variant-axis-value').forEach((cb) => {
          const label = String(cb.dataset.valueLabel || '').trim().toUpperCase();
          const slug = String(cb.dataset.valueSlug || '').trim().toUpperCase();
          cb.checked = standard.includes(label) || standard.includes(slug);
        });
      });
    });
  },

  bind(container, callbacks = {}) {
    const generateBtn = container.querySelector('#btnGenerateVariants');
    if (generateBtn && !generateBtn.dataset.bound) {
      generateBtn.dataset.bound = '1';
      generateBtn.addEventListener('click', () => {
        const axes = [];
        const typeIds = new Set();
        container.querySelectorAll('.variant-axis-value:checked').forEach((cb) => {
          const typeId = Number(cb.dataset.typeId);
          if (!typeIds.has(typeId)) {
            typeIds.add(typeId);
            axes.push({ type_id: typeId, value_ids: [] });
          }
          const axis = axes.find((a) => a.type_id === typeId);
          axis.value_ids.push(Number(cb.value));
        });
        callbacks.onGenerate?.(axes);
      });
    }

    this._bindAxisActions(container);
    this._bindColorForms(container, callbacks);
  },

  _bindColorForms(container, callbacks = {}) {
    container.querySelectorAll('[data-color-add-form]').forEach((formWrap) => {
      if (formWrap.dataset.bound) return;
      formWrap.dataset.bound = '1';

      const typeId = Number(formWrap.dataset.colorAddForm);
      const nameInput = formWrap.querySelector('.color-add-name');
      const hexInput = formWrap.querySelector('.color-add-hex');
      const pickerInput = formWrap.querySelector('.color-add-picker');
      const addBtn = formWrap.querySelector('.btnAddColor');

      pickerInput?.addEventListener('input', () => {
        if (hexInput) hexInput.value = pickerInput.value;
      });

      hexInput?.addEventListener('input', () => {
        const hex = normalizeHex(hexInput.value);
        if (hex && pickerInput) pickerInput.value = hex;
      });

      addBtn?.addEventListener('click', async () => {
        const name = nameInput?.value?.trim() || '';
        const hexRaw = hexInput?.value?.trim() || pickerInput?.value || '';
        const swatchHex = hexRaw ? normalizeHex(hexRaw) : '';

        if (!name) {
          callbacks.onValidationError?.('نام رنگ الزامی است');
          return;
        }
        if (hexRaw && !swatchHex) {
          callbacks.onValidationError?.('کد رنگ باید به فرمت hex باشد (مثال: #FF0000)');
          return;
        }

        addBtn.disabled = true;
        try {
          await callbacks.onAddColor?.({
            typeId,
            value: name,
            swatch_hex: swatchHex || null,
            formWrap,
            nameInput,
            hexInput,
            pickerInput,
          });
        } finally {
          addBtn.disabled = false;
        }
      });
    });
  },

  collectVariants(container) {
    const wrap = container.querySelector('#variantTableWrap');
    return VariantTable.collectRows(wrap);
  },

  updateTable(container, variants, t) {
    const wrap = container.querySelector('#variantTableWrap');
    if (wrap) {
      wrap.innerHTML = VariantTable.render({ variants, t });
      VariantTable.bindPriceInputs(wrap);
    }
  },

  bindPriceInputs(container) {
    const wrap = container?.querySelector('#variantTableWrap');
    if (wrap) VariantTable.bindPriceInputs(wrap);
  },
};

export default VariantsTab;
