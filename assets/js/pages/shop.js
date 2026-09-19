/**
 * pages/shop.js
 */
import api from '../core/api.js';
import Router from '../core/router.js';
import ShopHero from '../components/ShopHero.js';
import ShopProductCard from '../components/ShopProductCard.js';
import ShopSidebar from '../components/ShopSidebar.js';
import Button from '../components/Button.js';
import { storeConfig } from '../config/bootstrap.js';
import DOM from '../utils/dom.js';

const { show, hide, text, hashHref } = DOM;

const LEGACY_ATTR_KEYS = ['color', 'size'];

function parseAttrParams(params) {
  const attrs = {};

  Object.entries(params).forEach(([key, value]) => {
    if (!value) return;
    if (key.startsWith('attr_')) {
      attrs[key.slice(5)] = String(value).split(',').filter(Boolean);
    }
  });

  LEGACY_ATTR_KEYS.forEach((key) => {
    if (params[key]) {
      attrs[key] = key === 'size'
        ? [String(params[key])].filter(Boolean)
        : String(params[key]).split(',').filter(Boolean);
    }
  });

  return attrs;
}

function buildAttrUrlParams(attrs = {}) {
  const result = {};
  Object.entries(attrs).forEach(([slug, values]) => {
    const list = Array.isArray(values) ? values.filter(Boolean) : [values].filter(Boolean);
    if (list.length) result[`attr_${slug}`] = list.join(',');
  });
  return result;
}

function hasActiveFilters(params, activeAttrs, priceRange) {
  const { category, q } = params;
  const hasAttrs = Object.values(activeAttrs).some((values) => values?.length);
  const priceActive = priceRange && (
    (params.price_min && +params.price_min > priceRange.min)
    || (params.price_max && +params.price_max < priceRange.max)
  );
  return !!(category || q || hasAttrs || priceActive);
}

function buildFilterParams(base, extra = {}) {
  const next = { ...base, ...extra };

  LEGACY_ATTR_KEYS.forEach((key) => delete next[key]);
  Object.keys(next).forEach((key) => {
    if (key.startsWith('attr_')) delete next[key];
  });

  if (extra.attrs) {
    Object.assign(next, buildAttrUrlParams(extra.attrs));
    delete next.attrs;
  }

  Object.keys(next).forEach((k) => {
    if (next[k] === '' || next[k] == null) delete next[k];
  });
  delete next.page;
  return next;
}

function renderBreadcrumb(params, categoryName) {
  const t = storeConfig.texts.shop;
  const crumbs = [
    `<a href="#/" data-link class="hover:text-body transition-colors">${t.breadcrumbHome}</a>`,
    `<a href="${hashHref('shop')}" data-link class="hover:text-body transition-colors">${t.breadcrumbShop}</a>`,
  ];
  if (categoryName) {
    crumbs.push(`<span class="text-body">${categoryName}</span>`);
  } else if (params.q) {
    crumbs.push(`<span class="text-body">${params.q}</span>`);
  }
  return crumbs.join('<span class="text-black/20">/</span>');
}

function normalizeProduct(p) {
  if (p.main_image && !p.images?.length) {
    return { ...p, images: [{ url: p.main_image, is_main: true }] };
  }
  if (p.images?.length && !p.images[0].url) {
    return {
      ...p,
      images: p.images.map((i) => ({ ...i, url: i.image_url || i.url })),
    };
  }
  return p;
}

function buildApiFilters(params, activeAttrs) {
  const apiFilters = { limit: 100 };
  if (params.category) apiFilters.category = params.category;
  if (params.sort) apiFilters.sort = params.sort;
  if (params.q) apiFilters.q = params.q;
  if (params.featured) apiFilters.featured = params.featured;
  if (params.price_min) apiFilters.price_min = params.price_min;
  if (params.price_max) apiFilters.price_max = params.price_max;
  if (Object.keys(activeAttrs).length) apiFilters.attrs = activeAttrs;
  return apiFilters;
}

