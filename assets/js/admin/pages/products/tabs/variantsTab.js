import VariantTable from '../../../components/VariantTable.js';
import { escapeHtml, escapeAttr } from '../../../../utils/htmlEscape.js';

const PRESET_SIZES = ['M', 'L', 'XL', 'XXL', '3XL', '4XL'];

function isSwatch(axis) {
  return (axis.input_type || 'text') === 'swatch';
}

function axisValues(axis) {
  return (axis.values || []).filter((v) => Number(v.is_active ?? 1) === 1);
}

/* ── Section 1: axes ── */
function renderAxisCard(axis, idx, total, t) {
  const swatch = isSwatch(axis);
  const vals = axisValues(axis);
  const chips = vals.map((v) => `
    <span class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border bg-surface text-sm whitespace-nowrap shrink-0 max-w-full">
      ${swatch ? `<input type="color" data-value-picker="${v.id}" data-axis-id="${axis.id}" value="${escapeAttr(v.swatch_hex || '#000000')}" class="w-6 h-6 rounded-full border border-border cursor-pointer shrink-0" title="رنگ">` : ''}
      ${swatch && v.swatch_hex ? `<span class="w-3.5 h-3.5 rounded-full border border-border shrink-0" style="background:${escapeAttr(v.swatch_hex)}" aria-hidden="true"></span>` : ''}
      <span class="truncate min-w-0">${escapeHtml(v.value)}</span>
      <button type="button" data-del-value="${v.id}" data-axis-id="${axis.id}" aria-label="حذف ${escapeAttr(v.value)}"
              class="shrink-0 w-7 h-7 rounded-full bg-body border border-border flex items-center justify-center text-dim hover:text-accent hover:border-accent/40 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
        <i data-lucide="x" class="w-3.5 h-3.5" aria-hidden="true"></i>
      </button>
    </span>`).join('')
    || `<span class="text-xs text-dim">${escapeHtml(t.noValues || 'مقداری تعریف نشده — با Enter یا ویرگول اضافه کنید')}</span>`;

  return `
  <div class="border border-border rounded-2xl p-3 sm:p-4 bg-card/40 space-y-3" data-axis-card="${axis.id}">
    <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <label class="flex-1 min-w-0 space-y-1">
        <span class="block text-xs font-medium text-muted">نام محور</span>
        <input type="text" data-axis-name="${axis.id}" value="${escapeAttr(axis.name || '')}" placeholder="مثلاً: جنس" aria-label="نام محور ${idx + 1}"
               class="w-full bg-body border border-border rounded-xl px-3 py-2.5 text-sm text-body placeholder:text-dim focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-colors">
        <p class="hidden text-xs text-accent mt-1" data-error-axis="${axis.id}" role="alert"></p>
      </label>
      <label class="w-full sm:w-36 shrink-0 space-y-1">
        <span class="block text-xs font-medium text-muted">نوع</span>
        <select data-axis-type="${axis.id}" aria-label="نوع محور"
                class="w-full bg-body border border-border rounded-xl px-3 py-2.5 text-sm text-body focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none cursor-pointer transition-colors">
          <option value="text" ${swatch ? '' : 'selected'}>متن</option>
          <option value="swatch" ${swatch ? 'selected' : ''}>رنگ</option>
        </select>
      </label>
      <div class="flex items-center gap-1.5 self-start sm:self-end pb-0 sm:pb-0 pt-1 sm:pt-5">
        <button type="button" data-axis-up="${axis.id}" ${idx === 0 ? 'disabled' : ''} aria-label="جابجایی بالا"
                class="w-9 h-9 rounded-xl border border-border bg-surface flex items-center justify-center text-muted hover:text-body hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
          <i data-lucide="chevron-up" class="w-4 h-4" aria-hidden="true"></i>
        </button>
        <button type="button" data-axis-down="${axis.id}" ${idx === total - 1 ? 'disabled' : ''} aria-label="جابجایی پایین"
                class="w-9 h-9 rounded-xl border border-border bg-surface flex items-center justify-center text-muted hover:text-body hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
          <i data-lucide="chevron-down" class="w-4 h-4" aria-hidden="true"></i>
        </button>
        <button type="button" data-del-axis="${axis.id}" aria-label="حذف محور"
                class="w-9 h-9 rounded-xl border border-border bg-surface flex items-center justify-center text-muted hover:text-accent hover:border-accent/30 hover:bg-accent/5 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
          <i data-lucide="trash-2" class="w-4 h-4" aria-hidden="true"></i>
        </button>
      </div>
    </div>
    <div class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
      <div class="flex flex-wrap gap-2 min-w-0">${chips}</div>
    </div>
    <div class="flex gap-2 items-center">
      <input type="text" data-add-value="${axis.id}" placeholder="مقدار جدید + Enter — مثلاً: نخی (، جدا می‌کند)"
             aria-label="افزودن مقدار به ${escapeAttr(axis.name || 'محور')}"
             class="flex-1 min-w-0 bg-body border border-border rounded-xl px-3 py-2.5 text-sm text-body placeholder:text-dim focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-colors">
      ${swatch ? `<input type="color" data-add-hex="${axis.id}" value="#000000" class="w-10 h-10 rounded-xl border border-border bg-body cursor-pointer shrink-0" title="رنگ مقدار جدید" aria-label="انتخاب رنگ">` : ''}
    </div>
    <p class="hidden text-xs mt-1" data-error-add-value="${axis.id}" role="alert" aria-live="polite"></p>
  </div>`;
}

