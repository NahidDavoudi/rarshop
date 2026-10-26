/**
 * productVariants.js — pure helpers for variant axis visibility and labels
 */

export const STANDARD_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];

export function activeValues(axis) {
  return (axis.values || []).filter((v) => Number(v.is_active ?? 1) === 1);
}

export function getVisibleAxes(variantAxes = []) {
  return (variantAxes || [])
    .filter((axis) => Number(axis.is_active ?? 1) === 1)
    .filter((axis) => activeValues(axis).length > 1);
}

export function applyHiddenAxisDefaults(variantAxes = [], selected = {}) {
  const next = { ...selected };
  (variantAxes || [])
    .filter((axis) => Number(axis.is_active ?? 1) === 1)
    .forEach((axis) => {
      const vals = activeValues(axis);
      if (vals.length === 1 && vals[0]?.id != null && selected[axis.type_slug] == null) {
        next[axis.type_slug] = Number(vals[0].id);
      }
    });
  return next;
}

export function hasSelectableAxes(variantAxes = []) {
  return getVisibleAxes(variantAxes).length > 0;
}

export function isAxisSelectionComplete(variantAxes = [], selected = {}) {
  const visible = getVisibleAxes(variantAxes);
  if (!visible.length) return true;
  return visible.every((axis) => selected[axis.type_slug] != null);
}

export function getSwatchStyle(hex) {
  const color = String(hex ?? '').trim();
  if (color) return `background:${color}`;
  return 'background:linear-gradient(135deg,#666 50%,#999 50%)';
}

export function formatVariantLabel(variant) {
  const values = (variant?.attribute_values || [])
    .map((av) => av.value)
    .filter(Boolean);
  if (values.length) return values.join(' · ');
  const title = String(variant?.title ?? '').trim();
  return title && title !== 'Default' ? title : '';
}

export function formatCartVariantLine(item = {}) {
  if (item.variant_label) return item.variant_label;
  if (item.variant_title && item.variant_title !== 'Default') {
    if (item.product_name && item.name?.includes(item.variant_title)) {
      return item.variant_title;
    }
    if (!item.name?.includes(item.variant_title)) {
      return item.variant_title;
    }
  }
  return '';
}

export function getCartDisplayName(item = {}) {
  if (item.product_name) return item.product_name;
  const variantLine = formatCartVariantLine(item);
  if (variantLine && item.name?.includes(variantLine)) {
    return item.name.replace(` — ${variantLine}`, '').replace(` - ${variantLine}`, '');
  }
  return item.name || '';
}

export default {
  STANDARD_SIZES,
  getVisibleAxes,
  applyHiddenAxisDefaults,
  hasSelectableAxes,
  isAxisSelectionComplete,
  getSwatchStyle,
  formatVariantLabel,
  formatCartVariantLine,
  getCartDisplayName,
};
