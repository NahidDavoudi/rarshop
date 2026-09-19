import { escapeAttr, escapeHtml } from './htmlEscape.js';

export function renderImagePlaceholder(iconSize = 'w-10 h-10') {
  return `<div class="image-fallback w-full h-full flex items-center justify-center text-muted/50 bg-surface">
    <i data-lucide="image" class="${iconSize}" aria-hidden="true"></i>
  </div>`;
}

export function renderImageWithFallback({
  src = '',
  alt = '',
  imgClass = 'w-full h-full object-cover',
  iconSize = 'w-10 h-10',
}) {
  const safeAlt = escapeAttr(alt);
  const safeSrc = escapeAttr(src);
  if (!src) return renderImagePlaceholder(iconSize);

  return `<img src="${safeSrc}" alt="${safeAlt}" class="${imgClass}"
    onerror="this.classList.add('hidden');this.parentElement.querySelector('.image-fallback')?.classList.remove('hidden')">
  <div class="image-fallback hidden absolute inset-0 flex items-center justify-center text-muted/40 bg-surface">
    <i data-lucide="image" class="${iconSize}" aria-hidden="true"></i>
  </div>`;
}
