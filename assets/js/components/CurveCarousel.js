/**
 * CurveCarousel — 3D curved carousel (ported from Framer Curve Carousel)
 * https://framer.com/m/Curve-Carousel-gsnFiB.js@pd30LKe1hXXQtAS9SUu2
 */

const DEFAULTS = {
  radius: 1200,
  mobileRadius: 750,
  angleStep: 16,
  dragThreshold: 60,
  autoplay: true,
  autoplayMs: 3500,
  arrowSize: 48,
  arrowInset: 48,
  arrowGap: 12,
  sizeDecrease: 0.06,
  bottomFade: true,
  pauseOnHover: true,
  cardWidth: 300,
  cardHeight: 440,
  mobileCardWidth: 240,
  mobileCardHeight: 360,
  cardRadius: 16,
  transitionMs: 2400,
};

function mergeConfig(cfg = {}) {
  return { ...DEFAULTS, ...cfg };
}

function computeHeight(resolved) {
  const { cardHeight, radius, angleStep, arrowSize, arrowInset } = resolved;
  const maxVisibleAngle = angleStep * 2.5;
  const maxDrop = radius * (1 - Math.cos((maxVisibleAngle * Math.PI) / 180));
  return Math.max(
    cardHeight + 120,
    Math.round(cardHeight / 2 + maxDrop + arrowSize + arrowInset + 40)
  );
}

function resolveSizing(cfg) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  return {
    ...cfg,
    radius: isMobile ? (cfg.mobileRadius ?? cfg.radius * 0.65) : cfg.radius,
    cardWidth: isMobile ? (cfg.mobileCardWidth ?? cfg.cardWidth) : cfg.cardWidth,
    cardHeight: isMobile ? (cfg.mobileCardHeight ?? cfg.cardHeight) : cfg.cardHeight,
  };
}

