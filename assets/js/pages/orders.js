/**
 * pages/orders.js
 */
import api from '../core/api.js';
import Router from '../core/router.js';
import OrderRow from '../components/OrderRow.js';
import OrderDetail from '../components/OrderDetail.js';
import Pagination from '../components/Pagination.js';
import DOM from '../utils/dom.js';

const { show, hide, text } = DOM;

const ORDERS_PER_PAGE = 8;
let _allOrders = [];
let _ordersPage = 1;
let _modalReady = false;

function _ensureModal() {
  if (_modalReady || document.getElementById('orderDetailModal')) {
    _modalReady = true;
    return;
  }

  document.body.insertAdjacentHTML('beforeend', `
    <div id="orderDetailModal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        <div class="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h3 class="text-lg font-bold text-body">جزئیات سفارش</h3>
          <button type="button" id="orderDetailClose" class="text-muted hover:text-body transition-colors p-1">✕</button>
        </div>
        <div id="orderDetailBody" class="px-5 py-4 overflow-y-auto flex-1"></div>
      </div>
    </div>`);

  document.getElementById('orderDetailClose')?.addEventListener('click', _closeModal);
  document.getElementById('orderDetailModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'orderDetailModal') _closeModal();
  });

  _modalReady = true;
}

function _closeModal() {
  hide('orderDetailModal');
}

async function _showOrderDetail(orderId) {
  _ensureModal();
  const body = document.getElementById('orderDetailBody');
  if (body) body.innerHTML = '<p class="text-center text-muted py-8">در حال بارگذاری...</p>';
  show('orderDetailModal');

  try {
    const order = await api.orders.get(orderId);
    if (body) body.innerHTML = OrderDetail.render(order);
  } catch (e) {
    if (body) body.innerHTML = `<p class="text-center text-red-500 py-8">${e.message}</p>`;
  }
}

function _renderOrdersTable() {
  const start = (_ordersPage - 1) * ORDERS_PER_PAGE;
  const page = _allOrders.slice(start, start + ORDERS_PER_PAGE);

  const tbody = document.getElementById('orders-table');
  if (!tbody) return;

  tbody.innerHTML = page.map((o) => OrderRow.render(o)).join('');
  OrderRow.bind(tbody, { onViewDetail: _showOrderDetail });

  const total = _allOrders.length;
  const pages = Math.ceil(total / ORDERS_PER_PAGE);
  const pag = Pagination.render({ page: _ordersPage, totalPages: pages, total, perPage: ORDERS_PER_PAGE });

  const infoEl = document.getElementById('pagination-info');
  if (infoEl && pag) infoEl.textContent = pag.info;

  const navEl = document.getElementById('pagination-nav');
  if (navEl && pag) {
    navEl.innerHTML = pag.nav;
    Pagination.bind(navEl, {
      onPageChange: (p) => {
        _ordersPage = Math.max(1, Math.min(p, pages));
        _renderOrdersTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    });
  }
}

Router.onEnter('orders', async function () {
  _ordersPage = 1;
  show('orders-loading');
  hide('need-login');
  hide('empty-orders');
  hide('orders-content');

  if (!api.auth.isLoggedIn()) {
    hide('orders-loading');
    show('need-login');
    return;
  }

  try {
    const data = await api.orders.list();
    hide('orders-loading');
    const orders = Array.isArray(data) ? data : (data.data || data.orders || []);

    if (!orders.length) { show('empty-orders'); return; }

    _allOrders = orders;
    show('orders-content');

    const active = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;
    const totalAmt = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    text('stat-active', active.toLocaleString('fa-IR'));
    text('stat-total', orders.length.toLocaleString('fa-IR'));
    text('stat-amount', totalAmt.toLocaleString('fa-IR') + ' تومان');

    _renderOrdersTable();
  } catch (e) {
    const el = document.getElementById('orders-loading');
    if (el) el.innerHTML = `<p class="text-red-500 text-center">${e.message}</p>`;
  }
});
