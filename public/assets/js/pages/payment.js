/**
 * pages/payment.js — صفحه پرداخت آنلاین
 */
import api from '../core/api.js';
import Router from '../core/router.js';
import DOM from '../utils/dom.js';

const { show, hide, text } = DOM;

let _paymentUrl = null;
let _orderData = null;

function ensureElement(id, tag = 'div') {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement(tag);
    el.id = id;
    const container = document.querySelector('.payment-container') || document.querySelector('main') || document.body;
    container.appendChild(el);
  }
  return el;
}

Router.onEnter('payment', function () {
  console.log('🟢 [payment] وارد شدیم');

  // مخفی کردن خطای قبلی
  const errEl = document.getElementById('payment-error');
  if (errEl) hide(errEl);

  let stored;
  try {
    stored = JSON.parse(sessionStorage.getItem('gb_checkout') || '{}');
    console.log('📦 [payment] داده sessionStorage:', stored);
  } catch (e) {
    console.error('❌ [payment] خطا در parse sessionStorage:', e);
    hide('payment-summary');
    hide('payment-action');
    const errEl = document.getElementById('payment-error') || ensureElement('payment-error', 'div');
    errEl.textContent = 'خطا: اطلاعات سفارش معتبر نیست. لطفاً مجدداً ثبت سفارش کنید.';
    errEl.className = 'text-accent text-sm mt-4 text-center';
    show(errEl);
    return;
  }

  try {
    if (stored.order) {
      _orderData = stored.order;
      _paymentUrl = stored.payment_url || stored.order.payment_url || null;
    } else {
      _orderData = stored;
      _paymentUrl = stored.payment_url || null;
    }

    console.log('📋 [payment] _orderData:', _orderData);
    console.log('🔗 [payment] _paymentUrl:', _paymentUrl);

    if (!_orderData || !_orderData.id) {
      throw new Error('اطلاعات سفارش یافت نشد');
    }
  } catch (e) {
    console.error('❌ [payment] خطا در پردازش داده:', e);
    hide('payment-summary');
    hide('payment-action');
    const errEl = document.getElementById('payment-error') || ensureElement('payment-error', 'div');
    errEl.textContent = 'خطا: اطلاعات سفارش معتبر نیست. لطفاً مجدداً ثبت سفارش کنید.';
    errEl.className = 'text-accent text-sm mt-4 text-center';
    show(errEl);
    return;
  }

  // --- پر کردن اطلاعات سفارش ---
  try {
    const orderNumberEl = document.getElementById('payment-order-number');
    if (orderNumberEl) {
      text(orderNumberEl.id, _orderData.order_number || '-');
      console.log('✅ شماره سفارش:', _orderData.order_number);
    } else {
      console.warn('⚠️ عنصر payment-order-number یافت نشد');
    }

    const totalEl = document.getElementById('payment-total-amount');
    if (totalEl) {
      const formatted = _orderData.total_amount ? api.utils.formatPrice(_orderData.total_amount) : '—';
      text(totalEl.id, formatted);
      console.log('✅ مبلغ:', formatted);
    } else {
      console.warn('⚠️ عنصر payment-total-amount یافت نشد');
    }

    const nameEl = document.getElementById('payment-customer-name');
    if (nameEl) {
      text(nameEl.id, _orderData.customer_name || '-');
      console.log('✅ نام:', _orderData.customer_name);
    } else {
      console.warn('⚠️ عنصر payment-customer-name یافت نشد');
    }

    const addressEl = document.getElementById('payment-shipping-address');
    if (addressEl) {
      text(addressEl.id, _orderData.shipping_address || '-');
      console.log('✅ آدرس:', _orderData.shipping_address);
    } else {
      console.warn('⚠️ عنصر payment-shipping-address یافت نشد');
    }
  } catch (e) {
    console.error('❌ [payment] خطا در پر کردن اطلاعات:', e);
  }

  // --- نمایش بخش‌های اصلی (با تاخیر کوتاه) ---
  setTimeout(() => {
    console.log('🔄 نمایش payment-summary و payment-action');
    show('payment-summary');
    show('payment-action');
    
    // اطمینان از حذف هر گونه display:none (فقط در صورت نیاز)
    const summary = document.getElementById('payment-summary');
    const action = document.getElementById('payment-action');
    if (summary) summary.style.display = '';
    if (action) action.style.display = '';
  }, 100);

  // --- مدیریت دکمه پرداخت ---
  try {
    const btnContainer = document.getElementById('payment-btn-container') || ensureElement('payment-btn-container', 'div');
    let btn = document.getElementById('pay-online-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'pay-online-btn';
      btn.className = 'w-full py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent-hover transition-all disabled:opacity-60 disabled:cursor-not-allowed';
      btnContainer.appendChild(btn);
    }

    const msgEl = document.getElementById('payment-online-unavailable') || ensureElement('payment-online-unavailable', 'div');
    msgEl.className = 'hidden text-sm text-muted text-center';

    if (_paymentUrl) {
      btn.disabled = false;
      btn.textContent = 'پرداخت آنلاین';
      hide(msgEl);
      console.log('✅ دکمه فعال');
    } else {
      btn.disabled = true;
      btn.textContent = 'پرداخت در محل';
      msgEl.textContent = 'روش پرداخت شما نیازی به پرداخت آنلاین ندارد. سفارش ثبت شده است.';
      show(msgEl);
      console.log('ℹ️ دکمه غیرفعال (پرداخت در محل)');
    }

    const errEl2 = document.getElementById('payment-error');
    if (errEl2) hide(errEl2);
  } catch (e) {
    console.error('❌ [payment] خطا در مدیریت دکمه:', e);
  }
});

// رویداد کلیک دکمه پرداخت
document.addEventListener('click', function (e) {
  const btn = e.target.closest('#pay-online-btn');
  if (!btn) return;
  e.preventDefault();
  if (!_paymentUrl) {
    api.utils.toast('آدرس پرداخت در دسترس نیست.', 'error');
    return;
  }
  window.location.href = _paymentUrl;
});