const CurveCarousel = {
  render({ id = 'curve-carousel', background = 'transparent' } = {}) {
    return `
      <div class="curve-carousel" data-curve-id="${id}" style="background:${background}">
        <div class="curve-carousel__wrap">
          <div class="curve-carousel__stage" role="region" aria-label="کاروسل محصولات">
            <div class="curve-carousel__track"></div>
          </div>
          <div class="curve-carousel__arrows" dir="rtl">
            <button type="button" class="curve-carousel__arrow" data-curve-prev aria-label="قبلی">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
            <button type="button" class="curve-carousel__arrow" data-curve-next aria-label="بعدی">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="curve-carousel__fade" aria-hidden="true"></div>
      </div>`;
  },

  bind(root, { itemsHtml = [], config = {}, background = 'transparent' } = {}) {
    if (!root || !itemsHtml.length) return null;

    const cfg = mergeConfig(config);
    const total = itemsHtml.length;
    const renderCount = Math.max(total * 3, 9);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let activeIndex = 0;
    let isDragging = false;
    let startX = 0;
    let paused = false;
    let inView = true;
    let intervalId = null;

    const stage = root.querySelector('.curve-carousel__stage');
    const track = root.querySelector('.curve-carousel__track');
    const prevBtn = root.querySelector('[data-curve-prev]');
    const nextBtn = root.querySelector('[data-curve-next]');
    const fadeEl = root.querySelector('.curve-carousel__fade');

    root.style.background = background;
    if (fadeEl) fadeEl.style.background = background;
    fadeEl?.classList.toggle('hidden', !cfg.bottomFade);

    function clearAutoplay() {
      if (intervalId != null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    }

    function startAutoplay() {
      if (prefersReducedMotion || !cfg.autoplay || !inView || total <= 1) return;
      clearAutoplay();
      intervalId = window.setInterval(() => {
        activeIndex += 1;
        if (Math.abs(activeIndex) > 1e6) {
          activeIndex = ((activeIndex % total) + total) % total;
        }
        layoutCards();
      }, Math.max(300, cfg.autoplayMs));
    }

    function resetAutoplay() {
      clearAutoplay();
      startAutoplay();
    }

    function layoutCards() {
      const resolved = resolveSizing(cfg);
      const { radius, angleStep, sizeDecrease, cardWidth, cardHeight, cardRadius } = resolved;
      const height = computeHeight(resolved);

      const transitionMs = Math.max(200, resolved.transitionMs ?? 2400);

      root.style.setProperty('--curve-card-w', `${cardWidth}px`);
      root.style.setProperty('--curve-card-h', `${cardHeight}px`);
      root.style.setProperty('--curve-card-radius', `${cardRadius}px`);
      root.style.setProperty('--curve-arrow-size', `${resolved.arrowSize}px`);
      root.style.setProperty('--curve-arrow-inset', `${resolved.arrowInset}px`);
      root.style.setProperty('--curve-arrow-gap', `${resolved.arrowGap}px`);
      root.style.setProperty('--curve-transition-ms', `${transitionMs}ms`);
      root.style.height = `${height}px`;

      const wrap = root.querySelector('.curve-carousel__wrap');
      if (wrap) wrap.style.height = `${height}px`;
      if (stage) stage.style.height = `${height}px`;

      const baseIndex = activeIndex - total;

      for (let j = 0; j < renderCount; j += 1) {
        let card = track.children[j];
        if (!card) {
          card = document.createElement('div');
          card.className = 'curve-carousel__card';
          card.innerHTML = '<div class="curve-carousel__card-inner"></div>';
          track.appendChild(card);
        }

        const virtualIndex = baseIndex + j;
        const idx = ((virtualIndex % total) + total) % total;
        const diff = virtualIndex - activeIndex;
        const absDiff = Math.abs(diff);
        const isCenter = diff === 0;
        const angleRad = (-diff * angleStep * Math.PI) / 180;
        const translateX = radius * Math.sin(angleRad);
        const translateY = radius - radius * Math.cos(angleRad);
        const rotateZ = -diff * angleStep;
        const scale = 1 - absDiff * sizeDecrease;
        const zIndex = Math.max(1, 10 - absDiff);
        const opacity = isCenter ? 1 : absDiff >= 3 ? 0 : 1 - absDiff * 0.4;
        const filter = isCenter
          ? 'grayscale(0%) brightness(1.05)'
          : 'grayscale(100%) brightness(0.6)';

        card.style.transform = `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px)) rotate(${rotateZ}deg) scale(${scale})`;
        card.style.zIndex = String(zIndex);
        card.style.opacity = String(opacity);
        card.style.pointerEvents = isCenter ? 'auto' : 'none';
        card.setAttribute('aria-hidden', isCenter ? 'false' : 'true');

        const inner = card.querySelector('.curve-carousel__card-inner');
        inner.style.filter = filter;
        if (card.dataset.itemIdx !== String(idx)) {
          inner.innerHTML = itemsHtml[idx];
          card.dataset.itemIdx = String(idx);
        }
      }

      while (track.children.length > renderCount) {
        track.lastElementChild?.remove();
      }
    }

    function move(direction) {
      if (total <= 1) return;
      activeIndex += direction;
      if (Math.abs(activeIndex) > 1e6) {
        activeIndex = ((activeIndex % total) + total) % total;
      }
      layoutCards();
      resetAutoplay();
    }

    const onPointerDown = (e) => {
      if (total <= 1) return;
      stage.setPointerCapture?.(e.pointerId);
      startX = e.clientX;
      clearAutoplay();
      isDragging = true;
      stage.classList.add('is-dragging');
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const diffX = e.clientX - startX;
      if (Math.abs(diffX) > Math.max(10, cfg.dragThreshold)) {
        move(diffX > 0 ? -1 : 1);
        isDragging = false;
        stage.classList.remove('is-dragging');
      }
    };

    const endDrag = () => {
      if (isDragging) {
        isDragging = false;
        stage.classList.remove('is-dragging');
      }
      resetAutoplay();
    };

    const onResize = () => layoutCards();

    const onVisibility = () => {
      paused = document.hidden;
      if (paused) clearAutoplay();
      else startAutoplay();
    };

    const onMouseEnter = () => {
      if (cfg.pauseOnHover) clearAutoplay();
    };

    const onMouseLeave = () => {
      if (cfg.pauseOnHover && !paused) startAutoplay();
    };

    prevBtn?.addEventListener('click', () => move(-1));
    nextBtn?.addEventListener('click', () => move(1));
    stage?.addEventListener('pointerdown', onPointerDown);
    stage?.addEventListener('pointermove', onPointerMove);
    stage?.addEventListener('pointerup', endDrag);
    stage?.addEventListener('pointercancel', endDrag);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    root.addEventListener('mouseenter', onMouseEnter);
    root.addEventListener('mouseleave', onMouseLeave);

    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting;
          if (inView) startAutoplay();
          else clearAutoplay();
        },
        { threshold: 0.2 }
      )
      : null;
    io?.observe(root);

    prevBtn.disabled = total <= 1;
    nextBtn.disabled = total <= 1;

    layoutCards();
    startAutoplay();

    const state = {
      io,
      onResize,
      onVisibility,
      onMouseEnter,
      onMouseLeave,
      onPointerDown,
      onPointerMove,
      endDrag,
      clearAutoplay,
    };
    root._curveState = state;
    return state;
  },

  destroy(root) {
    const state = root?._curveState;
    if (!state) return;

    state.clearAutoplay?.();
    state.io?.disconnect();
    window.removeEventListener('resize', state.onResize);
    document.removeEventListener('visibilitychange', state.onVisibility);
    root.removeEventListener('mouseenter', state.onMouseEnter);
    root.removeEventListener('mouseleave', state.onMouseLeave);

    const stage = root.querySelector('.curve-carousel__stage');
    stage?.removeEventListener('pointerdown', state.onPointerDown);
    stage?.removeEventListener('pointermove', state.onPointerMove);
    stage?.removeEventListener('pointerup', state.endDrag);
    stage?.removeEventListener('pointercancel', state.endDrag);

    root._curveState = null;
  },
};

export default CurveCarousel;
