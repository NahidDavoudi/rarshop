import api from '../core/api.js';
import Router from '../core/router.js';
import DOM from '../utils/dom.js';

const { show, hide, text } = DOM;

Router.onEnter('payment-result', function () {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order_id');
  const status = params.get('status');

  const container = document.getElementById('payment-result-container');
  if (!container) return;

  if (status === 'success') {
    container.innerHTML = `
      <div class="text-center py-12">
        <h2 class="text-green-600 text-xl">پرداخت با موفقیت انجام شد</h2>
        <p>شماره سفارش: ${orderId}</p>
        <a href="/orders" class="btn">مشاهده سفارشات</a>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="text-center py-12">
        <h2 class="text-red-600 text-xl">پرداخت ناموفق بود</h2>
        <p>شماره سفارش: ${orderId}</p>
        <a href="/checkout" class="btn">تلاش مجدد</a>
      </div>
    `;
  }
});