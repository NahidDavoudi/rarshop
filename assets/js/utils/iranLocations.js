/**
 * utils/iranLocations.js — province/city lookup from static JSON
 */

let _cache = null;

function buildIndex(rows) {
  const provincesMap = new Map();
  const citiesByProvince = new Map();

  rows.forEach((row) => {
    provincesMap.set(row.provinceId, row.provinceName);

    if (!citiesByProvince.has(row.provinceId)) {
      citiesByProvince.set(row.provinceId, new Map());
    }
    citiesByProvince.get(row.provinceId).set(row.cityName, row.cityName);
  });

  const provinces = [...provincesMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fa'));

  return {
    provinces,
    getCities(provinceId) {
      const cities = citiesByProvince.get(provinceId);
      if (!cities) return [];
      return [...cities.values()].sort((a, b) => a.localeCompare(b, 'fa'));
    },
  };
}

export async function loadIranLocations(url) {
  if (_cache) return _cache;

  const res = await fetch(url);
  if (!res.ok) throw new Error('بارگذاری لیست استان‌ها ناموفق بود');

  const rows = await res.json();
  _cache = buildIndex(rows);
  return _cache;
}

export function fillSelect(selectEl, options, placeholder) {
  if (!selectEl) return;

  selectEl.innerHTML = '';
  const placeholderOpt = document.createElement('option');
  placeholderOpt.value = '';
  placeholderOpt.textContent = placeholder;
  selectEl.appendChild(placeholderOpt);

  options.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    selectEl.appendChild(opt);
  });
}
