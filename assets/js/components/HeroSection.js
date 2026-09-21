import { storeConfig } from '../config/bootstrap.js';
import { pickBannerImage, pickVariantSet } from '../utils/imageUrl.js';
import Button from './Button.js';

function resolveSlideImages(data = null) {
  const { hero } = storeConfig;
  const fromApi = data?.slides || [];

  if (fromApi.length) {
    return fromApi.map((slide) => pickBannerImage(slide, 'large') || slide.image_url || slide.image || '').filter(Boolean);
  }

  const fromConfig = hero.fallbackImages || [];
  if (fromConfig.length) {
    return fromConfig.filter(Boolean);
  }

  const heroImage = pickVariantSet(hero.imageVariants, 'large') || hero.image;
  return heroImage ? [heroImage] : [];
}

const HeroSection = {
  render(data = null) {
    const { hero } = storeConfig;
    const images = resolveSlideImages(data).filter(Boolean);

    if (!images.length) return '';

    const slidesHtml = images.map((src) => `
      <div class="swiper-slide">
        <div class="relative w-full aspect-[4/5] sm:aspect-[16/9] md:aspect-[21/9] min-h-[320px] sm:min-h-[420px] md:min-h-[560px]">
          <img src="${src}" alt="${storeConfig.name}"
               class="w-full h-full object-cover">
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none"></div>
        </div>
      </div>`).join('');

    const overlayHtml = `
      <div class="absolute bottom-8 md:bottom-12 left-0 right-0 z-10 px-4 md:px-6 pointer-events-none">
        <div class="max-w-[1280px] mx-auto flex flex-col md:flex-row items-stretch md:items-end justify-between gap-6">
          <div class="text-right min-w-0">
            <h1 class="font-display text-3xl sm:text-4xl md:text-6xl text-white mb-2 leading-none drop-shadow-lg" dir="ltr">${hero.title}</h1>
            ${hero.subtitle ? `<p class="text-white/75 text-sm md:text-base max-w-sm">${hero.subtitle}</p>` : ''}
          </div>
          <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pointer-events-auto">
            ${Button.render({ variant: 'aluminum', label: hero.ctaPrimary, href: '#/shop', size: 'lg', className: 'w-full sm:w-auto justify-center' })}
            ${Button.render({ variant: 'glass', label: hero.ctaSecondary, href: '#/categories', size: 'lg', className: 'w-full sm:w-auto justify-center text-white !border-white/30' })}
          </div>
        </div>
      </div>`;

    return `
      <section class="hero-fullbleed hero-slider relative w-full overflow-hidden bg-body">
        <div class="swiper hero-swiper relative">
          <div class="swiper-wrapper">${slidesHtml}</div>
          ${images.length > 1 ? `
            <div class="swiper-button-prev hero-swiper-prev"></div>
            <div class="swiper-button-next hero-swiper-next"></div>
            <div class="swiper-pagination hero-swiper-pagination"></div>
          ` : ''}
          ${overlayHtml}
        </div>
      </section>`;
  },

  bind(container) {
    const root = container?.querySelector('.hero-swiper');
    if (!root || typeof Swiper === 'undefined') return null;

    const slideCount = root.querySelectorAll('.swiper-slide').length;
    if (slideCount <= 1) return null;

    const { hero } = storeConfig;
    const swiper = new Swiper(root, {
      slidesPerView: 1,
      spaceBetween: 0,
      loop: true,
      speed: hero.speed ?? 800,
      autoplay: {
        delay: hero.autoplayMs ?? 8000,
        disableOnInteraction: false,
      },
      navigation: {
        prevEl: container.querySelector('.hero-swiper-prev'),
        nextEl: container.querySelector('.hero-swiper-next'),
      },
      pagination: {
        el: container.querySelector('.hero-swiper-pagination'),
        clickable: true,
      },
    });

    container._heroSwiper = swiper;
    return swiper;
  },

  destroy(container) {
    container?._heroSwiper?.destroy?.(true, true);
    container._heroSwiper = null;
  },
};

export default HeroSection;
