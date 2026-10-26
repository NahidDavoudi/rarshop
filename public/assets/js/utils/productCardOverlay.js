import { escapeHtml } from './htmlEscape.js';

/**
 * Bottom gradient overlay with product info (pure HTML helper)
 */
export function renderProductCardOverlay({
  name = '',
  category = '',
  price = '',
  addBtnHtml = '',
  lowStockText = '',
} = {}) {
  const categoryEl = category
    ? `<p class="text-[10px] text-white/65 mb-1 tracking-wide uppercase">${escapeHtml(category)}</p>`
    : '';
  const lowStockEl = lowStockText
    ? `<p class="text-[10px] text-amber-200/90 font-medium mt-1">${escapeHtml(lowStockText)}</p>`
    : '';

  return `
    <div class="product-card__gradient absolute inset-x-0 bottom-0 z-[5] pt-14 pb-3 px-3 md:px-4 pointer-events-none">
      <div class="pointer-events-auto">
        ${categoryEl}
        <h3 class="text-sm font-semibold text-white mb-2 line-clamp-2 leading-snug">${escapeHtml(name)}</h3>
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-bold text-white">${price}</span>
          ${addBtnHtml}
        </div>
        ${lowStockEl}
      </div>
    </div>`;
}
