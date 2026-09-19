import { storeConfig } from '../config/bootstrap.js';
import RelatedProductCard from './RelatedProductCard.js';

const CompleteStyleSection = {
  render({ products = [], viewAllHref = '#/shop' } = {}) {
    const t = storeConfig.texts.product;
    if (!products.length) return '';

    const cards = products.map((p) => RelatedProductCard.render(p)).join('');

    return `
      <section class="border-t border-black/10 pt-12 md:pt-16 mt-12 md:mt-16">
        <div class="flex items-center justify-between mb-8 md:mb-10">
          <a href="${viewAllHref}" data-link class="text-sm text-muted hover:text-body transition-colors flex items-center gap-1">
            <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
            <span>${t.viewAll}</span>
          </a>
          <h2 class="text-xl md:text-2xl font-bold text-body">${t.completeStyle}</h2>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">${cards}</div>
      </section>`;
  },

  bind(container) {
    /* router handles links */
  },
};

export default CompleteStyleSection;
