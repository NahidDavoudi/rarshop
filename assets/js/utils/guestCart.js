/**
 * utils/guestCart.js — guest cart persistence (pure localStorage)
 */

function storageKey() {
  return window.AppConfig?.storage?.guestCart || 'gb_guest_cart';
}

function readRaw() {
  try {
    const raw = localStorage.getItem(storageKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(items) {
  localStorage.setItem(storageKey(), JSON.stringify(items));
}

function itemKey(item) {
  return item.variant_id ? `v:${item.variant_id}` : `p:${item.product_id}`;
}

export function getItems() {
  return readRaw()
    .map((item) => ({
      product_id: Number(item.product_id),
      variant_id: item.variant_id ? Number(item.variant_id) : null,
      qty: Math.max(1, Number(item.qty) || 1),
    }))
    .filter((item) => item.product_id > 0);
}

export function setItems(items) {
  writeRaw(items);
}

export function addItem(productId, qty = 1, variantId = null) {
  const id = Number(productId);
  const vid = variantId ? Number(variantId) : null;
  const amount = Math.max(1, Number(qty) || 1);
  const items = getItems();
  const existing = items.find((i) =>
    vid ? i.variant_id === vid : i.product_id === id && !i.variant_id,
  );

  if (existing) {
    existing.qty += amount;
  } else {
    items.push({ product_id: id, variant_id: vid, qty: amount });
  }

  writeRaw(items);
  return items;
}

export function updateItem(productId, qty, variantId = null) {
  const id = Number(productId);
  const vid = variantId ? Number(variantId) : null;
  const amount = Number(qty);

  if (amount <= 0) {
    return removeItem(id, vid);
  }

  const items = getItems();
  const existing = items.find((i) =>
    vid ? i.variant_id === vid : i.product_id === id && !i.variant_id,
  );
  if (existing) {
    existing.qty = amount;
  } else {
    items.push({ product_id: id, variant_id: vid, qty: amount });
  }

  writeRaw(items);
  return items;
}

export function removeItem(productId, variantId = null) {
  const id = Number(productId);
  const vid = variantId ? Number(variantId) : null;
  const items = getItems().filter((i) => {
    if (vid) return i.variant_id !== vid;
    return !(i.product_id === id && !i.variant_id);
  });
  writeRaw(items);
  return items;
}

export function clear() {
  localStorage.removeItem(storageKey());
}

export function totalQty(items = getItems()) {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

export default {
  getItems,
  setItems,
  addItem,
  updateItem,
  removeItem,
  clear,
  totalQty,
  itemKey,
};
