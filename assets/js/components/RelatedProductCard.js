import { storeConfig } from '../config/bootstrap.js';
import { formatPrice } from '../utils/priceFormatter.js';
import { renderImageWithFallback } from '../utils/imagePlaceholder.js';
import { pickProductImage } from '../utils/imageUrl.js';
import DOM from '../utils/dom.js';
import Button from './Button.js';

const RelatedProductCard = {
  render(p) {
    const ui = storeConfig.ui;
    const img = pickProductImage(p, 'thumb');
    const price = formatPrice(p.price);
    const href = DOM.hashHref('product', { id: p.id });

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
        <div class="relative aspect-square overflow-hidden bg-surface">
          ${renderImageWithFallback({
            src: img,
            alt: p.name,
            imgClass: 'w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500',
            iconSize: 'w-8 h-8',
          })}
          ${renderProductCardOverlay({
            name: p.name,
            category: p.category_name || '',
            price,
            addBtnHtml: addBtn,
          })}
        </div>
      </a>`;
  },

  bind() { /* add-to-cart handled globally in app.js */ },
};

export default RelatedProductCard;
