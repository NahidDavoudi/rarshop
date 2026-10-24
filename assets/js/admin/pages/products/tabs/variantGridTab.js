/**
 * admin/pages/products/tabs/variantGridTab.js
 * گرید اکسل‌مانند واریانت‌ها: هر سطر = یک واریانت، هر ستون پارامتر = یک محور.
 * محورها و مقادیر از روی خود جدول ساخته می‌شوند؛ ذخیره با یک درخواست انجام می‌شود.
 */
import { attachPriceFormatterAll } from '../../../../utils/priceFormatter.js';
import { escapeHtml, escapeAttr } from '../../../../utils/htmlEscape.js';
import Button from '../../../components/Button.js';

const MAX_AXES = 3;
const MAX_ROWS = 300;
const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';
const EXTRA = ['sku', 'price', 'quantity'];

const faNum = (n) => Number(n).toLocaleString('fa-IR');

function toNum(s) {
  const t = String(s ?? '')
    .replace(/[۰-۹]/g, (d) => FA.indexOf(d))
    .replace(/[٠-٩]/g, (d) => AR.indexOf(d))
    .replace(/[٬,،\s]/g, '');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
const fmtPrice = (n) => (n == null ? '' : Number(n).toLocaleString('fa-IR'));

const emptyCell = () => ({ value: '', hex: null });
const maxRows = (st) => (st.axes.length ? MAX_ROWS : 1);

function blankRow(st) {
  const last = st.rows[st.rows.length - 1];
  return {
    id: null,
    cells: st.axes.map(emptyCell),
    sku: '',
    price: last?.price || '',
    quantity: 0,
  };
}

function fromProduct(product) {
  const axes = (product?.variant_axes || [])
    .filter((a) => Number(a.is_active ?? 1) === 1)
    .map((a) => ({ id: a.id, name: a.name || '', input_type: a.input_type || 'text' }));

  const rows = (product?.variants || [])
    .filter((v) => Number(v.is_active ?? 1) === 1)
    .map((v) => {
      const byAxis = new Map((v.attribute_values || []).map((av) => [Number(av.axis_id), av]));
      return {
        id: v.id,
        cells: axes.map((a) => {
          const av = byAxis.get(Number(a.id));
          return av ? { value: av.value || '', hex: av.swatch_hex || null } : emptyCell();
        }),
        sku: v.sku || '',
        price: v.price != null && v.price !== '' ? fmtPrice(v.price) : '',
        quantity: Number(v.inventory?.quantity ?? 0),
      };
    });

  const st = { axes, rows };
  if (!st.rows.length) st.rows.push(blankRow(st));
  return st;
}

/* ───────────── HTML ───────────── */
const TH = 'border border-border bg-surface px-1 py-1.5 sm:px-2 sm:py-2 text-xs font-medium text-muted text-right align-middle';
const TD = 'border border-border p-0 align-middle bg-body';
const CELL = 'class="w-[var(--w,100%)] sm:w-full min-w-0 sm:min-w-[110px] bg-transparent px-1.5 py-2 sm:px-3 sm:py-2.5 text-sm text-body placeholder:text-dim outline-none focus:bg-accent/5 focus:ring-2 focus:ring-inset focus:ring-accent"';
const ICON_BTN = 'w-6 h-6 sm:w-7 sm:h-7 inline-flex items-center justify-center rounded-md sm:rounded-lg text-muted hover:text-accent hover:bg-accent/10 cursor-pointer transition-colors';
const COL_LIMITS = { axis: [5, 14], sku: [5, 10], price: [8, 12], quantity: [3, 6] };

function headHtml(st) {
  const nAx = st.axes.length;

  const axisTh = st.axes.map((a, ci) => `
    <th class="${TH} w-[1%] sm:w-auto">
      <div class="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center">
        <input type="text" data-axis-name="${ci}" value="${escapeAttr(a.name)}" placeholder="نام ستون"
               aria-label="نام ستون ${ci + 1}"
               class="w-full sm:flex-1 min-w-[56px] sm:min-w-[90px] bg-transparent text-xs font-bold text-body placeholder:text-dim placeholder:font-normal outline-none focus:ring-1 focus:ring-accent rounded px-1 py-0.5">
        <div class="flex items-center justify-between gap-0.5 sm:contents">
          <select data-axis-type="${ci}" aria-label="نوع ستون"
                  class="w-[46px] sm:w-auto text-[10px] sm:text-[11px] bg-transparent text-muted outline-none cursor-pointer border border-border rounded px-0.5 sm:px-1 py-0.5">
            <option value="text" ${a.input_type === 'swatch' ? '' : 'selected'}>متن</option>
            <option value="swatch" ${a.input_type === 'swatch' ? 'selected' : ''}>رنگ</option>
          </select>
          ${Button.render({
            variant: 'ghost', size: 'iconSm', className: 'shrink-0',
            label: '×',
            attrs: { 'data-del-axis': ci, title: 'حذف ستون', 'aria-label': 'حذف ستون' },
          })}
        </div>
      </div>
    </th>`).join('');

  // در موبایل دکمه‌ی افزودن ستون پایین جدول است، نه توی هدر
  const addAxis = nAx < MAX_AXES
    ? `<th class="${TH} hidden sm:table-cell">
         ${Button.render({
           variant: 'outline', size: 'none',
           className: 'px-1.5 py-1 rounded-lg border-dashed text-muted hover:text-body hover:border-accent whitespace-nowrap text-xs',
           label: '＋ ستون پارامتر',
           attrs: { 'data-add-axis': '' },
         })}
       </th>`
    : '';

  const fill = (f) =>
    Button.render({
      variant: 'ghost', size: 'none',
      className: 'ms-0.5 sm:ms-1 !min-h-0 !font-normal text-[10px] sm:text-[11px] !text-dim hover:!text-accent !rounded',
      label: '<span class="hidden sm:inline">↓ همه</span><span class="sm:hidden">↓</span>',
      attrs: { 'data-fill': f, title: 'مقدار سطر اول را برای همه کپی کن' },
    });

  return `
    <tr>
      <th class="${TH} w-8 sm:w-10 text-center">#</th>
      ${axisTh}
      ${addAxis}
      <th class="${TH}">SKU</th>
      <th class="${TH}">قیمت<span class="hidden sm:inline"> (تومان)</span>${fill('price')}</th>
      <th class="${TH}">موجودی${fill('quantity')}</th>
      <th class="${TH} w-14 sm:w-20"></th>
    </tr>`;
}

function rowHtml(st, r, i) {
  const nAx = st.axes.length;

  const cells = r.cells.map((c, ci) => {
    const ax = st.axes[ci];
    const swatch = ax.input_type === 'swatch';
    return `
      <td class="${TD}">
        <div class="flex items-center">
          ${swatch ? `<input type="color" data-hex="${i}:${ci}" value="${escapeAttr(c.hex || '#cccccc')}" title="رنگ"
                class="w-5 h-5 sm:w-7 sm:h-7 ms-1 sm:ms-2 rounded border border-border cursor-pointer shrink-0 ${c.hex ? '' : 'opacity-50'}">` : ''}
          <input type="text" ${CELL} data-nav="${i}:${ci}" data-cell="${i}:${ci}" list="vg-dl-${ci}"
                 value="${escapeAttr(c.value)}" placeholder="${escapeAttr(ax.name || 'مقدار')}" autocomplete="off">
        </div>
      </td>`;
  }).join('');

  return `
    <tr data-row="${i}" ${r.id ? `data-variant-id="${r.id}"` : ''}>
      <td class="${TD} text-center text-xs text-dim w-8 sm:w-10 select-none">${faNum(i + 1)}</td>
      ${cells}
      ${nAx < MAX_AXES ? `<td class="${TD} bg-surface/40 hidden sm:table-cell"></td>` : ''}
      <td class="${TD}"><input type="text" ${CELL} dir="ltr" data-nav="${i}:${nAx}" data-field="sku" value="${escapeAttr(r.sku)}" placeholder="خودکار"></td>
      <td class="${TD}"><input type="text" ${CELL} data-nav="${i}:${nAx + 1}" data-field="price" inputmode="numeric" value="${escapeAttr(r.price)}" placeholder="—"></td>
      <td class="${TD}"><input type="number" ${CELL} data-nav="${i}:${nAx + 2}" data-field="quantity" min="0" value="${Number(r.quantity) || 0}"></td>
      <td class="${TD} text-center whitespace-nowrap">
        ${Button.render({
          variant: 'ghost', size: 'iconSm',
          label: '⧉',
          attrs: { 'data-dup-row': i, title: 'کپی سطر', 'aria-label': 'کپی سطر' },
        })}
        ${Button.render({
          variant: 'ghostDanger', size: 'iconSm',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
          attrs: { 'data-del-row': i, title: 'حذف سطر', 'aria-label': 'حذف سطر' },
        })}
      </td>
    </tr>`;
}

function datalistsHtml(st) {
  return st.axes.map((_, ci) => {
    const uniq = [...new Set(st.rows.map((r) => r.cells[ci]?.value.trim()).filter(Boolean))];
    return `<datalist id="vg-dl-${ci}">${uniq.map((v) => `<option value="${escapeAttr(v)}"></option>`).join('')}</datalist>`;
  }).join('');
}

function shellHtml(st) {
  const canAdd = st.axes.length > 0;
  return `
    <div class="space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p class="text-xs text-muted leading-6">
          هر سطر یک واریانت است. ستون پارامتر اضافه کنید (مثلاً رنگ، سایز) و مقدارها را مستقیم در خانه‌ها بنویسید.
          <br>Enter = خانه‌ی پایین · از اکسل می‌توانید چندسطری Paste کنید.
        </p>
        <div class="flex items-center gap-2 shrink-0">
          <span id="vgDirty" class="text-xs text-amber-600 hidden">ذخیره‌نشده</span>
          ${Button.render({ variant: 'secondary', size: 'sm', label: 'بازگردانی', attrs: { 'data-reset': '' } })}
          ${Button.render({
            variant: 'primary', size: 'sm',
            label: '<span class="hidden sm:inline">ذخیره واریانت‌ها</span><span class="sm:hidden">ذخیره</span>',
            attrs: { 'data-save': '' },
          })}
        </div>
      </div>

      <div class="overflow-x-auto rounded-xl border border-border">
        <table class="w-max sm:w-full text-right border-collapse sm:min-w-[560px]" dir="rtl">
          <thead id="vgHead">${headHtml(st)}</thead>
          <tbody id="vgBody">${st.rows.map((r, i) => rowHtml(st, r, i)).join('')}</tbody>
        </table>
      </div>
      ${datalistsHtml(st)}

      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          ${Button.render({
            variant: 'outline', size: 'sm',
            className: 'border-dashed text-muted hover:text-body hover:border-accent',
            label: '＋ سطر جدید',
            disabled: !canAdd,
            attrs: { 'data-add-row': '' },
          })}
          ${st.axes.length < MAX_AXES ? Button.render({
            variant: 'outline', size: 'sm',
            className: 'sm:hidden border-dashed text-muted hover:text-body hover:border-accent',
            label: '＋ ستون',
            attrs: { 'data-add-axis': '' },
          }) : ''}
        </div>
        <p id="vgSummary" class="text-xs text-muted"></p>
      </div>
      <div id="vgErrors" class="hidden rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs text-accent leading-6" role="alert"></div>
      <p class="text-[11px] text-dim">${canAdd ? '' : 'محصول بدون پارامتر فقط یک واریانت دارد؛ برای تنوع، «＋ ستون پارامتر» را بزنید. '}سطرهای حذف‌شده غیرفعال می‌شوند (از سفارش‌های قبلی پاک نمی‌شوند).</p>
    </div>`;
}

/* ───────────── state / logic ───────────── */
let cur = null; // { root, state, productId, opts, dirty }
const S = () => cur.state;

function rowKey(st, r) {
  if (!st.axes.length) return null;
  const vals = r.cells.map((c) => c.value.trim().toLowerCase());
  return vals.every(Boolean) ? vals.join('\u001f') : null;
}

function duplicateIndexes(st) {
  const seen = new Map();
  const dup = new Set();
  st.rows.forEach((r, i) => {
    const k = rowKey(st, r);
    if (k == null) return;
    if (seen.has(k)) { dup.add(i); dup.add(seen.get(k)); } else seen.set(k, i);
  });
  return dup;
}

function refreshDup() {
  if (!cur) return;
  const st = S();
  const dup = duplicateIndexes(st);
  cur.root.querySelectorAll('tr[data-row]').forEach((tr) => {
    tr.classList.toggle('bg-red-50', dup.has(Number(tr.dataset.row)));
  });
  const sum = cur.root.querySelector('#vgSummary');
  if (sum) {
    sum.textContent = `${faNum(st.rows.length)} سطر` + (dup.size ? ' · ⚠ ترکیب تکراری دارید' : '');
    sum.classList.toggle('text-accent', dup.size > 0);
  }
}

function applyWidths() {
  if (!cur) return;
  const st = S();
  const nAx = st.axes.length;
  const lens = new Array(nAx + 3).fill(0);

  st.rows.forEach((r) => {
    r.cells.forEach((c, ci) => { lens[ci] = Math.max(lens[ci], c.value.trim().length); });
    lens[nAx] = Math.max(lens[nAx], String(r.sku || '').length);
    lens[nAx + 1] = Math.max(lens[nAx + 1], String(r.price || '').length);
    lens[nAx + 2] = Math.max(lens[nAx + 2], String(r.quantity ?? '').length);
  });

  const w = lens.map((len, c) => {
    const key = c < nAx ? 'axis' : EXTRA[c - nAx];
    const [min, max] = COL_LIMITS[key];
    return Math.min(max, Math.max(min, len)) + 3; // +3ch برای padding
  });

  cur.root.querySelectorAll('[data-nav]').forEach((el) => {
    const c = Number(el.dataset.nav.split(':')[1]);
    if (w[c]) el.style.setProperty('--w', `${w[c]}ch`);
  });
}

function markDirty() {
  cur.dirty = true;
  cur.root.querySelector('#vgDirty')?.classList.remove('hidden');
  cur.opts.onDirty?.();
}

function showErrors(list) {
  const box = cur.root.querySelector('#vgErrors');
  if (!box) return;
  if (!list.length) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  box.classList.remove('hidden');
  box.innerHTML = list.map((e) => `<div>• ${escapeHtml(e)}</div>`).join('');
}

function paint(focusSel) {
  const root = cur.root;
  root.innerHTML = shellHtml(S());
  attachPriceFormatterAll(root.querySelector('#vgBody'));
  refreshDup();
  applyWidths();
  if (cur.dirty) root.querySelector('#vgDirty')?.classList.remove('hidden');
  if (focusSel) {
    const el = root.querySelector(focusSel);
    el?.focus();
    el?.select?.();
  }
}

const navSel = (r, c) => `[data-nav="${r}:${c}"]`;

function setByNav(st, row, c, val) {
  const nAx = st.axes.length;
  if (c < nAx) { row.cells[c].value = val; return; }
  const f = EXTRA[c - nAx];
  if (f === 'sku') row.sku = val;
  else if (f === 'price') { const n = toNum(val); row.price = n == null ? '' : fmtPrice(n); }
  else if (f === 'quantity') { const n = toNum(val); row.quantity = n == null ? 0 : Math.max(0, Math.round(n)); }
}

function validate(st) {
  const errs = [];
  const names = new Set();
  st.axes.forEach((a, i) => {
    const n = a.name.trim().toLowerCase();
    if (!n) errs.push(`نام ستون ${faNum(i + 1)} خالی است.`);
    else if (names.has(n)) errs.push(`نام ستون «${a.name.trim()}» تکراری است.`);
    names.add(n);
  });
  st.rows.forEach((r, i) => {
    r.cells.forEach((c, ci) => {
      if (!c.value.trim()) errs.push(`سطر ${faNum(i + 1)}: خانه‌ی «${st.axes[ci].name || `ستون ${ci + 1}`}» خالی است.`);
    });
    const p = toNum(r.price);
    if (p == null || p < 0) errs.push(`سطر ${faNum(i + 1)}: قیمت وارد نشده است.`);
  });
  const dup = duplicateIndexes(st);
  if (dup.size) errs.push(`ترکیب تکراری در سطرهای: ${[...dup].map((i) => faNum(i + 1)).join('، ')}`);
  return errs;
}

function buildPayload(st) {
  return {
    axes: st.axes.map((a) => ({ id: a.id || null, name: a.name.trim(), input_type: a.input_type })),
    rows: st.rows.map((r) => ({
      id: r.id || null,
      values: r.cells.map((c, ci) => ({
        value: c.value.trim(),
        hex: st.axes[ci].input_type === 'swatch' ? c.hex : null,
      })),
      sku: r.sku.trim(),
      price: toNum(r.price),
      quantity: Math.max(0, Math.round(toNum(r.quantity) || 0)),
    })),
  };
}

async function save({ silent = false } = {}) {
  if (!cur) return;
  if (!cur.productId) { const m = 'ابتدا اطلاعات پایه محصول را ذخیره کنید'; window.toast?.(m, 'error'); throw new Error(m); }
  const errs = validate(S());
  showErrors(errs);
  if (errs.length) {
    if (!silent) window.toast?.(errs[0], 'error');
    throw new Error(errs[0]);
  }
  try {
    window.setLoading?.(true);
    await window.API.products.syncVariantGrid(cur.productId, buildPayload(S()));
    const raw = await window.API.products.get(cur.productId);
    const product = raw?.data || raw;
    cur.state = fromProduct(product);
    cur.dirty = false;
    paint();
    cur.opts.onSaved?.(product);
    if (!silent) window.toast?.('واریانت‌ها ذخیره شد');
  } catch (err) {
    const m = err.displayMessage?.() || err.message || 'خطا در ذخیره واریانت‌ها';
    showErrors([m]);
    if (!silent) window.toast?.(m, 'error');
    throw err;
  } finally {
    window.setLoading?.(false);
  }
}

async function askConfirm(title, message) {
  if (window.showConfirmModal) {
    return window.showConfirmModal({
      title, message, icon: 'alert-triangle', iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
      confirmText: 'بله', cancelText: 'انصراف',
    });
  }
  return confirm(message);
}

/* ───────────── public API ───────────── */
const VariantGrid = {
  render() {
    return '<div id="variantGridRoot"></div>';
  },

  mount(root, { product = null, productId = null, onDirty = null, onSaved = null } = {}) {
    if (!root) return;
    root._vgAbort?.abort();
    const ac = new AbortController();
    root._vgAbort = ac;
    const { signal } = ac;

    cur = { root, state: fromProduct(product), productId, opts: { onDirty, onSaved }, dirty: false, product };
    paint();

    root.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.cell) {
        const [r, c] = t.dataset.cell.split(':').map(Number);
        S().rows[r].cells[c].value = t.value;
        markDirty(); refreshDup(); applyWidths();
      } else if (t.dataset.field) {
        const r = Number(t.closest('tr').dataset.row);
        S().rows[r][t.dataset.field] = t.value;
        markDirty();
      } else if (t.dataset.axisName !== undefined) {
        const i = Number(t.dataset.axisName);
        S().axes[i].name = t.value;
        root.querySelectorAll(`[data-cell$=":${i}"]`).forEach((el) => { el.placeholder = t.value || 'مقدار'; });
        markDirty();
      }
    }, { signal });

    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.field) {
        const r = Number(t.closest('tr').dataset.row);
        S().rows[r][t.dataset.field] = t.value;
        markDirty();
      } else if (t.dataset.axisType !== undefined) {
        S().axes[Number(t.dataset.axisType)].input_type = t.value;
        markDirty(); paint(); applyWidths();
      } else if (t.dataset.hex) {
        const [r, c] = t.dataset.hex.split(':').map(Number);
        S().rows[r].cells[c].hex = t.value.toUpperCase();
        t.classList.remove('opacity-50');
        markDirty();
      }
    }, { signal });

    root.addEventListener('keydown', (e) => {
      const t = e.target;
      if (!t.dataset?.nav || e.key !== 'Enter') return;
      e.preventDefault();
      const [r, c] = t.dataset.nav.split(':').map(Number);
      const nr = e.shiftKey ? r - 1 : r + 1;
      if (nr < 0) return;
      if (nr >= S().rows.length) {
        if (S().rows.length >= maxRows(S())) return;
        S().rows.push(blankRow(S()));
        markDirty();
        paint(navSel(nr, c));
        return;
      }
      root.querySelector(navSel(nr, c))?.focus();
      root.querySelector(navSel(nr, c))?.select?.();
    }, { signal });

    root.addEventListener('paste', (e) => {
      const t = e.target;
      if (!t.dataset?.nav) return;
      const text = (e.clipboardData?.getData('text') || '').replace(/\r/g, '').replace(/\n+$/, '');
      if (!/[\t\n]/.test(text)) return; // تک‌مقدار: Paste عادی
      e.preventDefault();
      const st = S();
      const [r0, c0] = t.dataset.nav.split(':').map(Number);
      const total = st.axes.length + EXTRA.length;
      text.split('\n').map((l) => l.split('\t')).forEach((cols, li) => {
        const r = r0 + li;
        if (r >= maxRows(st)) return;
        while (st.rows.length <= r) st.rows.push(blankRow(st));
        cols.forEach((val, ci) => {
          const c = c0 + ci;
          if (c < total) setByNav(st, st.rows[r], c, val.trim());
        });
      });
      markDirty();
      paint(navSel(r0, c0));
    }, { signal });

    root.addEventListener('click', async (e) => {
      const st = S();
      const btn = e.target.closest('button');
      if (!btn) return;

      if (btn.hasAttribute('data-save')) { try { await save(); } catch { /* نمایش داده شد */ } return; }

      if (btn.hasAttribute('data-reset')) {
        if (cur.dirty && !(await askConfirm('بازگردانی', 'تغییرات ذخیره‌نشده‌ی واریانت‌ها از بین می‌رود. ادامه می‌دهید؟'))) return;
        try {
          const raw = cur.productId ? await window.API.products.get(cur.productId) : null;
          cur.state = fromProduct(raw?.data || raw);
          cur.dirty = false; showErrors([]); paint();
        } catch (err) { window.toast?.(err.message, 'error'); }
        return;
      }

      if (btn.hasAttribute('data-add-row')) {
        if (st.rows.length >= maxRows(st)) { window.toast?.('به سقف تعداد سطرها رسیده‌اید', 'error'); return; }
        st.rows.push(blankRow(st));
        markDirty(); paint(navSel(st.rows.length - 1, 0));
        return;
      }

      if (btn.hasAttribute('data-add-axis')) {
        if (st.axes.length >= MAX_AXES) return;
        st.axes.push({ id: null, name: '', input_type: 'text' });
        st.rows.forEach((r) => r.cells.push(emptyCell()));
        markDirty(); paint(`[data-axis-name="${st.axes.length - 1}"]`);
        return;
      }

      if (btn.dataset.delAxis !== undefined) {
        const i = Number(btn.dataset.delAxis);
        const label = st.axes[i].name.trim() || `ستون ${faNum(i + 1)}`;
        if (!(await askConfirm('حذف ستون', `ستون «${label}» حذف شود؟ سطرهایی که فقط در این پارامتر فرق داشتند تکراری می‌شوند.`))) return;
        st.axes.splice(i, 1);
        st.rows.forEach((r) => r.cells.splice(i, 1));
        if (!st.axes.length) st.rows.splice(1);
        markDirty(); paint();
        return;
      }

      if (btn.dataset.delRow !== undefined) {
        if (st.rows.length <= 1) { window.toast?.('حداقل یک سطر لازم است', 'error'); return; }
        st.rows.splice(Number(btn.dataset.delRow), 1);
        markDirty(); paint();
        return;
      }

      if (btn.dataset.dupRow !== undefined) {
        if (st.rows.length >= maxRows(st)) { window.toast?.('به سقف تعداد سطرها رسیده‌اید', 'error'); return; }
        const i = Number(btn.dataset.dupRow);
        const src = st.rows[i];
        st.rows.splice(i + 1, 0, {
          id: null,
          cells: src.cells.map((c) => ({ ...c })),
          sku: '', price: src.price, quantity: src.quantity,
        });
        markDirty();
        paint(navSel(i + 1, Math.max(0, st.axes.length - 1)));
        return;
      }

      if (btn.dataset.fill) {
        const f = btn.dataset.fill;
        const v = st.rows[0]?.[f];
        st.rows.forEach((r) => { r[f] = v; });
        markDirty(); paint();
      }
    }, { signal });
  },

  isDirty() { return !!cur?.dirty; },
  save,
};

export default VariantGrid;
