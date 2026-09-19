import { storeConfig } from '../config/bootstrap.js';
import { renderImageWithFallback, renderImagePlaceholder } from '../utils/imagePlaceholder.js';
import { escapeHtml } from '../utils/htmlEscape.js';
import { pickCategoryImage } from '../utils/imageUrl.js';
import DOM from '../utils/dom.js';

const CategoryCard = {
  render(c) {
    const ui = storeConfig.ui;
    const slug = c.slug || c.name;
    const name = escapeHtml(c.name);
    const img = pickCategoryImage(c, 'medium');

    return `
      <a href="${DOM.hashHref('shop', { category: slug })}" data-link
         class="relative ${ui.cardRadius} overflow-hidden group block" style="height:180px">
        <div class="absolute inset-0 bg-surface relative overflow-hidden">
          ${renderImageWithFallback({
            src: img,
            alt: c.name,
            imgClass: 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-700',
            iconSize: 'w-12 h-12',
          })}
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
        <div class="absolute bottom-0 left-0 right-0 p-4">
          <h3 class="text-base font-bold text-right text-white">${name}</h3>
          ${c.product_count ? `<p class="text-accent/80 text-xs text-right mt-0.5">${c.product_count} محصول</p>` : ''}
        </div>
      </a>`;
  },

  bind() { /* links handled by router */ },
};

export default CategoryCard;