function renderAxesSection(axes, variants, t) {
  if (!axes.length) {
    const def = (variants || []).find((v) => v.title === 'Default') || variants[0] || {};
    const qty = def.inventory?.quantity ?? '';
    const price = def.price != null && def.price !== '' ? Number(def.price) : '';
    return `
    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button type="button" data-preset="clothing" class="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium border border-border bg-surface hover:bg-card hover:border-border/80 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"><i data-lucide="shirt" class="w-4 h-4 shrink-0" aria-hidden="true"></i> پوشاک (سایز + رنگ)</button>
        <button type="button" data-preset="simple" class="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium border border-accent bg-accent/10 text-body cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"><i data-lucide="minus" class="w-4 h-4 shrink-0" aria-hidden="true"></i> بدون تنوع ✓</button>
        <button type="button" data-preset="custom" class="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium border border-border bg-surface hover:bg-card hover:border-border/80 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"><i data-lucide="pencil" class="w-4 h-4 shrink-0" aria-hidden="true"></i> سفارشی</button>
      </div>
      <div class="border border-border rounded-2xl p-4 bg-card/40 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label class="space-y-1">
          <span class="block text-xs font-medium text-muted">قیمت (تومان)</span>
          <input type="text" id="simpleVariantPrice" data-simple-field="price" inputmode="numeric" value="${price !== '' ? price.toLocaleString('fa-IR') : ''}"
                 class="w-full bg-body border border-border rounded-xl px-3 py-2.5 text-sm text-body placeholder:text-dim focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-colors">
        </label>
        <label class="space-y-1">
          <span class="block text-xs font-medium text-muted">موجودی</span>
          <input type="number" data-simple-field="quantity" value="${qty}" min="0"
                 class="w-full bg-body border border-border rounded-xl px-3 py-2.5 text-sm text-body focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-colors">
        </label>
        <label class="space-y-1">
          <span class="block text-xs font-medium text-muted">SKU</span>
          <input type="text" data-simple-field="sku" value="${escapeAttr(def.sku || '')}"
                 class="w-full bg-body border border-border rounded-xl px-3 py-2.5 text-sm text-body focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-colors">
        </label>
      </div>
      <p class="text-xs leading-5 text-muted">محصول ساده = ۰ محور + یک واریانت پیش‌فرض. برای افزودن تنوع، «پوشاک» یا «سفارشی» را بزنید.</p>
    </div>`;
  }
  return `
  <div class="space-y-4">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <button type="button" data-preset="clothing" class="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium border border-border bg-surface hover:bg-card hover:border-border/80 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"><i data-lucide="shirt" class="w-4 h-4 shrink-0" aria-hidden="true"></i> پوشاک</button>
      <button type="button" data-preset="simple" class="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium border border-border bg-surface hover:bg-card hover:border-border/80 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"><i data-lucide="minus" class="w-4 h-4 shrink-0" aria-hidden="true"></i> بدون تنوع</button>
      <button type="button" data-preset="custom" class="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium border border-border bg-surface hover:bg-card hover:border-border/80 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"><i data-lucide="pencil" class="w-4 h-4 shrink-0" aria-hidden="true"></i> سفارشی</button>
    </div>
    <div class="space-y-3" id="axesCards">
      ${axes.map((a, i) => renderAxisCard(a, i, axes.length, t)).join('')}
    </div>
    ${axes.length < 3
      ? `<button type="button" data-add-axis class="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium border border-dashed border-border bg-transparent text-muted hover:text-body hover:border-accent hover:bg-accent/5 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"><i data-lucide="plus" class="w-4 h-4" aria-hidden="true"></i> افزودن محور (حداکثر ۳)</button>`
      : `<p class="inline-flex items-center gap-1.5 text-xs text-muted"><i data-lucide="info" class="w-3.5 h-3.5" aria-hidden="true"></i> سقف ۳ محور رسیده‌اید.</p>`}
  </div>`;
}

