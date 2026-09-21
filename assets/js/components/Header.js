import { storeConfig } from '../config/bootstrap.js';
import { pickVariantSet } from '../utils/imageUrl.js';
import auth from '../core/auth.js';

const Header = {
  render() {
    const user = auth.getCurrentUser();
    const loggedIn = auth.isLoggedIn();
    const logoSrc = pickVariantSet(storeConfig.logoVariants, 'thumb') || storeConfig.logo;
    const navLinks = storeConfig.texts.nav;

    const navItems = navLinks.map((l) => `
      <a href="${l.href}" data-link
         class="text-sm text-dim hover:text-body transition-colors px-2 py-1 rounded-full hover:bg-accent/10 header-nav-link">
        ${l.label}
      </a>`).join('');

    const userArea = loggedIn
      ? `<div class="hidden md:flex items-center gap-3">
           <span class="text-xs text-muted hidden sm:inline">${user?.name || user?.phone || ''}</span>
           <button id="header-logout-btn" class="text-xs text-muted hover:text-body transition-colors">خروج</button>
         </div>`
      : `<a href="login.html" class="hidden md:flex w-9 h-9 items-center justify-center rounded-full hover:bg-accent/10 transition-colors" title="ورود">
           <i data-lucide="user" class="w-[18px] h-[18px] text-muted"></i>
         </a>`;

    return `
      <header class="bg-body/80 backdrop-blur-xl border-b border-border">
        <div class="max-w-[1280px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <a href="#/" data-link class="shrink-0 flex items-center gap-2.5">
            <img src="${logoSrc}" alt="${storeConfig.name}" class="h-9 w-9 object-contain">
            <span class="font-display text-xl md:text-2xl text-body tracking-[0.15em] font-bold hidden md:inline" dir="ltr">${storeConfig.name}</span>
          </a>
          <nav class="hidden md:flex items-center gap-1">${navItems}</nav>
          <div class="flex items-center gap-2">
            <button class="hidden md:flex w-9 h-9 items-center justify-center rounded-full hover:bg-accent/10 transition-colors" title="جستجو">
              <i data-lucide="search" class="w-[18px] h-[18px] text-muted"></i>
            </button>
            <a href="#/cart" data-link class="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-accent/10 transition-colors group">
              <i data-lucide="shopping-bag" class="w-[18px] h-[18px] text-muted group-hover:text-body transition-colors"></i>
              <span id="cart-badge" class="hidden absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent text-white text-[9px] font-bold rounded-full flex items-center justify-center">0</span>
            </a>
            ${userArea}
          </div>
        </div>
      </header>`;
  },

  bind(container, callbacks = {}) {
    function highlightNav() {
      const hash = location.hash.split('?')[0];
      container.querySelectorAll('.header-nav-link').forEach((a) => {
        const href = a.getAttribute('href');
        const active = href === hash || (hash === '#/' && href === '#/');
        a.classList.toggle('text-body', active);
        a.classList.toggle('font-bold', active);
      });
    }

    highlightNav();
    window.addEventListener('hashchange', highlightNav);

    container.querySelector('#header-logout-btn')?.addEventListener('click', async () => {
      await callbacks.onLogout?.();
    });
  },
};

export default Header;
