/**
 * components/OrderDetail.js — نمایش جزئیات سفارش (ادمین / کاربر)
 */
import { escapeHtml, escapeAttr } from '../utils/htmlEscape.js';

const PAYMENT_LABELS = {
  cash: 'کارت به کارت',
  card: 'کارت بانکی',
  transfer: 'انتقال بانکی',
};

function _formatPrice(amount) {
  return `${Number(amount || 0).toLocaleString('fa-IR')} تومان`;
}

function _formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fa-IR');
}

function _statusLabel(status) {
  const map = window.STATUS_MAP || window.StoreConfig?.texts?.admin?.orderStatuses || {};
  return map[status]?.label || status;
}

function _renderItems(items) {
  if (!items?.length) {
    return '<p class="text-sm text-muted text-center py-4">آیتمی ثبت نشده</p>';
  }

  return `
    <div class="overflow-x-auto rounded-xl border border-border">
      <table class="w-full text-sm">
        <thead class="bg-surface/60">
          <tr>
            <th class="text-right px-3 py-2 font-medium text-muted">محصول</th>
            <th class="text-right px-3 py-2 font-medium text-muted">تعداد</th>
            <th class="text-right px-3 py-2 font-medium text-muted">قیمت</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          ${items.map((item) => {
            const title = item.product_name || item.name || `محصول #${item.product_id}`;
            const variant = item.variant_label
              || (item.variant_title && item.variant_title !== 'Default' ? item.variant_title : '');
            return `
              <tr>
                <td class="px-3 py-2.5">
                  <div class="flex items-center gap-2 flex-row-reverse justify-end">
                    ${item.product_image ? `<img src="${escapeAttr(item.product_image)}" alt="" class="w-10 h-10 rounded-lg object-cover shrink-0" onerror="this.remove()">` : ''}
                    <div class="text-right min-w-0">
                      <p class="font-medium text-body truncate">${escapeHtml(title)}</p>
                      ${variant ? `<p class="text-xs text-muted">${escapeHtml(variant)}</p>` : ''}
                      ${item.sku ? `<p class="text-xs text-muted font-mono">${escapeHtml(item.sku)}</p>` : ''}
                    </div>
                  </div>
                </td>
                <td class="px-3 py-2.5 text-body">${Number(item.quantity || 0).toLocaleString('fa-IR')}</td>
                <td class="px-3 py-2.5 text-body whitespace-nowrap">${_formatPrice(item.price)}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

const OrderDetail = {
  render(order, { showAdminActions = false } = {}) {
    if (!order) return '';

    const receiptUrl = order.receipt?.file_path || order.receipt_path || '';
    const paymentLabel = PAYMENT_LABELS[order.payment_method] || order.payment_method || '—';
    const cancelBlock = order.status === 'cancelled' && order.cancel_reason
      ? `<div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right">
           <p class="text-xs font-bold text-red-700 mb-1">دلیل لغو سفارش</p>
           <p class="text-sm text-red-800 leading-relaxed">${escapeHtml(order.cancel_reason)}</p>
         </div>`
      : '';

    const receiptBlock = receiptUrl
      ? `<div class="rounded-xl border border-border bg-surface/40 px-4 py-3 flex items-center justify-between gap-3 flex-row-reverse">
           <div class="text-right">
             <p class="text-xs text-muted mb-1">رسید پرداخت</p>
             <p class="text-sm text-body">${escapeHtml(order.receipt?.file_name || 'رسید')}</p>
           </div>
           <a href="${escapeAttr(receiptUrl)}" target="_blank" rel="noopener"
              class="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors shrink-0">
             مشاهده رسید
           </a>
         </div>`
      : '<p class="text-sm text-muted text-right">رسیدی ثبت نشده</p>';

    const adminActions = showAdminActions && order.status === 'pending' && receiptUrl
      ? `<div class="flex flex-wrap gap-2 justify-end pt-2 border-t border-border">
           <button type="button" data-action="reject-receipt"
                   class="px-4 py-2 rounded-xl text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
             رد رسید
           </button>
           <button type="button" data-action="approve-receipt"
                   class="px-4 py-2 rounded-xl text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors">
             تایید رسید
           </button>
         </div>`
      : '';

    return `
      <div class="space-y-5 text-right" data-order-id="${order.id}">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs text-muted mb-1">شماره سفارش</p>
            <p class="text-lg font-bold font-mono text-body">#${escapeHtml(order.order_number)}</p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-medium bg-surface border border-border text-body">
            ${_statusLabel(order.status)}
          </span>
        </div>

        ${cancelBlock}

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="rounded-xl border border-border p-4">
            <p class="text-xs text-muted mb-2">مشتری</p>
            <p class="text-sm font-medium text-body">${escapeHtml(order.customer_name || '—')}</p>
            <p class="text-sm text-muted mt-1" dir="ltr">${escapeHtml(order.customer_phone || '')}</p>
            ${order.customer_email ? `<p class="text-sm text-muted mt-1">${escapeHtml(order.customer_email)}</p>` : ''}
          </div>
          <div class="rounded-xl border border-border p-4">
            <p class="text-xs text-muted mb-2">اطلاعات پرداخت</p>
            <p class="text-sm text-body">${escapeHtml(paymentLabel)}</p>
            <p class="text-lg font-bold text-body mt-2">${_formatPrice(order.total_amount)}</p>
            <p class="text-xs text-muted mt-2">${_formatDate(order.created_at)}</p>
          </div>
        </div>

        <div class="rounded-xl border border-border p-4">
          <p class="text-xs text-muted mb-2">آدرس ارسال</p>
          <p class="text-sm text-body leading-relaxed">${escapeHtml(order.shipping_address || '—')}</p>
        </div>

        <div>
          <p class="text-sm font-bold text-body mb-3">اقلام سفارش</p>
          ${_renderItems(order.items)}
        </div>

        ${receiptBlock}
        ${adminActions}
      </div>`;
  },

  bind(container, callbacks = {}) {
    if (!container) return;

    container.querySelector('[data-action="approve-receipt"]')?.addEventListener('click', () => {
      callbacks.onApprove?.();
    });

    container.querySelector('[data-action="reject-receipt"]')?.addEventListener('click', () => {
      callbacks.onReject?.();
    });
  },
};

export default OrderDetail;