const VariantsTab = {
  renderAxesPreview({ axes = [], variants = [], t = {} } = {}) {
    const active = (axes || []).filter((a) => Number(a.is_active ?? 1) === 1);
    return `
      <div id="productTabVariants" class="space-y-6">
        <section aria-labelledby="axes-heading" class="bg-body border border-border rounded-2xl p-4 md:p-5">
          <h4 id="axes-heading" class="text-sm font-bold text-body mb-4 flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold text-muted shrink-0">۱</span> محورها</h4>
          <div id="variantAxesPanel">${renderAxesSection(active, variants, t)}</div>
        </section>
        <section aria-labelledby="preview-heading" class="bg-body border border-border rounded-2xl p-4 md:p-5">
          <h4 id="preview-heading" class="text-sm font-bold text-body mb-4 flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold text-muted shrink-0">۲</span> پیش‌نمایش تولید</h4>
          <div id="variantPreviewBox" class="border border-border rounded-xl p-4 bg-card/30 text-sm leading-6 text-muted min-h-[56px]" role="status" aria-live="polite" aria-atomic="true">
            دکمه «پیش‌نمایش» را بزنید تا تعداد واریانت‌های جدید / بدون تغییر / غیرفعال‌شونده نمایش داده شود.
          </div>
          <div class="flex flex-col sm:flex-row gap-2 mt-4">
            <button type="button" id="btnPreviewVariants"
                    class="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-medium bg-surface border border-border text-body hover:bg-card hover:border-border/80 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
              <i data-lucide="eye" class="w-4 h-4" aria-hidden="true"></i> پیش‌نمایش
            </button>
            <button type="button" id="btnGenerateVariants"
                    class="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-medium bg-accent hover:bg-accent-hover text-white cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
              <i data-lucide="layers" class="w-4 h-4" aria-hidden="true"></i> ${t.generateVariants || 'اعمال و تولید واریانت‌ها'}
            </button>
          </div>
        </section>
      </div>`;
  },

  renderVariantSection({ variants = [], t = {} } = {}) {
    return `
      <section aria-labelledby="variants-heading" class="bg-body border border-border rounded-2xl p-4 md:p-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h4 id="variants-heading" class="text-sm font-bold text-body flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold text-muted shrink-0">۳</span> واریانت‌ها</h4>
          <div class="flex flex-wrap items-center gap-2">
            <label class="sr-only" for="variantFilterValue">فیلتر مقدار</label>
            <select id="variantFilterValue" class="min-h-[40px] bg-surface border border-border rounded-xl px-3 py-2 text-sm text-body focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none cursor-pointer transition-colors">
              <option value="">همه مقادیر</option>
            </select>
            <button type="button" id="btnToggleInactive" class="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 rounded-xl border border-border bg-surface text-xs font-medium text-muted hover:text-body hover:bg-card cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"><i data-lucide="eye" class="w-3.5 h-3.5" aria-hidden="true"></i> نمایش غیرفعال‌ها</button>
          </div>
        </div>
        <div class="flex flex-col sm:flex-row gap-2 mb-4">
          <label class="flex-1 min-w-0 space-y-1">
            <span class="block text-xs font-medium text-muted">قیمت همه</span>
            <input type="text" id="bulkPrice" inputmode="numeric" placeholder="تومان"
                   class="w-full min-h-[44px] bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-body placeholder:text-dim focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-colors">
          </label>
          <label class="w-full sm:w-40 shrink-0 space-y-1">
            <span class="block text-xs font-medium text-muted">موجودی همه</span>
            <input type="number" id="bulkQty" min="0" placeholder="۰"
                   class="w-full min-h-[44px] bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-body placeholder:text-dim focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-colors">
          </label>
          <div class="flex items-end">
            <button type="button" id="btnBulkApply" class="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-surface border border-border hover:bg-card text-sm font-medium text-body cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">اعمال گروهی</button>
          </div>
        </div>
        <div id="variantTableWrap">${VariantTable.render({ variants, t })}</div>
      </section>`;
  },

  render({ axes = [], variants = [], t = {} } = {}) {
    return this.renderAxesPreview({ axes, variants, t })
      + this.renderVariantSection({ variants, t });
  },

  _state: { showInactive: false, filterValueId: null },

  _bindTableActions(container, t, signal = container._variantTabAbortController?.signal) {
    const wrap = container.querySelector('#variantTableWrap');
    if (!wrap || wrap.dataset.bound) return;
    wrap.dataset.bound = '1';
    wrap.addEventListener('click', async (e) => {
      const showBtn = e.target.closest('[data-action="show-inactive"]');
      if (showBtn) {
        this._state.showInactive = true;
        const btn = container.querySelector('#btnToggleInactive');
        if (btn) btn.textContent = 'پنهان‌کردن غیرفعال‌ها';
        this._refreshTable(container, t);
        return;
      }
      const tg = e.target.closest('[data-action="toggle-active"]');
      if (tg) {
        const vid = Number(tg.dataset.variantId);
        try {
          window.setLoading?.(true);
          const row = tg.closest('[data-variant-id]');
          await window.API.products.updateVariant(vid, { is_active: row?.dataset.active === '1' ? 0 : 1 });
          await this._reloadProduct(container, t);
        } catch (err) {
          window.toast?.(err.message, 'error');
        } finally {
          window.setLoading?.(false);
        }
      }
    }, { signal });
  },

  async _reloadProduct(container, t) {
    const pid = container.dataset.productId;
    if (!pid) return;
    const p = await window.API.products.get(pid);
    const prod = p?.data || p;
    container.dataset.variants = JSON.stringify(prod.variants || []);
    this.updateTable(container, prod.variants || [], t);
    if (window.lucide) lucide.createIcons();
  },

  _refreshTable(container, t) {
    let variants = [];
    try { variants = JSON.parse(container.dataset.variants || '[]'); } catch { /* noop */ }
    this.updateTable(container, variants, t);
  },

  _collectAxesInput(container) {
    // Returns [{axis_id, value_ids: []}] from checked chips? New model: all active values selected
    const axes = [];
    try { return JSON.parse(container.dataset.axes || '[]').map((a) => ({ axis_id: a.id, value_ids: (a.values || []).filter((v) => Number(v.is_active ?? 1) === 1).map((v) => v.id) })); } catch { return axes; }
  },

  _fillFilterOptions(container) {
    const sel = container.querySelector('#variantFilterValue');
    if (!sel) return;
    let axes = [];
    try { axes = JSON.parse(container.dataset.axes || '[]'); } catch { /* noop */ }
    const cur = sel.value;
    sel.innerHTML = '<option value="">همه مقادیر</option>' + axes.flatMap((a) =>
      (a.values || []).filter((v) => Number(v.is_active ?? 1) === 1).map((v) =>
        `<option value="${v.id}">${escapeHtml(a.name)}: ${escapeHtml(v.value)}</option>`)).join('');
    if (cur) sel.value = cur;
  },

  bind(container, { productId, t = {}, onChanged = null } = {}) {
    if (!container) return;
    container._variantTabAbortController?.abort();
    const abortController = new AbortController();
    container._variantTabAbortController = abortController;
    const { signal } = abortController;
    container.dataset.vtabBound = '1';
    container.dataset.productId = productId || '';
    this._state = { showInactive: false, filterValueId: null };
    const api = () => window.API.products;

    const reload = async () => {
      const p = await api().get(productId);
      const prod = p?.data || p;
      container.dataset.axes = JSON.stringify(prod.variant_axes || []);
      container.dataset.variants = JSON.stringify(prod.variants || []);
      const panel = container.querySelector('#variantAxesPanel');
      if (panel) panel.innerHTML = renderAxesSection((prod.variant_axes || []).filter((a) => Number(a.is_active ?? 1) === 1), prod.variants || [], t);
      this._state.showInactive = false;
      this._state.filterValueId = null;
      this.updateTable(container, prod.variants || [], t);
      this._fillFilterOptions(container);
      if (window.lucide) lucide.createIcons();
      onChanged?.(prod);
      return prod;
    };

    const needId = () => {
      if (!productId) { window.toast?.('ابتدا محصول را ذخیره کنید', 'error'); return false; }
      return true;
    };

    function setAddValueError(axisId, msg) {
      const el = container.querySelector(`[data-error-add-value="${axisId}"]`);
      if (!el) return;
      if (!msg) { el.textContent = ''; el.classList.add('hidden'); el.classList.remove('text-accent'); return; }
      el.textContent = msg;
      el.classList.remove('hidden');
      el.classList.add('text-accent');
    }

    /* value input: Enter / , / ، + paste */
    container.addEventListener('keydown', async (e) => {
      const inp = e.target.closest('[data-add-value]');
      if (!inp) return;
      if (e.key !== 'Enter' && e.key !== ',' && e.key !== '،') return;
      e.preventDefault();
      const axisId = Number(inp.dataset.addValue);
      const raw = inp.value.trim().replace(/،/g, ',');
      const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
      if (!parts.length) { setAddValueError(axisId, 'مقداری وارد کنید'); inp.setAttribute('aria-invalid', 'true'); inp.setAttribute('aria-describedby', `err-add-${axisId}`); return; }
      setAddValueError(axisId, ''); inp.removeAttribute('aria-invalid'); inp.removeAttribute('aria-describedby');
      if (!needId()) return;
      try {
        window.setLoading?.(true);
        const hexInp = container.querySelector(`[data-add-hex="${axisId}"]`);
        for (const part of parts) {
          await api().createAxisValue(productId, axisId, { value: part, swatch_hex: hexInp?.value || null });
        }
        inp.value = '';
        await reload();
        window.toast?.('مقدار اضافه شد');
      } catch (err) {
        const m = err.displayMessage?.() || err.message || 'خطا در افزودن مقدار';
        setAddValueError(axisId, m); window.toast?.(m, 'error');
      }
      finally { window.setLoading?.(false); }
    }, { signal });

    container.addEventListener('paste', async (e) => {
      const inp = e.target.closest?.('[data-add-value]');
      if (!inp) return;
      const text = (e.clipboardData?.getData('text') || '').trim();
      if (!text.includes(',') && !text.includes('،') && !text.includes('\n')) return;
      e.preventDefault();
      const axisId = Number(inp.dataset.addValue);
      const parts = text.replace(/،/g, ',').split(/[,،\n]+/).map((s) => s.trim()).filter(Boolean);
      if (!parts.length || !needId()) return;
      setAddValueError(axisId, '');
      try {
        window.setLoading?.(true);
        const hexInp = container.querySelector(`[data-add-hex="${axisId}"]`);
        for (const part of parts) await api().createAxisValue(productId, axisId, { value: part, swatch_hex: hexInp?.value || null });
        await reload();
        window.toast?.(`${parts.length.toLocaleString('fa-IR')} مقدار اضافه شد`);
      } catch (err) {
        const m = err.displayMessage?.() || err.message || 'خطا در افزودن مقدار';
        setAddValueError(axisId, m); window.toast?.(m, 'error');
      }
      finally { window.setLoading?.(false); }
    }, { signal });

    /* swatch picker on existing chip */
    container.addEventListener('change', async (e) => {
      const picker = e.target.closest?.('[data-value-picker]');
      if (picker) {
        const vid = Number(picker.dataset.valuePicker);
        const axisId = Number(picker.dataset.axisId);
        try { await api().updateAxisValue(productId, axisId, vid, { swatch_hex: picker.value }); await reload(); }
        catch (err) { window.toast?.(err.message, 'error'); }
        return;
      }
      const typeSel = e.target.closest?.('[data-axis-type]');
      if (typeSel) {
        const axisId = Number(typeSel.dataset.axisType);
        try {
          window.setLoading?.(true);
          await api().updateAxis(productId, axisId, { input_type: typeSel.value });
          await reload();
        } catch (err) { window.toast?.(err.message, 'error'); }
        finally { window.setLoading?.(false); }
        return;
      }
      const filt = e.target.closest?.('#variantFilterValue');
      if (filt) {
        this._state.filterValueId = filt.value ? Number(filt.value) : null;
        this._refreshTable(container, t);
      }
    }, { signal });

    /* axis name save on blur — inline error */
    container.addEventListener('focusout', async (e) => {
      const nameInp = e.target.closest?.('[data-axis-name]');
      if (!nameInp) return;
      const axisId = Number(nameInp.dataset.axisName);
      const errEl = container.querySelector(`[data-error-axis="${axisId}"]`);
      const val = nameInp.value.trim();
      if (!val) {
        if (errEl) { errEl.textContent = 'نام محور نمی‌تواند خالی باشد'; errEl.classList.remove('hidden'); }
        nameInp.setAttribute('aria-invalid', 'true');
        if (errEl) nameInp.setAttribute('aria-describedby', errEl.id || '');
        return;
      }
      nameInp.removeAttribute('aria-invalid'); nameInp.removeAttribute('aria-describedby');
      if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
      let axes = [];
      try { axes = JSON.parse(container.dataset.axes || '[]'); } catch { /* noop */ }
      const cur = axes.find((a) => Number(a.id) === axisId);
      if (!cur || cur.name === val) return;
      try { await api().updateAxis(productId, axisId, { name: val }); await reload(); }
      catch (err) {
        const m = err.displayMessage?.() || err.message || 'خطا در ذخیره نام';
        if (errEl) { errEl.textContent = m; errEl.classList.remove('hidden'); }
        nameInp.setAttribute('aria-invalid', 'true');
        window.toast?.(m, 'error');
      }
    }, { signal });

    container.addEventListener('click', async (e) => {
      const preset = e.target.closest?.('[data-preset]');
      if (preset) {
        if (!needId()) return;
        const kind = preset.dataset.preset;
        try {
          window.setLoading?.(true);
          if (kind === 'simple') {
            const axes = JSON.parse(container.dataset.axes || '[]');
            if (!axes.length) { window.toast?.('محصول همین حالا بدون تنوع است'); return; }
            const confirmed = await window.showConfirmModal({
              title: 'تبدیل به محصول ساده',
              message: 'همه محورها غیرفعال شوند؟ واریانت‌ها به یک نماینده Default می‌رسند.',
              icon: 'trash-2',
              iconBg: 'bg-red-100',
              iconColor: 'text-red-600',
              confirmText: 'بله، ساده کن',
              confirmClass: 'bg-red-600 hover:bg-red-700',
            });
            if (!confirmed) return;
            for (const a of axes) await api().deleteAxis(productId, a.id);
            await reload();
            window.toast?.('محصول ساده شد');
          } else if (kind === 'clothing') {
            await this._applyClothingPreset(productId, container, reload);
          } else {
            const name = await window.showPromptModal({
              title: 'افزودن محور جدید',
              message: 'نام محور را وارد کنید (مثلاً: جنس، طول، جنس پارچه)',
              label: 'نام محور',
              placeholder: 'مثال: جنس',
            });
            if (!name?.trim()) return;
            const hasVariants = (JSON.parse(container.dataset.variants || '[]')).filter((v) => Number(v.is_active ?? 1) === 1).length > 1;
            if (hasVariants) {
              const firstVal = await window.showPromptModal({
                title: 'مقدار پیش‌فرض',
                message: 'واریانت‌های فعلی مربوط به کدام مقدار این محور هستند؟',
                label: 'مقدار اول',
                placeholder: 'مثال: M',
              });
              if (!firstVal?.trim()) return;
              await api().createAxisWithAssignment(productId, { name: name.trim(), input_type: 'text', values: [{ value: firstVal.trim() }], assign_existing_to_value: firstVal.trim() });
            } else {
              await api().createAxis(productId, { name: name.trim(), input_type: 'text' });
            }
            await reload();
          }
        } catch (err) { window.toast?.(err.message, 'error'); }
        finally { window.setLoading?.(false); }
        return;
      }

      if (e.target.closest?.('[data-add-axis]')) {
        if (!needId()) return;
        const name = await window.showPromptModal({
          title: 'افزودن محور جدید',
          message: 'نام محور را وارد کنید (مثلاً: جنس، طول، جنس پارچه)',
          label: 'نام محور',
          placeholder: 'مثال: جنس',
        });
        if (!name?.trim()) return;
        const hasVariants = (JSON.parse(container.dataset.variants || '[]')).filter((v) => Number(v.is_active ?? 1) === 1).length > 1;
        try {
          window.setLoading?.(true);
          if (hasVariants) {
            const firstVal = await window.showPromptModal({
              title: 'مقدار پیش‌فرض',
              message: `محصول واریانت دارد. واریانت‌های فعلی مربوط به کدام مقدار «${name.trim()}» هستند؟`,
              label: 'مقدار پیش‌فرض',
              placeholder: 'مثال: M',
            });
            if (!firstVal?.trim()) return;
            await api().createAxisWithAssignment(productId, { name: name.trim(), input_type: 'text', values: [{ value: firstVal.trim() }], assign_existing_to_value: firstVal.trim() });
          } else {
            await api().createAxis(productId, { name: name.trim(), input_type: 'text' });
          }
          await reload();
        } catch (err) { window.toast?.(err.message, 'error'); }
        finally { window.setLoading?.(false); }
        return;
      }

      const delAxis = e.target.closest?.('[data-del-axis]');
      if (delAxis) {
        const confirmed = await window.showConfirmModal({
          title: 'غیرفعال‌سازی محور',
          message: 'این محور غیرفعال شود؟ (حذف فیزیکی نمی‌شود؛ ترکیب‌ها نماینده می‌گیرند)',
          icon: 'archive',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          confirmText: 'غیرفعال کن',
          confirmClass: 'bg-amber-600 hover:bg-amber-700',
        });
        if (!confirmed) return;
        try { window.setLoading?.(true); await api().deleteAxis(productId, Number(delAxis.dataset.delAxis)); await reload(); }
        catch (err) { window.toast?.(err.message, 'error'); }
        finally { window.setLoading?.(false); }
        return;
      }

      const delVal = e.target.closest?.('[data-del-value]');
      if (delVal) {
        try { window.setLoading?.(true); await api().deleteAxisValue(productId, Number(delVal.dataset.axisId), Number(delVal.dataset.delValue)); await reload(); }
        catch (err) { window.toast?.(err.message, 'error'); }
        finally { window.setLoading?.(false); }
        return;
      }

      const up = e.target.closest?.('[data-axis-up]');
      const down = e.target.closest?.('[data-axis-down]');
      if (up || down) {
        const axisId = Number((up || down).dataset.axisUp || (up || down).dataset.axisDown);
        let axes = [];
        try { axes = JSON.parse(container.dataset.axes || '[]'); } catch { /* noop */ }
        const i = axes.findIndex((a) => Number(a.id) === axisId);
        const j = up ? i - 1 : i + 1;
        if (i < 0 || j < 0 || j >= axes.length) return;
        try {
          window.setLoading?.(true);
          await api().updateAxis(productId, axes[i].id, { sort_order: j });
          await api().updateAxis(productId, axes[j].id, { sort_order: i });
          await reload();
        } catch (err) { window.toast?.(err.message, 'error'); }
        finally { window.setLoading?.(false); }
        return;
      }

      if (e.target.closest?.('#btnPreviewVariants')) {
        if (!needId()) return;
        await this._runPreview(container, t, false);
        return;
      }
      if (e.target.closest?.('#btnGenerateVariants')) {
        if (!needId()) return;
        const preview = await this._runPreview(container, t, true);
        if (!preview) return;
        const over100 = (preview.totalDesired || 0) > 100;
        let msg = `این تنظیم ${Number(preview.totalDesired || 0).toLocaleString('fa-IR')} واریانت می‌سازد: ${preview.new} جدید، ${preview.keep} بدون تغییر، ${preview.deactivate} غیرفعال می‌شود.`;
        if (over100) msg += '\n⚠ بیش از ۱۰۰ ترکیب!';
        if (preview.deactivate > 0) {
          msg += '\nغیرفعال می‌شوند، حذف نمی‌شوند.';
          if ((preview.deactivatingWithOrders || []).length || (preview.deactivatingWithCart || []).length) {
            msg += ' برخی در سفارش/سبد هستند — سالم می‌مانند.';
          }
          const confirmed = await window.showConfirmModal({
            title: 'اعمال و تولید واریانت‌ها',
            message: msg,
            icon: 'alert-triangle',
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
            confirmText: 'بله، ادامه',
            cancelText: 'انصراف',
          });
          if (!confirmed) return;
        } else if (over100) {
          const confirmed = await window.showConfirmModal({
            title: 'تولید بیش از ۱۰۰ واریانت',
            message: msg + '\nادامه؟',
            icon: 'alert-triangle',
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
            confirmText: 'بله، ادامه',
            cancelText: 'انصراف',
          });
          if (!confirmed) return;
        }
        try {
          window.setLoading?.(true);
          const res = await api().generateVariants(productId, this._collectAxesInput(container));
          const list = res?.data || res || [];
          container.dataset.variants = JSON.stringify(list);
          this.updateTable(container, list, t);
          window.toast?.('واریانت‌ها اعمال شدند');
          await onChanged?.(null);
        } catch (err) { window.toast?.(err.message, 'error'); }
        finally { window.setLoading?.(false); }
        return;
      }

      if (e.target.closest?.('#btnToggleInactive')) {
        this._state.showInactive = !this._state.showInactive;
        const toggleBtn = e.target.closest('#btnToggleInactive');
        if (toggleBtn) toggleBtn.textContent = this._state.showInactive ? 'پنهان‌کردن غیرفعال‌ها' : 'نمایش غیرفعال‌ها';
        this._refreshTable(container, t);
        return;
      }

      if (e.target.closest?.('#btnBulkApply')) {
        if (!needId()) return;
        const priceRaw = container.querySelector('#bulkPrice')?.value || '';
        const qtyRaw = container.querySelector('#bulkQty')?.value || '';
        const payload = { mode: this._state.filterValueId ? 'filter' : 'all' };
        if (priceRaw.trim()) {
          const n = Number(String(priceRaw).replace(/[٬,]/g, '').replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
          if (Number.isFinite(n) && n >= 0) payload.price = Math.round(n);
        }
        if (qtyRaw.trim() !== '') payload.quantity = Math.max(0, Number(qtyRaw) || 0);
        if (this._state.filterValueId) payload.filter_value_id = this._state.filterValueId;
        if (payload.price == null && payload.quantity == null) { window.toast?.('قیمت یا موجودی را وارد کنید', 'error'); return; }
        try {
          window.setLoading?.(true);
          await api().bulkInventory(productId, payload);
          await reload();
          window.toast?.('اعمال شد');
        } catch (err) { window.toast?.(err.message, 'error'); }
        finally { window.setLoading?.(false); }
      }
    }, { signal });

    this._bindTableActions(container, t);
    this._fillFilterOptions(container);
    VariantTable.bindPriceInputs(container.querySelector('#variantTableWrap'));
  },

  async _applyClothingPreset(productId, container, reload) {
    const api = window.API.products;
    const axes = JSON.parse(container.dataset.axes || '[]');
    const hasSize = axes.some((a) => /size|سایز/i.test(a.slug || '') || /سایز/i.test(a.name || ''));
    if (!hasSize) {
      const hasVariants = (JSON.parse(container.dataset.variants || '[]')).filter((v) => Number(v.is_active ?? 1) === 1).length > 1;
      if (hasVariants) {
        const assign = await window.showPromptModal({
          title: 'اعمال پیش‌فرض پوشاک',
          message: 'محصول واریانت دارد. واریانت‌های فعلی مربوط به کدام سایز هستند؟',
          label: 'سایز پیش‌فرض',
          placeholder: 'مثال: M',
          value: 'M',
        });
        if (!assign?.trim()) return;
        await api.createAxisWithAssignment(productId, {
          name: 'سایز', input_type: 'text',
          values: PRESET_SIZES.map((s) => ({ value: s })),
          assign_existing_to_value: assign.trim(),
        });
      } else {
        const ax = await api.createAxis(productId, { name: 'سایز', input_type: 'text' });
        for (const s of PRESET_SIZES) await api.createAxisValue(productId, ax.id || ax.data?.id, { value: s });
      }
    }
    const axes2 = (await reload()).variant_axes || JSON.parse(container.dataset.axes || '[]');
    const hasColor = axes2.some((a) => /color|رنگ/i.test(a.slug || '') || /رنگ/i.test(a.name || ''));
    if (!hasColor) await api.createAxis(productId, { name: 'رنگ', input_type: 'swatch' });
    await reload();
    window.toast?.('پریست پوشاک اعمال شد');
  },

  async _runPreview(container, t, silent) {
    const box = container.querySelector('#variantPreviewBox');
    try {
      const preview = await window.API.products.previewGenerate(container.dataset.productId, this._collectAxesInput(container));
      const p = preview?.data || preview;
      if (box) {
        box.innerHTML = `این تنظیم <b>${Number(p.totalDesired || 0).toLocaleString('fa-IR')}</b> واریانت می‌سازد: `
          + `<span class="text-green-700">${Number(p.new || 0).toLocaleString('fa-IR')} جدید</span>، `
          + `${Number(p.keep || 0).toLocaleString('fa-IR')} بدون تغییر، `
          + `<span class="text-accent">${Number(p.deactivate || 0).toLocaleString('fa-IR')} غیرفعال می‌شود (نه حذف)</span>`
          + `${(p.totalDesired || 0) > 100 ? '<br>⚠ بیش از ۱۰۰ ترکیب!' : ''}`
          + `${((p.deactivatingWithOrders || []).length || (p.deactivatingWithCart || []).length) ? '<br>برخی ترکیب‌های غیرفعال‌شونده در سفارش/سبد هستند — تاریخچه سالم می‌ماند.' : ''}`;
      }
      return p;
    } catch (err) {
      if (!silent) window.toast?.(err.message, 'error');
      if (box) box.textContent = 'خطا در پیش‌نمایش: ' + err.message;
      return null;
    }
  },

  /* legacy compat for productEditor */
  refreshAxesPanel() {},
  ensureColorFormsBound() {},
  appendColorValue() {},
  collectVariants(container) {
    const wrap = container.querySelector('#variantTableWrap');
    return VariantTable.collectRows(wrap);
  },
  updateTable(container, variants, t) {
    const wrap = container.querySelector('#variantTableWrap');
    if (wrap) {
      wrap.innerHTML = VariantTable.render({ variants, t, showInactive: this._state.showInactive, filterValueId: this._state.filterValueId });
      VariantTable.bindPriceInputs(wrap);
      this._bindTableActions(container, t);
    }
  },
  bindPriceInputs(container) {
    const wrap = container?.querySelector('#variantTableWrap');
    if (wrap) VariantTable.bindPriceInputs(wrap);
  },
};

export default VariantsTab;
