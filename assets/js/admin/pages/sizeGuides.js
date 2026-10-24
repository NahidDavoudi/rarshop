/**
 * admin/pages/sizeGuides.js
 * مدیریت راهنمای سایز: لیست، ایجاد، ویرایش، حذف
 * وابستگی: helpers.js, api.js
 */
import Button from '../../components/Button.js';

;(function () {
    'use strict';
  
    function _t(path, fallback) {
      return window.getAdminText?.(path, fallback) ?? fallback;
    }
  
    /* ── Form state (ستون‌ها/ردیف‌های در حال ویرایش) ─────────────── */
    let editingId = null;
    let formState = { columns: [''], rows: [['']] };
  
    /* ── Render list ───────────────────────────────────────────── */
    function renderSizeGuides(list) {
      const el = $('sizeGuidesContainer');
      if (!el) return;
  
      if (!list?.length) {
        el.innerHTML = `<p class="text-dim col-span-full text-center py-8">${_t('sizeGuides.empty', 'راهنمای سایزی ثبت نشده')}</p>`;
        return;
      }
  
      el.innerHTML = list.map(g => `
        <div class="admin-card rounded-2xl p-5 flex flex-col gap-3">
          <div class="flex items-center justify-between gap-3">
            <span class="font-bold text-body">${g.name}</span>
            ${g.category ? `<span class="text-xs px-2 py-1 rounded-full bg-surface border border-border text-muted">${g.category}</span>` : ''}
          </div>
          <p class="text-xs text-dim">
            ${(g.columns || []).length} ستون · ${(g.rows || []).length} ردیف
          </p>
          <div class="flex gap-2 pt-2 border-t border-border">
            ${Button.render({
              variant: 'secondary', size: 'sm', className: 'flex-1',
              label: _t('sizeGuides.edit', 'ویرایش'),
              attrs: { onclick: `editSizeGuide(${g.id})` },
            })}
            ${Button.render({
              variant: 'soft', size: 'sm', className: 'flex-1',
              label: _t('sizeGuides.delete', 'حذف'),
              attrs: { onclick: `deleteSizeGuide(${g.id})` },
            })}
          </div>
        </div>`).join('');
    }
  
    /* ── Public loader ─────────────────────────────────────────── */
    window.loadSizeGuides = async function () {
      const el = $('sizeGuidesContainer');
      if (!el) return;
  
      el.innerHTML = `<p class="text-dim col-span-full text-center py-8 animate-pulse">${_t('sizeGuides.loading', 'در حال بارگذاری...')}</p>`;
  
      try {
        const list = await API.sizeGuides.list();
        renderSizeGuides(Array.isArray(list) ? list : (list?.data || []));
      } catch (e) {
        el.innerHTML = `<p class="text-accent col-span-full text-center py-8">${e.message}</p>`;
      }
    };
  
    /* ── Delete ─────────────────────────────────────────────────── */
    window.deleteSizeGuide = async function (id) {
      if (!confirm('حذف شود؟')) return;
      try {
        await API.sizeGuides.delete(id);
        toast('راهنمای سایز حذف شد');
        loadSizeGuides();
      } catch (e) {
        toast(e.message, 'error');
      }
    };
  
    /* ── Columns editor ────────────────────────────────────────── */
    function renderColumnsEditor() {
      const wrap = $('sizeGuideColumnsWrap');
      if (!wrap) return;
  
      wrap.innerHTML = formState.columns.map((col, idx) => `
        <div class="flex items-center gap-2">
          <input type="text" value="${col.replace(/"/g, '&quot;')}"
            oninput="updateSizeGuideColumn(${idx}, this.value)"
            placeholder="مثلا: سایز"
            class="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-body focus:border-accent outline-none">
          ${formState.columns.length > 1 ? `
            ${Button.render({
              variant: 'ghost', size: 'none',
              className: 'text-muted hover:text-accent p-1',
              icon: '<i data-lucide="trash-2" class="w-4 h-4"></i>',
              attrs: { onclick: `removeSizeGuideColumn(${idx})` },
            })}` : ''}
        </div>`).join('');
  
      window.lucide?.createIcons?.();
    }
  
    window.addSizeGuideColumn = function () {
      formState.columns.push('');
      formState.rows = formState.rows.map(row => [...row, '']);
      renderColumnsEditor();
      renderRowsEditor();
    };
  
    window.removeSizeGuideColumn = function (idx) {
      if (formState.columns.length <= 1) return;
      formState.columns.splice(idx, 1);
      formState.rows = formState.rows.map(row => {
        row.splice(idx, 1);
        return row;
      });
      renderColumnsEditor();
      renderRowsEditor();
    };
  
    window.updateSizeGuideColumn = function (idx, value) {
      formState.columns[idx] = value;
    };
  
    /* ── Rows editor ───────────────────────────────────────────── */
    function renderRowsEditor() {
      const wrap = $('sizeGuideRowsWrap');
      if (!wrap) return;
  
      wrap.innerHTML = formState.rows.map((row, rIdx) => `
        <div class="flex items-center gap-2">
          <div class="flex-1 grid gap-2" style="grid-template-columns: repeat(${formState.columns.length}, minmax(70px, 1fr));">
            ${row.map((cell, cIdx) => `
              <input type="text" value="${(cell ?? '').toString().replace(/"/g, '&quot;')}"
                oninput="updateSizeGuideCell(${rIdx}, ${cIdx}, this.value)"
                class="bg-card border border-border rounded-lg px-2 py-2 text-sm text-body focus:border-accent outline-none">
            `).join('')}
          </div>
          ${formState.rows.length > 1 ? `
            ${Button.render({
              variant: 'ghost', size: 'none',
              className: 'text-muted hover:text-accent p-1 shrink-0',
              icon: '<i data-lucide="trash-2" class="w-4 h-4"></i>',
              attrs: { onclick: `removeSizeGuideRow(${rIdx})` },
            })}` : ''}
        </div>`).join('');
  
      window.lucide?.createIcons?.();
    }
  
    window.addSizeGuideRow = function () {
      formState.rows.push(formState.columns.map(() => ''));
      renderRowsEditor();
    };
  
    window.removeSizeGuideRow = function (idx) {
      if (formState.rows.length <= 1) return;
      formState.rows.splice(idx, 1);
      renderRowsEditor();
    };
  
    window.updateSizeGuideCell = function (rowIdx, colIdx, value) {
      formState.rows[rowIdx][colIdx] = value;
    };
  
    /* ── Open modal (create) ──────────────────────────────────── */
    window.showSizeGuideModal = function () {
      editingId = null;
      formState = { columns: [''], rows: [['']] };
      $('sizeGuideModalTitle').textContent = _t('sizeGuides.addTitle', 'افزودن راهنمای سایز');
      $('sizeGuideForm')?.reset();
      renderColumnsEditor();
      renderRowsEditor();
      showModal('sizeGuideModal');
    };
  
    /* ── Open modal (edit) ────────────────────────────────────── */
    window.editSizeGuide = async function (id) {
      try {
        const g = await API.sizeGuides.get(id);
        editingId = id;
        formState = {
          columns: g.columns?.length ? [...g.columns] : [''],
          rows: g.rows?.length ? g.rows.map(r => [...r]) : [['']],
        };
        $('sizeGuideModalTitle').textContent = _t('sizeGuides.editTitle', 'ویرایش راهنمای سایز');
        $('sizeGuideName').value = g.name || '';
        $('sizeGuideCategory').value = g.category || '';
        renderColumnsEditor();
        renderRowsEditor();
        showModal('sizeGuideModal');
      } catch (e) {
        toast(e.message, 'error');
      }
    };
  
    /* ── Submit (create/update) ──────────────────────────────────── */
    $('sizeGuideForm')?.addEventListener('submit', async function (e) {
      e.preventDefault();
  
      const payload = {
        name: getVal('sizeGuideName'),
        category: getVal('sizeGuideCategory') || null,
        columns: formState.columns.map(c => c.trim()).filter(Boolean),
        rows: formState.rows
          .filter(row => row.some(cell => (cell ?? '').toString().trim() !== ''))
          .map(row => row.map(cell => (cell ?? '').toString().trim())),
      };
  
      if (!payload.name || !payload.columns.length || !payload.rows.length) {
        toast(_t('sizeGuides.validationError', 'نام، ستون‌ها و حداقل یک ردیف الزامی است'), 'error');
        return;
      }
  
      try {
        setLoading(true);
        if (editingId) {
          await API.sizeGuides.update(editingId, payload);
          toast('راهنمای سایز بروزرسانی شد');
        } else {
          await API.sizeGuides.create(payload);
          toast('راهنمای سایز ایجاد شد');
        }
        setLoading(false);
        hideModal('sizeGuideModal');
        loadSizeGuides();
      } catch (e) {
        setLoading(false);
        toast(e.message, 'error');
      }
    });
  
  })();
