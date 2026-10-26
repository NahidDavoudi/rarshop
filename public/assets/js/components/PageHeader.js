import { storeConfig } from '../config/bootstrap.js';

const PageHeader = {
  render({ title, subtitle, icon = 'file-text' }) {
    return `
      <div class="bg-surface/60 border-b border-border">
        <div class="max-w-[1280px] mx-auto px-4 md:px-6 py-10 md:py-14">
          <div class="text-right">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-full text-xs text-muted mb-4">
              <i data-lucide="${icon}" class="w-3.5 h-3.5"></i>
              <span>${storeConfig.name}</span>
            </div>
            <h1 class="text-3xl md:text-4xl font-bold text-body mb-3">${title}</h1>
            ${subtitle ? `<p class="text-muted text-sm md:text-base max-w-2xl leading-relaxed">${subtitle}</p>` : ''}
          </div>
        </div>
      </div>`;
  },

  bind() { /* static */ },
};

export default PageHeader;
