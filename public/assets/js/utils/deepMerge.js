/**
 * Deep-merge source into target (mutates target). Arrays are replaced, not merged.
 * @param {Object} target
 * @param {Object} source
 * @returns {Object}
 */
export function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;

  Object.keys(source).forEach((key) => {
    const srcVal = source[key];
    const tgtVal = target[key];

    if (
      srcVal !== null
      && typeof srcVal === 'object'
      && !Array.isArray(srcVal)
      && tgtVal !== null
      && typeof tgtVal === 'object'
      && !Array.isArray(tgtVal)
    ) {
      deepMerge(tgtVal, srcVal);
    } else if (srcVal !== undefined) {
      target[key] = srcVal;
    }
  });

  return target;
}

export default deepMerge;
