/**
 * core/cartStore.js — guest localStorage + authenticated API cart
 */
import * as auth from './auth.js';
import * as guestCart from '../utils/guestCart.js';
import { formatVariantLabel } from '../utils/productVariants.js';

export function normalizeCartItem(item) {
  const productId = Number(item.product_id ?? item.id);
  const variantId = item.variant_id ? Number(item.variant_id) : null;
  const qty = Math.max(1, Number(item.qty ?? item.quantity) || 1);
  const price = Number(item.price) || 0;

  return {
    id: variantId || productId,
    product_id: productId,
    variant_id: variantId,
    qty,
    quantity: qty,
    name: item.name || '',
    price,
    image: item.image || item.main_image || '',
    stock: item.stock != null ? Number(item.stock) : null,
    is_active: item.is_active !== 0 && item.is_active !== false,
    subtotal: price * qty,
    variant_title: item.variant_title || '',
    variant_label: item.variant_label || '',
    product_name: item.product_name || '',
    sku: item.sku || '',
  };
}

function normalizeCart(data) {
  const items = (data?.items || []).map(normalizeCartItem);
  const total = data?.total ?? items.reduce((sum, i) => sum + i.subtotal, 0);
  return { ...data, items, total };
}

async function enrichGuestItems(rawItems, fetchProduct) {
  const results = await Promise.all(
    rawItems.map(async (entry) => {
      try {
        const product = await fetchProduct(entry.product_id);
        if (!product || product.is_active === 0 || product.is_active === false) {
          return null;
        }

        let variant = null;
        if (entry.variant_id && product.variants?.length) {
          variant = product.variants.find((v) => Number(v.id) === Number(entry.variant_id));
        }
        if (!variant && product.variants?.length) {
          variant = product.variants.find((v) => v.is_default) || product.variants[0];
        }

        const stock = variant
          ? Number(variant.inventory?.quantity ?? 0)
          : Number(product.stock) || 0;
        const price = variant
          ? Number(variant.sale_price || variant.price || product.price)
          : Number(product.price);
        const qty = Math.min(entry.qty, Math.max(1, stock || entry.qty));
        const variantLabel = formatVariantLabel(variant);
        const name = variantLabel
          ? `${product.name} — ${variantLabel}`
          : product.name;

        return normalizeCartItem({
          product_id: entry.product_id,
          variant_id: variant?.id || entry.variant_id || null,
          qty,
          name,
          product_name: product.name,
          price,
          image: product.main_image || product.images?.[0]?.image_url || '',
          stock,
          is_active: product.is_active,
          variant_title: variant?.title || '',
          variant_label: variantLabel,
          sku: variant?.sku || '',
        });
      } catch {
        return null;
      }
    }),
  );

  const items = results.filter(Boolean);
  const staleKeys = new Set(
    rawItems
      .filter((entry) => !items.some((i) =>
        entry.variant_id
          ? i.variant_id === entry.variant_id
          : i.product_id === entry.product_id && !i.variant_id,
      ))
      .map((entry) => guestCart.itemKey(entry)),
  );

  if (staleKeys.size) {
    guestCart.setItems(
      rawItems.filter((entry) => !staleKeys.has(guestCart.itemKey(entry))),
    );
  }

  const total = items.reduce((sum, i) => sum + i.subtotal, 0);
  return { items, total };
}

export function createCartStore(http) {
  const { get, post, patch, del, withFallback, fetchProduct } = http;

  async function getGuestCart() {
    const raw = guestCart.getItems();
    if (!raw.length) {
      return { items: [], total: 0 };
    }
    return enrichGuestItems(raw, fetchProduct);
  }

  async function mergeGuestIfNeeded() {
    if (!auth.isLoggedIn()) return null;

    const raw = guestCart.getItems();
    if (!raw.length) return null;

    try {
      const merged = await post('/cart/merge', { items: raw });
      guestCart.clear();
      return normalizeCart(merged);
    } catch (err) {
      throw err;
    }
  }

  return {
    mergeGuestIfNeeded,

    get: async () => {
      if (auth.isLoggedIn()) {
        const data = await withFallback(get('/cart'), { items: [], total: 0 });
        return normalizeCart(data);
      }
      return getGuestCart();
    },

    add: async (productId, qty = 1, variantId = null) => {
      if (auth.isLoggedIn()) {
        const body = { product_id: productId, qty };
        if (variantId) body.variant_id = variantId;
        const data = await post('/cart/items', body);
        return normalizeCart(data);
      }

      const product = await fetchProduct(productId);
      if (!product || product.is_active === 0 || product.is_active === false) {
        throw new Error('محصول یافت نشد.');
      }

      let variant = null;
      if (variantId && product.variants?.length) {
        variant = product.variants.find((v) => Number(v.id) === Number(variantId));
      }
      if (!variant && product.variants?.length) {
        variant = product.variants.find((v) => v.is_default) || product.variants[0];
      }
      const resolvedVariantId = variant?.id || variantId || null;

      const items = guestCart.getItems();
      const current = items.find((i) =>
        resolvedVariantId
          ? i.variant_id === Number(resolvedVariantId)
          : i.product_id === Number(productId) && !i.variant_id,
      );
      const nextQty = (current?.qty || 0) + Math.max(1, Number(qty) || 1);
      const stock = variant
        ? Number(variant.inventory?.quantity ?? 0)
        : Number(product.stock) || 0;

      if (stock < nextQty) {
        throw new Error(`موجودی کافی نیست. فقط ${stock.toLocaleString('fa-IR')} عدد در انبار موجود است.`);
      }

      guestCart.addItem(productId, qty, resolvedVariantId);
      return getGuestCart();
    },

    update: async (productId, qty, variantId = null) => {
      if (auth.isLoggedIn()) {
        const path = variantId
          ? `/cart/items/variant/${variantId}`
          : `/cart/items/${productId}`;
        const data = await patch(path, { qty, product_id: productId, variant_id: variantId });
        return normalizeCart(data);
      }

      const amount = Number(qty);
      if (amount <= 0) {
        guestCart.removeItem(productId, variantId);
        return getGuestCart();
      }

      const product = await fetchProduct(productId);
      if (!product || product.is_active === 0 || product.is_active === false) {
        guestCart.removeItem(productId, variantId);
        throw new Error('محصول یافت نشد.');
      }

      let variant = null;
      if (variantId && product.variants?.length) {
        variant = product.variants.find((v) => Number(v.id) === Number(variantId));
      }
      const stock = variant
        ? Number(variant.inventory?.quantity ?? 0)
        : Number(product.stock) || 0;

      if (amount > stock) {
        throw new Error(`موجودی کافی نیست. فقط ${stock.toLocaleString('fa-IR')} عدد در انبار موجود است.`);
      }

      guestCart.updateItem(productId, amount, variantId);
      return getGuestCart();
    },

    remove: async (productId, variantId = null) => {
      if (auth.isLoggedIn()) {
        const path = variantId
          ? `/cart/items/variant/${variantId}`
          : `/cart/items/${productId}`;
        const data = await del(path);
        return normalizeCart(data);
      }

      guestCart.removeItem(productId, variantId);
      return getGuestCart();
    },

    clear: async () => {
      if (auth.isLoggedIn()) {
        await del('/cart');
        return { items: [], total: 0 };
      }

      guestCart.clear();
      return { items: [], total: 0 };
    },

    applyDiscount: (code) => post('/cart/discount', { code }),
  };
}

export default createCartStore;
