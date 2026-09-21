import { storeConfig } from '../config/bootstrap.js';
import { formatPrice } from '../utils/priceFormatter.js';
import { renderImageWithFallback } from '../utils/imagePlaceholder.js';
import { pickProductImage } from '../utils/imageUrl.js';
import { renderProductCardOverlay } from '../utils/productCardOverlay.js';
import { isLowStock, formatLowStockMessage } from '../utils/stockHint.js';
import DOM from '../utils/dom.js';
import Button from './Button.js';

const ShopProductCard = {
  render(p) {
    const ui = storeConfig.ui;
    const img = pickProductImage(p, 'medium');
    const price = formatPrice(p.price);
    const href = DOM.hashHref('product', { id: p.id });

    const lowStockText = isLowStock(p.stock) ? formatLowStockMessage(p.stock) : '';
    const outOfStock = p.stock === 0
      ? `<div class="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-10"><span class="text-sm text-white/80 font-medium">ناموجود</span></div>`
      : '';

    const addBtn = Button.render({
      variant: 'aluminum',
      size: 'icon',
      label: '+',
      className: 'add-to-cart-quick shrink-0 !shadow-none',
      attrs: { 'data-product-id': p.id, title: 'افزودن به سبد' },
      disabled: p.stock === 0,
    });

    return `
      <a href="${href}" data-link class="group block iris-card ${ui.cardBase} ${ui.cardRadius} ${ui.cardHover}">
        <div class="relative ${ui.productCardAspect} overflow-hidden bg-surface">
          ${outOfStock}
          ${renderImageWithFallback({
            src: img,
            alt: p.name,
            imgClass: 'w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500',
          })}
          ${renderProductCardOverlay({
            name: p.name,
            category: p.category_name || '',
            price,
            addBtnHtml: addBtn,
            lowStockText,
          })}
        </div>
      </a>`;
  },

  bind() { /* add-to-cart handled globally in app.js */ },
};

export default ShopProductCard;
