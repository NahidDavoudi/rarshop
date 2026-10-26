/**
 * Pick best image URL for a given display size with legacy fallback.
 * @param {string|Object|null} source
 * @param {'large'|'medium'|'thumb'} size
 * @returns {string}
 */
export function pickImageUrl(source, size = 'medium') {
  if (!source) return '';
  if (typeof source === 'string') return source;

  const urls = source.urls || {};
  const variantKey = size === 'large'
    ? 'image_large_url'
    : size === 'thumb'
      ? 'image_thumb_url'
      : 'image_medium_url';

  return urls[size]
    || source[variantKey]
    || source.url
    || source.image_url
    || source.poster_image
    || source.main_image
    || '';
}

/**
 * @param {Object} product
 * @param {'large'|'medium'|'thumb'} size
 * @returns {string}
 */
export function pickProductImage(product, size = 'medium') {
  if (!product) return '';

  const main = product.images?.find((i) => i.is_main) || product.images?.[0];
  if (main) return pickImageUrl(main, size);

  return pickImageUrl(
    {
      image_url: product.main_image || product.image || '',
      image_medium_url: product.main_image_medium,
      image_thumb_url: product.main_image_thumb,
    },
    size,
  );
}

/**
 * @param {Object} banner
 * @param {'large'|'medium'|'thumb'} size
 * @returns {string}
 */
export function pickBannerImage(banner, size = 'medium') {
  return pickImageUrl(banner, size);
}

/**
 * @param {Object} category
 * @param {'large'|'medium'|'thumb'} size
 * @returns {string}
 */
export function pickCategoryImage(category, size = 'medium') {
  const poster = category.poster_image
    ? {
        image_url: category.poster_image,
        image_medium_url: category.poster_image_medium,
        image_thumb_url: category.poster_image_thumb,
      }
    : null;

  if (poster?.image_url) return pickImageUrl(poster, size);

  const main = category.images?.find((i) => i.is_main) || category.images?.[0];
  if (main) return pickImageUrl(main, size);

  return pickImageUrl({ image_url: category.main_image || '' }, size);
}

/**
 * @param {Object} variants — { large, medium, thumb }
 * @param {'large'|'medium'|'thumb'} size
 * @returns {string}
 */
export function pickVariantSet(variants, size = 'medium') {
  if (!variants || typeof variants !== 'object') return '';
  return variants[size] || variants.medium || variants.large || variants.thumb || '';
}
