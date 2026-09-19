import { renderImageWithFallback } from '../../../../utils/imagePlaceholder.js';

const MediaTab = {
  render({ images = [], t = {} } = {}) {
    const grid = images.map((img) => MediaTab._imageCard(img, t)).join('');
    return `
      <div id="productTabMedia" class="space-y-4">
        <div id="productImagesGrid" class="grid grid-cols-3 sm:grid-cols-4 gap-3">${grid}</div>
        <input type="file" id="productImageInput" accept="image/*" multiple class="hidden">
        <button type="button" id="btnAddProductImage"
                class="bg-surface hover:bg-card text-muted px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition">
          <i data-lucide="image-plus" class="w-4 h-4"></i>
          ${t.addImage || 'افزودن تصویر'}
        </button>
      </div>`;
  },

  _imageCard(img, t) {
    const productId = img.product_id || '';
    return `
      <div class="relative aspect-square rounded-xl overflow-hidden bg-surface group" id="img-item-${img.id}">
        ${renderImageWithFallback({ src: img.image_url || img.url, alt: '', iconSize: 'w-8 h-8' })}
        ${img.is_main
          ? `<span class="absolute top-1 right-1 bg-accent text-white text-[10px] px-1.5 py-0.5 rounded-full z-10">${t.mainImage || 'اصلی'}</span>`
          : `<button type="button" data-action="set-main" data-image-id="${img.id}"
                     class="absolute top-1 right-1 hidden group-hover:flex items-center justify-center w-6 h-6 bg-amber-500 text-white rounded-full text-[10px] z-10">★</button>`}
        <button type="button" data-action="delete-image" data-image-id="${img.id}"
                class="absolute top-1 left-1 hidden group-hover:flex items-center justify-center w-6 h-6 bg-accent text-white rounded-full text-xs z-10">×</button>
      </div>`;
  },

  bind(container, callbacks = {}) {
    container.querySelector('#btnAddProductImage')?.addEventListener('click', () => {
      container.querySelector('#productImageInput')?.click();
    });

    container.querySelector('#productImageInput')?.addEventListener('change', (e) => {
      callbacks.onPreviewFiles?.(e.target);
    });

    container.querySelector('#productImagesGrid')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const imageId = Number(btn.dataset.imageId);
      if (btn.dataset.action === 'set-main') callbacks.onSetMain?.(imageId);
      if (btn.dataset.action === 'delete-image') callbacks.onDeleteImage?.(imageId);
    });
  },

  updateGrid(container, images, t) {
    const grid = container.querySelector('#productImagesGrid');
    if (grid) grid.innerHTML = images.map((img) => MediaTab._imageCard(img, t)).join('');
    if (window.lucide) lucide.createIcons();
  },
};

export default MediaTab;
