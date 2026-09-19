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
    <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-sm">
      ${swatch ? `<input type="color" data-value-picker="${v.id}" value="${escapeAttr(v.swatch_hex || '#000000')}" class="w-6 h-6 rounded border border-border cursor-pointer" title="رنگ">` : ''}
      ${swatch && v.swatch_hex ? `<span class="w-4 h-4 rounded-full border border-border shrink-0" style="background:${escapeAttr(v.swatch_hex)}"></span>` : ''}
      <span>${escapeHtml(v.value)}</span>
      <button type="button" data-del-value="${v.id}" data-axis-id="${axis.id}" title="حذف مقدار (غیرفعال می‌شود)"
              class="text-dim hover:text-accent transition-colors text-base leading-none">×</button>
    </span>`).join('')
    || `<span class="text-xs text-dim">${escapeHtml(t.noValues || 'مقداری تعریف نشده — با Enter یا ویرگول اضافه کنید')}</span>`;

  return `
  <div class="border border-border rounded-2xl p-4 bg-card/50 space-y-3" data-axis-card="${axis.id}">
    <div class="flex flex-wrap items-center gap-2">
      <input type="text" data-axis-name="${axis.id}" value="${escapeAttr(axis.name || '')}" placeholder="نام محور، مثلاً: جنس"
             class="flex-1 min-w-[140px] bg-card border border-border rounded-xl px-3 py-2 text-sm text-body focus:border-accent outline-none">
      <select data-axis-type="${axis.id}" class="bg-card border border-border rounded-xl px-3 py-2 text-sm text-body focus:border-accent outline-none">
        <option value="text" ${swatch ? '' : 'selected'}>متن</option>
        <option value="swatch" ${swatch ? 'selected' : ''}>رنگ (دایره رنگی)</option>
      </select>
      <div class="flex items-center gap-1">
        <button type="button" data-axis-up="${axis.id}" ${idx === 0 ? 'disabled' : ''} title="بالا"
                class="px-2 py-1 rounded-lg border border-border text-muted hover:text-body disabled:opacity-30">↑</button>
        <button type="button" data-axis-down="${axis.id}" ${idx === total - 1 ? 'disabled' : ''} title="پایین"
                class="px-2 py-1 rounded-lg border border-border text-muted hover:text-body disabled:opacity-30">↓</button>
        <button type="button" data-del-axis="${axis.id}" title="حذف محور (فقط غیرفعال می‌شود)"
                class="px-2 py-1 rounded-lg border border-border text-muted hover:text-accent transition-colors">🗑</button>
      </div>
    </div>
    <div class="flex flex-wrap gap-2">${chips}</div>
    <div class="flex gap-2">
      <input type="text" data-add-value="${axis.id}" placeholder="مقدار جدید + Enter — مثلاً: نخی (ویرگول جدا می‌کند)"
             class="flex-1 min-w-[160px] bg-card border border-border rounded-xl px-3 py-2 text-sm text-body placeholder:text-dim focus:border-accent outline-none">
      ${swatch ? `<input type="color" data-add-hex="${axis.id}" value="#000000" class="w-10 h-10 rounded-lg border border-border bg-card cursor-pointer shrink-0" title="رنگ مقدار جدید">` : ''}
    </div>
  </div>`;
}

function renderAxesSection(axes, variants, t) {
  if (!axes.length) {
    const def = (variants || []).find((v) => v.title === 'Default') || variants[0] || {};
    const qty = def.inventory?.quantity ?? '';
    const price = def.price != null && def.price !== '' ? Number(def.price) : '';
    return `
    <div class="space-y-3">
      <div class="flex flex-wrap gap-2">
        <button type="button" data-preset="clothing" class="px-4 py-2 rounded-xl text-sm border border-border bg-card hover:border-accent transition-colors">👕 پوشاک (سایز + رنگ)</button>
        <button type="button" data-preset="simple" class="px-4 py-2 rounded-xl text-sm border border-accent bg-accent/10 text-body">بدون تنوع ✓</button>
        <button type="button" data-preset="custom" class="px-4 py-2 rounded-xl text-sm border border-border bg-card hover:border-accent transition-colors">✏️ سفارشی</button>
      </div>
      <div class="border border-border rounded-2xl p-4 bg-card/50 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="block text-muted mb-1 text-xs">قیمت (تومان)</label>
          <input type="text" id="simpleVariantPrice" data-simple-field="price" inputmode="numeric" value="${price !== '' ? price.toLocaleString('fa-IR') : ''}"
                 class="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-body focus:border-accent outline-none">
        </div>
        <div>
          <label class="block text-muted mb-1 text-xs">موجودی</label>
          <input type="number" data-simple-field="quantity" value="${qty}" min="0"
                 class="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-body focus:border-accent outline-none">
        </div>
        <div>
          <label class="block text-muted mb-1 text-xs">SKU</label>
          <input type="text" data-simple-field="sku" value="${escapeAttr(def.sku || '')}"
                 class="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-body focus:border-accent outline-none">
        </div>
      </div>
      <p class="text-xs text-muted">محصول ساده = ۰ محور + یک واریانت پیش‌فرض. برای افزودن تنوع، «پوشاک» یا «سفارشی» را بزنید.</p>
    </div>`;
  }
  return `
  <div class="space-y-3">
    <div class="flex flex-wrap gap-2">
      <button type="button" data-preset="clothing" class="px-4 py-2 rounded-xl text-sm border border-border bg-card hover:border-accent transition-colors">👕 پوشاک</button>
      <button type="button" data-preset="simple" class="px-4 py-2 rounded-xl text-sm border border-border bg-card hover:border-accent transition-colors">بدون تنوع</button>
      <button type="button" data-preset="custom" class="px-4 py-2 rounded-xl text-sm border border-border bg-card hover:border-accent transition-colors">✏️ سفارشی</button>
    </div>
    <div class="space-y-3" id="axesCards">
      ${axes.map((a, i) => renderAxisCard(a, i, axes.length, t)).join('')}
    </div>
    ${axes.length < 3
      ? `<button type="button" data-add-axis class="px-4 py-2 rounded-xl text-sm border border-dashed border-border text-muted hover:text-body hover:border-accent transition-colors">+ افزودن محور (حداکثر ۳)</button>`
      : `<p class="text-xs text-muted">سقف ۳ محور رسیده‌اید.</p>`}
  </div>`;
}

const VariantsTab = {
  render({ axes = [], variants = [], t = {} } = {}) {
    const active = (axes || []).filter((a) => Number(a.is_active ?? 1) === 1);
    return `
      <div id="productTabVariants" class="space-y-6">
        <section>
          <h4 class="text-sm font-bold text-body mb-3">۱. محورها</h4>
          <div id="variantAxesPanel">${renderAxesSection(active, variants, t)}</div>
        </section>
        <section>
          <h4 class="text-sm font-bold text-body mb-3">۲. پیش‌نمایش تولید</h4>
          <div id="variantPreviewBox" class="border border-border rounded-2xl p-4 bg-card/50 text-sm text-muted">
            دکمه «پیش‌نمایش» را بزنید تا تعداد واریانت‌های جدید / بدون تغییر / غیرفعال‌شونده نمایش داده شود.
          </div>
          <div class="flex flex-wrap gap-2 mt-3">
            <button type="button" id="btnPreviewVariants"
                    class="bg-surface hover:bg-card border border-border text-body px-4 py-2 rounded-xl text-sm transition-colors">
              پیش‌نمایش
            </button>
            <button type="button" id="btnGenerateVariants"
                    class="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-xl text-sm transition-colors">
              ${t.generateVariants || 'اعمال و تولید واریانت‌ها'}
            </button>
          </div>
        </section>
        <section>
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h4 class="text-sm font-bold text-body">۳. واریانت‌ها</h4>
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <select id="variantFilterValue" class="bg-card border border-border rounded-lg px-2 py-1.5 text-body">
                <option value="">همه مقادیر</option>
              </select>
              <button type="button" id="btnToggleInactive" class="px-2 py-1.5 rounded-lg border border-border text-muted hover:text-body">نمایش غیرفعال‌ها</button>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 mb-3 text-xs">
            <input type="text" id="bulkPrice" inputmode="numeric" placeholder="قیمت همه (تومان)"
                   class="w-36 bg-card border border-border rounded-lg px-2 py-1.5 text-body placeholder:text-dim focus:border-accent outline-none">
            <input type="number" id="bulkQty" min="0" placeholder="موجودی همه"
                   class="w-32 bg-card border border-border rounded-lg px-2 py-1.5 text-body placeholder:text-dim focus:border-accent outline-none">
            <button type="button" id="btnBulkApply" class="px-3 py-1.5 rounded-lg bg-surface border border-border hover:bg-card transition-colors">اعمال گروهی</button>
          </div>
          <div id="variantTableWrap">${VariantTable.render({ variants, t })}</div>
        </section>
      </div>`;
  },

  _state: { showInactive: false, filterValueId: null },

  updateTable(container, variants, t, opts = {}) {
    const wrap = container.querySelector('#variantTableWrap');
    if (wrap) {
      wrap.innerHTML = VariantTable.render({
        variants,
        t,
        showInactive: opts.showInactive ?? this._state.showInactive,
        filterValueId: opts.filterValueId ?? this._state.filterValueId,
      });
      VariantTable.bindPriceInputs(wrap);
      this._bindTableActions(container, t);
    }
  },

  _bindTableActions(container, t) {
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
          await window.API.products.updateVariant(vid, { is_active: tg.closest('tr')?.dataset.active === '1' ? 0 : 1 });
          await this._reloadProduct(container, t);
        } catch (err) {
          window.toast?.(err.message, 'error');
        } finally {
          window.setLoading?.(false);
        }
      }
    });
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
    if (!container || container.dataset.vtabBound) return;
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

    /* value input: Enter / , / ، + paste */
    container.addEventListener('keydown', async (e) => {
      const inp = e.target.closest('[data-add-value]');
      if (!inp) return;
      if (e.key !== 'Enter' && e.key !== ',' && e.key !== '،') return;
      e.preventDefault();
      const axisId = Number(inp.dataset.addValue);
      const raw = inp.value.trim().replace(/،/g, ',');
      const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
      if (!parts.length) return;
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
      } catch (err) { window.toast?.(err.message, 'error'); }
      finally { window.setLoading?.(false); }
    });

    container.addEventListener('paste', async (e) => {
      const inp = e.target.closest?.('[data-add-value]');
      if (!inp) return;
      const text = (e.clipboardData?.getData('text') || '').trim();
      if (!text.includes(',') && !text.includes('،') && !text.includes('\n')) return;
      e.preventDefault();
      const axisId = Number(inp.dataset.addValue);
      const parts = text.replace(/،/g, ',').split(/[,،\n]+/).map((s) => s.trim()).filter(Boolean);
      if (!parts.length || !needId()) return;
      try {
        window.setLoading?.(true);
        for (const part of parts) await api().createAxisValue(productId, axisId, { value: part });
        await reload();
        window.toast?.(`${parts.length.toLocaleString('fa-IR')} مقدار اضافه شد`);
      } catch (err) { window.toast?.(err.message, 'error'); }
      finally { window.setLoading?.(false); }
    });

    /* swatch picker on existing chip */
    container.addEventListener('change', async (e) => {
      const picker = e.target.closest?.('[data-value-picker]');
      if (picker) {
        const vid = Number(picker.dataset.valuePicker);
        try { await api().updateAxisValue(productId, 0, vid, { swatch_hex: picker.value }); await reload(); }
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
    });

    /* axis name save on blur */
    container.addEventListener('focusout', async (e) => {
      const nameInp = e.target.closest?.('[data-axis-name]');
      if (!nameInp) return;
      const axisId = Number(nameInp.dataset.axisName);
      let axes = [];
      try { axes = JSON.parse(container.dataset.axes || '[]'); } catch { /* noop */ }
      const cur = axes.find((a) => Number(a.id) === axisId);
      if (!cur || cur.name === nameInp.value.trim() || !nameInp.value.trim()) return;
      try { await api().updateAxis(productId, axisId, { name: nameInp.value.trim() }); await reload(); }
      catch (err) { window.toast?.(err.message, 'error'); }
    });

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
            if (!confirm('همه محورها غیرفعال شوند؟ واریانت‌ها به یک نماینده Default می‌رسند.')) return;
            for (const a of axes) await api().deleteAxis(productId, a.id);
            await reload();
            window.toast?.('محصول ساده شد');
          } else if (kind === 'clothing') {
            await this._applyClothingPreset(productId, container, reload);
          } else {
            const name = prompt('نام محور جدید (مثلاً: جنس):', '');
            if (!name?.trim()) return;
            const hasVariants = (JSON.parse(container.dataset.variants || '[]')).filter((v) => Number(v.is_active ?? 1) === 1).length > 1;
            if (hasVariants) {
              const firstVal = prompt('اولین مقدار این محور (واریانت‌های فعلی به آن وصل می‌شوند):', '');
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
        const name = prompt('نام محور جدید (مثلاً: جنس):', '');
        if (!name?.trim()) return;
        const hasVariants = (JSON.parse(container.dataset.variants || '[]')).filter((v) => Number(v.is_active ?? 1) === 1).length > 1;
        try {
          window.setLoading?.(true);
          if (hasVariants) {
            const firstVal = prompt(`محصول واریانت دارد. واریانت‌های فعلی مربوط به کدام مقدار «${name.trim()}» هستند؟`, '');
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
        if (!confirm('این محور غیرفعال شود؟ (حذف فیزیکی نمی‌شود؛ ترکیب‌ها نماینده می‌گیرند)')) return;
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
          if (!confirm(msg + '\nادامه؟')) return;
        } else if (over100) {
          if (!confirm(msg + '\nادامه؟')) return;
        }
        try {
          window.setLoading?.(true);
          const res = await api().generateVariants(productId, this._collectAxesInput(container));
          const list = res?.data || res || [];
          container.dataset.variants = JSON.stringify(list);
          this.updateTable(container, list, t);
          window.toast?.('واریانت‌ها اعمال شدند');
          onChanged?.(null);
        } catch (err) { window.toast?.(err.message, 'error'); }
        finally { window.setLoading?.(false); }
        return;
      }

      if (e.target.closest?.('#btnToggleInactive')) {
        this._state.showInactive = !this._state.showInactive;
        e.target.textContent = this._state.showInactive ? 'پنهان‌کردن غیرفعال‌ها' : 'نمایش غیرفعال‌ها';
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
    });

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
        const assign = prompt('محصول واریانت دارد. واریانت‌های فعلی مربوط به کدام سایز هستند؟ (مثلاً M)', 'M');
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
