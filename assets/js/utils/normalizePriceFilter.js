import { parsePrice } from './priceFormatter.js';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Normalize raw price filter inputs against allowed range.
 * Empty values become null; out-of-bounds values are clamped; inverted min/max are swapped.
 */
export function normalizePriceFilter(rawMin, rawMax, range = { min: 0, max: 0 }) {
  const { min: boundMin, max: boundMax } = range;
  const minEmpty = rawMin === '' || rawMin == null;
  const maxEmpty = rawMax === '' || rawMax == null;

  let min = minEmpty ? null : parsePrice(rawMin);
  let max = maxEmpty ? null : parsePrice(rawMax);

  if (min != null) min = clamp(min, boundMin, boundMax);
  if (max != null) max = clamp(max, boundMin, boundMax);

  if (min != null && max != null && min > max) {
    [min, max] = [max, min];
  }

  return { min, max };
}
