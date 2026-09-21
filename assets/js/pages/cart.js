/**
 * pages/cart.js
 */
import api from '../core/api.js';
import Router from '../core/router.js';
import { storeConfig } from '../config/bootstrap.js';
import { renderImageWithFallback } from '../utils/imagePlaceholder.js';
import { escapeHtml } from '../utils/htmlEscape.js';
import { getCartDisplayName, formatCartVariantLine } from '../utils/productVariants.js';
import DOM from '../utils/dom.js';

const { show, hide, text, hashHref, reclone } = DOM;

let _cartData = null;
let _cartDiscount = null;

function _shipping(total) {
  return total >= storeConfig.shipping.freeFrom ? 0 : storeConfig.shipping.standardCost;
}

function _renderCart(data) {
  const shipping = _shipping(data.total);
  const discAmt = _cartDiscount
    ? (_cartDiscount.type === 'percent'
      ? Math.round(data.total * _cartDiscount.value / 100)
      : _cartDiscount.value)
    : 0;
  const realTotal = data.total + shipping - discAmt;

  const cartItemsEl = document.getElementById('cart-items');
  if (cartItemsEl) {
    cartItemsEl.innerHTML = data.items.map((item) => {
      const itemName = escapeHtml(getCartDisplayName(item));
      const variantLine = formatCartVariantLine(item);
      const variantHtml = variantLine
        ? `<p class="text-xs text-muted mt-0.5">${escapeHtml(variantLine)}</p>`
        : '';
      return `
      <div class="bg-card border border-border rounded-xl p-4 flex gap-4 items-center" id="ci-${item.variant_id || item.product_id}">
        <div class="w-20 h-20 rounded-lg shrink-0 overflow-hidden bg-[#f5f5f7] relative">
          ${renderImageWithFallback({ src: item.image || '', alt: item.name, iconSize: 'w-8 h-8' })}
        </div>
        <div class="flex-1 text-right min-w-0">
          <h3 class="font-medium mb-1 truncate">
            <a href="${hashHref('product', { id: item.product_id })}" data-link class="hover:text-accent">${itemName}</a>
          </h3>
          ${variantHtml}
          <p class="text-accent font-bold mt-1">${api.utils.formatPrice(item.price)}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button data-remove="${item.product_id}" data-variant="${item.variant_id || ''}" class="w-8 h-8 rounded border border-border text-muted hover:border-red-500 hover:text-red-400 transition-colors text-sm">✕</button>
          <input type="number" value="${item.qty}" min="1" max="10"
                 data-update="${item.product_id}" data-variant="${item.variant_id || ''}"
                 class="w-14 bg-body border border-border rounded px-2 py-1 text-center text-sm">
        </div>
      </div>`;
    }).join('');

    cartItemsEl.querySelectorAll('[data-remove]').forEach((btn) =>
      btn.addEventListener('click', () => _cartRemove(btn.dataset.remove, btn.dataset.variant || null)));
    cartItemsEl.querySelectorAll('[data-update]').forEach((inp) =>
      inp.addEventListener('change', () => _cartUpdate(inp.dataset.update, inp.value, inp.dataset.variant || null)));
  }

  const summaryEl = document.getElementById('summary-lines');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="flex justify-between text-muted text-sm"><span>${api.utils.formatPrice(data.total)}</span><span>جمع کالاها</span></div>
      ${discAmt > 0 ? `<div class="flex justify-between text-green-600 text-sm"><span>-${api.utils.formatPrice(discAmt)}</span><span>تخفیف</span></div>` : ''}
      <div class="flex justify-between text-muted text-sm"><span>${shipping === 0 ? 'رایگان' : api.utils.formatPrice(shipping)}</span><span>ارسال</span></div>`;
  }

  text('final-total', api.utils.formatPrice(realTotal));
}

async function _cartRemove(productId, variantId = null) {
  try {
    await api.cart.remove(productId, variantId ? Number(variantId) : null);
    await _loadCart();
    window.loadCartCount?.();
  } catch (e) { api.utils.toast(e.message, 'error'); }
}

async function _cartUpdate(productId, qty, variantId = null) {
  try {
    await api.cart.update(productId, parseInt(qty, 10), variantId ? Number(variantId) : null);
    await _loadCart();
    window.loadCartCount?.();
  } catch (e) { api.utils.toast(e.message, 'error'); }
}

async function _loadCart() {
  try {
    const data = _cartData = await api.cart.get();
    hide('cart-loading');
    if (!data.items?.length) {
      show('empty-cart');
      hide('cart-content');
      return;
    }
    hide('empty-cart');
    show('cart-content');
    _renderCart(data);
  } catch (e) {
    const el = document.getElementById('cart-loading');
    if (el) el.innerHTML = `<p class="text-accent text-center">${e.message}</p>`;
  }
}

Router.onEnter('cart', async function () {
  _cartDiscount = null;
  show('cart-loading');
  hide('empty-cart');
  hide('cart-content');
  await _loadCart();

  const newApplyBtn = reclone('apply-discount');
  if (newApplyBtn) {
    newApplyBtn.addEventListener('click', async () => {
      const code = document.getElementById('discount-input')?.value.trim();
      const msg = document.getElementById('discount-msg');
      if (!code) return;
      try {
        const res = await api.discounts.validate(code, _cartData?.total || 0);
        _cartDiscount = res?.discount || res;
        if (msg) {
          msg.textContent = '✓ کد تخفیف اعمال شد';
          msg.className = 'text-xs mt-2 text-right text-green-600';
          msg.classList.remove('hidden');
        }
        if (_cartData) _renderCart(_cartData);
      } catch {
        _cartDiscount = null;
        if (msg) {
          msg.textContent = '✕ کد تخفیف نامعتبر است';
          msg.className = 'text-xs mt-2 text-right text-red-500';
          msg.classList.remove('hidden');
        }
      }
    });
  }
});
