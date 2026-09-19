/**
 * pages/categories.js
 */
import api from '../core/api.js';
import Router from '../core/router.js';
import CategoryCard from '../components/CategoryCard.js';

Router.onEnter('categories', async function () {
  const grid = document.getElementById('cats-grid');

  try {
    const cats = await api.categories.list();
    if (grid) {
      grid.innerHTML = cats.length
        ? cats.map((c) => CategoryCard.render(c)).join('')
        : '<p class="col-span-full text-center text-muted py-8">دسته‌بندی‌ای یافت نشد</p>';
    }
  } catch (e) {
    if (grid) grid.innerHTML = `<p class="col-span-full text-accent text-center py-8">${e.message}</p>`;
  }

  if (window.lucide) lucide.createIcons();
});
