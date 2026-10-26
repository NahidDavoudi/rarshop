import { storeConfig } from '../config/bootstrap.js';
import { pickBannerImage } from '../utils/imageUrl.js';

const PromoPosterSlider = {
  render(data = {}) {
    const cfg = storeConfig.promoSlider || {};
    const banners = data.banners || [];
    if (!banners.length) return '';

    const aspect = cfg.aspect || 'aspect-[21/9]';
    const slides = banners.map((b) => `
      <div class="swiper-slide">
        <div class="promo-poster-slide ${aspect} overflow-hidden rounded-2xl bg-surface border border-border">
          <img src="${pickBannerImage(b, 'medium')}" alt="${b.title || 'پوستر تبلیغاتی'}"
               class="w-full h-full object-cover" loading="lazy">
        </div>
      </div>`).join('');

    return `
      <section class="py-10 md:py-14 bg-body promo-poster-section">
        <div class="max-w-[1280px] mx-auto px-4 md:px-6">
          <div class="swiper promo-poster-swiper overflow-hidden">
            <div class="swiper-wrapper">${slides}</div>
            <div class="promo-poster-pagination swiper-pagination mt-5"></div>
          </div>
        </div>
      </section>`;
  },

  bind(container) {
    const root = container?.querySelector('.promo-poster-swiper');
    if (!root || typeof Swiper === 'undefined') return null;

    const cfg = storeConfig.promoSlider || {};
    const swiper = new Swiper(root, {
      slidesPerView: 1,
      spaceBetween: 0,
      loop: root.querySelectorAll('.swiper-slide').length > 1,
      speed: cfg.speed ?? 800,
      autoplay: {
        delay: cfg.autoplayMs ?? 5000,
        disableOnInteraction: false,
      },
      pagination: {
        el: root.querySelector('.promo-poster-pagination'),
        clickable: true,
      },
    });

    container._promoSwiper = swiper;
    return swiper;
  },

  destroy(container) {
    container?._promoSwiper?.destroy?.(true, true);
    container._promoSwiper = null;
  },
};

export default PromoPosterSlider;
