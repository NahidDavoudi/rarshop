/**
 * pages/product.js
 */
import api from '../core/api.js';
import Router from '../core/router.js';
import Breadcrumb from '../components/Breadcrumb.js';
import ProductGallery from '../components/ProductGallery.js';
import ProductInfo from '../components/ProductInfo.js';
import CompleteStyleSection from '../components/CompleteStyleSection.js';
import { storeConfig } from '../config/bootstrap.js';
import { pageTitle } from '../core/theme.js';
import { hasSelectableAxes } from '../utils/productVariants.js';
import DOM from '../utils/dom.js';

const { show, hide, text, hashHref } = DOM;

function normalizeImages(images = []) {
  return images.map((img) => {
    const normalized = {
      ...img,
      url: img.url || img.image_url || '',
      image_large_url: img.image_large_url || img.urls?.large || img.url || img.image_url || '',
      image_medium_url: img.image_medium_url || img.urls?.medium || img.url || img.image_url || '',
      image_thumb_url: img.image_thumb_url || img.urls?.thumb || img.url || img.image_url || '',
    };
    normalized.urls = {
      large: normalized.image_large_url,
      medium: normalized.image_medium_url,
      thumb: normalized.image_thumb_url,
    };
    return normalized;
  }).filter((img) => img.url || img.image_large_url);
}

function normalizeProduct(p) {
  const images = normalizeImages(p.images || []);
  if (!images.length && p.main_image) {
    images.push({ url: p.main_image, is_main: true });
  }
  return { ...p, images };
}

function buildRefCode(p) {
  const slug = (p.slug || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  if (slug) return `${slug}-${String(p.id).padStart(4, '0')}`;
  return `CG-${String(p.id).padStart(4, '0')}`;
}

function buildDetailBullets(p) {
  const t = storeConfig.texts.product;
  const bullets = [];
  (p.attributes || []).forEach((attr) => {
    const val = attr.custom_value || attr.value_value;
    if (val) bullets.push(`${attr.type_name}: ${val}`);
  });
  if (!p.description?.trim()) {
    bullets.push(...t.detailItems);
  }
  return bullets;
}

function getVariantPrice(variant, product) {
  if (variant?.sale_price) return Number(variant.sale_price);
  if (variant?.price) return Number(variant.price);
  if (product.sale_price) return Number(product.sale_price);
  return Number(product.price) || 0;
}

async function fetchRelated(p) {
  try {
    const filters = { limit: 5 };
    if (p.category_id) filters.category_id = p.category_id;
    else return [];

    const data = await api.products.list(filters);
    return (data.data || [])
      .filter((r) => r.id !== p.id)
      .slice(0, 4)
      .map(normalizeProduct);
  } catch {
    return [];
  }
}

async function addToCart(p, { variant, qty }) {
  if (hasSelectableAxes(p.variant_axes) && !variant?.id) {
    throw new Error(storeConfig.texts.product.selectVariant);
  }
  const variantId = variant?.id || null;
  await api.cart.add(p.id, qty, variantId);
  window.loadCartCount?.();
}

Router.onEnter('products', async function (params) {
  const { id } = params;
  if (!id) { Router.go('/shop'); return; }

  const t = storeConfig.texts.product;
  text('product-loading-text', t.loading);
  text('added-toast-text', t.addedToCart);
  const toastLink = document.getElementById('added-toast-link');
  if (toastLink) toastLink.textContent = t.viewCart;

  hide('product-detail');
  show('product-loading');
  document.getElementById('added-toast')?.classList.add('hidden');

  try {
    const raw = await api.products.get(id);
    const p = normalizeProduct(raw);
    pageTitle(p.name);

    hide('product-loading');
    show('product-detail');

    const shopT = storeConfig.texts.shop;
    const bcItems = [
      { href: '#/', label: shopT.breadcrumbHome },
      { href: hashHref('shop'), label: shopT.breadcrumbShop },
    ];
    bcItems.push({ href: hashHref('product', { id: p.id }), label: p.name });

    const bcEl = document.getElementById('product-breadcrumb');
    if (bcEl) bcEl.innerHTML = Breadcrumb.render(bcItems);

    const images = p.images.length ? p.images : [];
    const defaultVariant = p.variants?.find((v) => v.is_active && (v.inventory?.quantity ?? 0) > 0)
      || p.variants?.find((v) => v.is_default)
      || p.variants?.[0];
    const displayPrice = defaultVariant
      ? getVariantPrice(defaultVariant, p)
      : Number(p.price);
    const displayStock = defaultVariant
      ? Number(defaultVariant.inventory?.quantity ?? 0)
      : Number(p.stock ?? 0);

    const galleryWrap = document.getElementById('product-gallery-wrap');
    if (galleryWrap) {
      galleryWrap.innerHTML = ProductGallery.render({
        images,
        name: p.name,
        refCode: buildRefCode(p),
      });
      ProductGallery.bind(galleryWrap, { images });
    }

    const infoWrap = document.getElementById('product-info-wrap');
    if (infoWrap) {
      infoWrap.innerHTML = ProductInfo.render({
        name: p.name,
        price: displayPrice,
        description: p.description,
        shortDescription: p.short_description,
        variantAxes: p.variant_axes || [],
        variants: p.variants || [],
        stock: displayStock,
        detailBullets: buildDetailBullets(p),
      });

      ProductInfo.bind(infoWrap, {
        variants: p.variants || [],
        variantAxes: p.variant_axes || [],
        maxQty: Math.max(1, displayStock || 1),
        getVariantPrice: (variant) => getVariantPrice(variant, p),
        onAddToCart: async ({ variant, qty }) => {
          try {
            if (hasSelectableAxes(p.variant_axes) && !variant) {
              api.utils.toast(t.selectVariant, 'error');
              return;
            }
            await addToCart(p, { variant, qty });
            document.getElementById('added-toast')?.classList.remove('hidden');
            api.utils.toast(t.addedToCart, 'success', 2000);
          } catch (e) {
            api.utils.toast(e.message, 'error');
          }
        },
        onQuickBuy: async ({ variant, qty }) => {
          try {
            if (hasSelectableAxes(p.variant_axes) && !variant) {
              api.utils.toast(t.selectVariant, 'error');
              return;
            }
            await addToCart(p, { variant, qty });
            Router.go('/checkout');
          } catch (e) {
            api.utils.toast(e.message, 'error');
          }
        },
      });
    }

    const related = await fetchRelated(p);
    const styleWrap = document.getElementById('complete-style-wrap');
    if (styleWrap) {
      styleWrap.innerHTML = CompleteStyleSection.render({
        products: related,
        viewAllHref: p.category_id
          ? hashHref('shop', { category: p.category_slug || '' })
          : '#/shop',
      });
    }
  } catch (e) {
    const loadEl = document.getElementById('product-loading');
    if (loadEl) loadEl.innerHTML = `<p class="text-body text-xl text-center">${e.message}</p>`;
  }

  if (window.lucide) lucide.createIcons();
});