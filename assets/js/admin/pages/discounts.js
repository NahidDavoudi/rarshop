/**
 * admin/pages/discounts.js
 * مدیریت کدهای تخفیف: لیست و ایجاد
 * وابستگی: helpers.js, api.js
 */

;(function () {
  'use strict';

  function _t(path, fallback) {
    return window.getAdminText?.(path, fallback) ?? fallback;
  }

  /* ── Render list ───────────────────────────────────────────── */
  function renderDiscounts(list) {
    const el = $('discountsContainer');
    if (!el) return;

    if (!list?.length) {
      el.innerHTML = `<p class="text-dim col-span-full text-center py-8">${_t('discounts.empty', 'کد تخفیفی ثبت نشده')}</p>`;
      return;
    }

    el.innerHTML = list.map(d => {
      const now     = new Date();
      const validTo = d.valid_to ? new Date(d.valid_to) : null;
      const expired = validTo && validTo < now;
      const active  = d.is_active && !expired;

      const statusBadge = active
        ? 'bg-green-100 text-green-800 border border-green-200'
        : expired
          ? 'bg-card text-muted border border-border'
          : 'bg-surface text-dim border border-border';

      const statusLabel = active
        ? _t('discounts.active', 'فعال')
        : (expired ? _t('discounts.expired', 'منقضی') : _t('discounts.inactive', 'غیرفعال'));

      const valueLabel = d.type === 'percent'
        ? `${d.value}${_t('discounts.percentOff', '٪ تخفیف')}`
        : `${Number(d.value).toLocaleString('fa-IR')} ${_t('discounts.fixedOff', 'تومان تخفیف')}`;

      return `
        <div class="admin-card rounded-2xl p-5 flex flex-col gap-4 hover:border-accent/30 transition-colors relative overflow-hidden">
          <div class="absolute top-0 left-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none"></div>
          <div class="flex items-center justify-between gap-3">
            <span class="font-mono font-black text-body tracking-widest text-base bg-card
                         border border-border px-3 py-1.5 rounded-lg select-all">
              ${d.code}
            </span>
            <span class="text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap ${statusBadge}">
              ${statusLabel}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--color-accent)" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M7 7h.01M17 17h.01M7 17h.01M17 7h.01
                   M3 12a9 9 0 1118 0 9 9 0 01-18 0z"/>
            </svg>
            <span class="text-body font-bold text-sm">${valueLabel}</span>
          </div>
          <div class="flex gap-4 text-xs text-dim">
            ${d.valid_from ? `<span>از ${new Date(d.valid_from).toLocaleDateString('fa-IR')}</span>` : ''}
            ${d.valid_to   ? `<span>تا ${new Date(d.valid_to).toLocaleDateString('fa-IR')}</span>`   : `<span>${_t('discounts.noExpiry', 'بدون تاریخ انقضا')}</span>`}
          </div>
          <div class="flex gap-2 pt-1 border-t border-border">
            ${active ? `
              <button onclick="deactivateDiscount(${d.id})"
                class="flex-1 py-2 text-xs font-bold bg-surface hover:bg-card
                       text-muted hover:text-body border border-border
                       rounded-lg transition-all">
                ${_t('discounts.deactivate', 'غیرفعال کردن')}
              </button>` : ''}
            <button onclick="deleteDiscount(${d.id})"
              class="flex-1 py-2 text-xs font-bold bg-accent/10 hover:bg-accent/20
                     text-accent border border-accent/30 hover:border-accent/60
                     rounded-lg transition-all">
              ${_t('discounts.delete', 'حذف')}
            </button>
          </div>
        </div>`;
    }).join('');
  }

  /* ── Public loader ─────────────────────────────────────────── */
  window.loadDiscounts = async function () {
    const el = $('discountsContainer');
    if (!el) return;

    el.innerHTML = `<p class="text-dim col-span-full text-center py-8 animate-pulse">${_t('discounts.loading', 'در حال بارگذاری...')}</p>`;

    try {
      const list = await API.discounts.list();
      renderDiscounts(Array.isArray(list) ? list : (list?.data || []));
    } catch (e) {
      el.innerHTML = `<p class="text-accent col-span-full text-center py-8">${e.message}</p>`;
    }
  };

  /* ── Deactivate ─────────────────────────────────────────────── */
  window.deactivateDiscount = async function (id) {
    try {
      await API.discounts.deactivate(id);
      toast('کد تخفیف غیرفعال شد');
      loadDiscounts();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  /* ── Delete ─────────────────────────────────────────────────── */
  window.deleteDiscount = async function (id) {
    if (!confirm('حذف شود؟')) return;
    try {
      await API.discounts.delete(id);
      toast('کد تخفیف حذف شد');
      loadDiscounts();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  /* ── Open modal ────────────────────────────────────────────── */
  window.showDiscountModal = () => showModal('discountModal');

  /* ── Create discount ───────────────────────────────────────── */
  $('discountForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const payload = {
      code:       getVal('discountCode'),
      type:       getVal('discountType'),
      value:      Number(getVal('discountValue')),
      valid_from: getVal('discountValidFrom'),
      valid_to:   getVal('discountValidTo'),
    };
    if (!payload.code || !payload.value) {
      toast(_t('common.codeValueRequired', 'کد و مقدار الزامی‌اند'), 'error');
      return;
    }
    try {
      setLoading(true);
      await API.discounts.create(payload);
      setLoading(false);
      toast('کد تخفیف ایجاد شد');
      hideModal('discountModal');
      $('discountForm')?.reset();
      loadDiscounts();
    } catch (e) {
      setLoading(false);
      toast(e.message, 'error');
    }
  });

})();
