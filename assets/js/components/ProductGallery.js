import { storeConfig } from '../config/bootstrap.js';
import { renderImageWithFallback, renderImagePlaceholder } from '../utils/imagePlaceholder.js';
import { pickImageUrl } from '../utils/imageUrl.js';

const ProductGallery = {
  render({ images = [], name = '', refCode = '' }) {
    const t = storeConfig.texts.product;
    const validImages = images.filter((img) => img?.url);

    const thumbs = validImages.length
      ? validImages.map((img, i) => `
          <button type="button" data-thumb-index="${i}"
                  class="product-thumb relative w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border-2 shrink-0 transition-colors bg-surface
                         ${i === 0 ? 'border-body' : 'border-transparent hover:border-black/20'}">
            ${renderImageWithFallback({
              src: pickImageUrl(img, 'thumb'),
              alt: '',
              imgClass: 'w-full h-full object-cover',
              iconSize: 'w-5 h-5',
            })}
          </button>`).join('')
      : `<div class="w-20 h-20 md:w-24 md:h-24 rounded-lg bg-surface overflow-hidden">
           ${renderImagePlaceholder('w-6 h-6')}
         </div>`;

    return `
      <div class="product-gallery">
        <p class="text-[10px] text-muted tracking-widest mb-3 text-right" dir="ltr">${t.refPrefix} ${refCode}</p>
        <div class="flex flex-col gap-3 md:gap-4 items-start">
          <div class="flex-1 min-w-0">
            <div id="product-main-image-wrap" class="relative aspect-[3/4] bg-surface rounded-2xl overflow-hidden">
              ${validImages.length
                ? renderImageWithFallback({
                    src: pickImageUrl(validImages[0], 'large'),
                    alt: name,
                    imgClass: 'w-full h-full object-cover',
                    iconSize: 'w-16 h-16',
                  })
                : renderImagePlaceholder('w-16 h-16')}
            </div>
          </div>
          <div class="flex gap-2 shrink-0">${thumbs}</div>
        </div>
      </div>`;
  },

  bind(container, callbacks = {}) {
    const mainWrap = container.querySelector('#product-main-image-wrap');
    const mainImg = mainWrap?.querySelector('img');
    const images = (callbacks.images || []).filter((img) => img?.url);

    container.querySelectorAll('.product-thumb').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.thumbIndex, 10);
        const src = pickImageUrl(images[idx], 'large');
        if (!src || !mainImg) return;
        mainImg.src = src;
        mainImg.classList.remove('hidden');
        mainWrap.querySelector('.image-fallback')?.classList.add('hidden');
        container.querySelectorAll('.product-thumb').forEach((t) => {
          t.classList.toggle('border-body', t === btn);
          t.classList.toggle('border-transparent', t !== btn);
        });
        callbacks.onThumbChange?.(idx);
      });
    });
  },
};

export default ProductGallery;