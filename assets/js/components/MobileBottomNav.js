import { storeConfig } from '../config/bootstrap.js';
import auth from '../core/auth.js';

function currentPath() {
  const raw = location.hash.replace(/^#/, '') || '/';
  return raw.split('?')[0] || '/';
}

function resolveHref(item) {
  if (item.id === 'profile') {
    return auth.isLoggedIn() ? '#/profile' : 'login.html';
  }
  return item.href;
}

function isActive(item) {
  const path = currentPath();
  if (item.id === 'profile') {
    return auth.isLoggedIn() && (path === '/profile' || path === '/orders');
  }
  return (item.routes || []).some((r) => r === path || (path === '/' && r === ''));
}

const MobileBottomNav = {
  render() {
    const items = storeConfig.texts.mobileBottomNav || [];

    const links = items.map((item) => {
      const href = resolveHref(item);
      const external = !href.startsWith('#');
      const linkAttrs = external ? '' : 'data-link';
      return `
        <a href="${href}" ${linkAttrs}
           class="mobile-bottom-nav__item flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1.5 text-muted transition-all duration-200"
           data-nav-id="${item.id || ''}">
          <i data-lucide="${item.icon}" class="w-5 h-5 shrink-0"></i>
          <span class="text-[10px] font-medium truncate max-w-full px-1">${item.label}</span>
        </a>`;
    }).join('');

    return `
      <nav id="mobile-bottom-nav" class="mobile-bottom-nav md:hidden" aria-label="ناوبری اصلی">
        <div class="mobile-bottom-nav__inner flex items-stretch max-w-[1280px] mx-auto">
          ${links}
        </div>
      </nav>`;
  },

  bind(container) {
    function highlight() {
      const items = storeConfig.texts.mobileBottomNav || [];
      container.querySelectorAll('.mobile-bottom-nav__item').forEach((el, i) => {
        const item = items[i];
        if (!item) return;
        const active = isActive(item);
        el.classList.toggle('is-active', active);
        el.classList.toggle('text-accent', active);
        el.classList.toggle('text-muted', !active);
      });
    }

    highlight();
    window.addEventListener('hashchange', highlight);
  },
};

export default MobileBottomNav;