Router.onEnter('shop', async function (params) {
  const t = storeConfig.texts.shop;
  const pageSize = t.pageSize;
  const activeAttrs = parseAttrParams(params);

  text('shop-loading-text', t.loading);
  text('shop-empty-text', t.empty);
  text('filter-toggle-label', t.filterToggle);
  const emptyLink = document.getElementById('shop-empty-link');
  if (emptyLink) emptyLink.textContent = t.emptyAction;

  let categoryName = '';
  if (params.category) {
    try {
      const cat = await api.categories.bySlug(params.category);
      categoryName = cat?.name || params.category;
    } catch {
      categoryName = params.category;
    }
  }

  const title = categoryName || (params.q ? params.q : t.allProducts);
  const heroEl = document.getElementById('shop-hero');
  if (heroEl) heroEl.innerHTML = ShopHero.render(title);

  const breadcrumbEl = document.getElementById('shop-breadcrumb');
  if (breadcrumbEl) breadcrumbEl.innerHTML = renderBreadcrumb(params, categoryName);

  const sidebarWrap = document.getElementById('shop-sidebar-wrap');

  function closeSidebar() {
    sidebarWrap?.classList.remove('sidebar-open');
    document.getElementById('sidebar-backdrop')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.getElementById('sidebar-backdrop')?.addEventListener('click', closeSidebar);

  const newToggle = DOM.reclone('filter-toggle');
  if (newToggle) {
    newToggle.addEventListener('click', () => {
      sidebarWrap?.classList.add('sidebar-open');
      document.getElementById('sidebar-backdrop')?.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }

  const apiFilters = buildApiFilters(params, activeAttrs);

  show('shop-loading');
  hide('shop-load-more');

  try {
    const data = await api.products.list(apiFilters);
    hide('shop-loading');

    const facets = data.facets || [];
    const priceRange = data.price_range || { min: 0, max: 0, step: 1 };
    const products = (data.data || []).map(normalizeProduct);
    const total = data.total ?? products.length;

    const priceMin = params.price_min ? +params.price_min : null;
    const priceMax = params.price_max ? +params.price_max : null;

    if (sidebarWrap) {
      sidebarWrap.innerHTML = ShopSidebar.render({
        facets,
        activeAttrs,
        priceRange,
        priceMin,
        priceMax,
      });
      ShopSidebar.bind(sidebarWrap, {
        onApply: (filters) => {
          const nextPriceMin = filters.priceMin != null && filters.priceMin > priceRange.min
            ? filters.priceMin
            : '';
          const nextPriceMax = filters.priceMax != null && filters.priceMax < priceRange.max
            ? filters.priceMax
            : '';

          Router.go('/shop', buildFilterParams(params, {
            attrs: filters.attrs,
            price_min: nextPriceMin,
            price_max: nextPriceMax,
            color: '',
            size: '',
          }));
          if (window.innerWidth < 768) closeSidebar();
        },
        onClear: () => {
          Router.go('/shop', buildFilterParams(params, {
            category: '',
            q: '',
            attrs: {},
            price_min: '',
            price_max: '',
            color: '',
            size: '',
          }));
          if (window.innerWidth < 768) closeSidebar();
        },
        onClose: closeSidebar,
      });
    }

    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', !hasActiveFilters(params, activeAttrs, priceRange));
    }

    text('product-count', `${total.toLocaleString('fa-IR')} ${t.productsFound}`);

    const grid = document.getElementById('products-grid');
    const loadMoreEl = document.getElementById('shop-load-more');
    let visibleCount = pageSize;

    function renderGrid() {
      const slice = products.slice(0, visibleCount);
      if (!slice.length) {
        show('shop-empty');
        if (grid) grid.innerHTML = '';
        if (loadMoreEl) loadMoreEl.classList.add('hidden');
        return;
      }

      hide('shop-empty');
      if (grid) grid.innerHTML = slice.map((p) => ShopProductCard.render(p)).join('');

      if (loadMoreEl) {
        if (visibleCount < total) {
          loadMoreEl.classList.remove('hidden');
          loadMoreEl.innerHTML = Button.render({
            variant: 'glass',
            label: t.showMore,
            className: 'shop-load-more-btn mx-auto min-w-[180px]',
          });
          loadMoreEl.querySelector('.shop-load-more-btn')?.addEventListener('click', () => {
            visibleCount = Math.min(visibleCount + pageSize, total);
            renderGrid();
            if (window.lucide) lucide.createIcons();
          }, { once: true });
        } else {
          loadMoreEl.classList.add('hidden');
        }
      }
    }

    renderGrid();
  } catch (e) {
    const loadEl = document.getElementById('shop-loading');
    if (loadEl) loadEl.innerHTML = `<p class="text-body text-center">${e.message}</p>`;
  }

  if (window.lucide) lucide.createIcons();
});
