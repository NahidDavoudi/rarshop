import { storeConfig } from '../config/bootstrap.js';

const LegalContent = {
  render({ sections = [], lastUpdated = '' }) {
    const cards = sections.map((section, i) => `
      <article class="${storeConfig.ui.cardBase} ${storeConfig.ui.cardRadius} p-6 md:p-8 ${storeConfig.ui.cardHover}">
        <div class="flex items-center gap-3 flex-row-reverse justify-end mb-4">
          <h2 class="text-lg md:text-xl font-bold text-body">${section.title}</h2>
          <span class="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold text-muted shrink-0">${(i + 1).toLocaleString('fa-IR')}</span>
        </div>
        <div class="text-sm md:text-base text-muted leading-relaxed space-y-3 text-right">
          ${Array.isArray(section.content)
            ? section.content.map((p) => `<p>${p}</p>`).join('')
            : section.content || ''}
          ${section.items?.length
            ? `<ul class="list-disc list-inside space-y-2 mr-2 mt-3">${section.items.map((item) => `<li>${item}</li>`).join('')}</ul>`
            : ''}
        </div>
      </article>`).join('');

    return `
      <div class="max-w-[900px] mx-auto px-4 md:px-6 py-10 md:py-14">
        ${lastUpdated ? `<p class="text-xs text-muted/70 text-right mb-8">آخرین بروزرسانی: ${lastUpdated}</p>` : ''}
        <div class="space-y-6">${cards}</div>
      </div>`;
  },

  bind() { /* static */ },
};

export default LegalContent;
