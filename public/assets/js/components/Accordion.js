const Accordion = {
  render({ items = [] }) {
    return `
      <div class="space-y-3 faq-accordion">
        ${items.map((item) => `
          <div class="bg-card border border-border rounded-2xl overflow-hidden" data-accordion-item>
            <button type="button"
                    class="w-full flex items-center justify-between gap-4 px-5 py-4 text-right hover:bg-surface/40 transition-colors"
                    data-accordion-trigger
                    aria-expanded="false">
              <i data-lucide="chevron-down" class="w-4 h-4 text-muted shrink-0 transition-transform duration-300 accordion-icon"></i>
              <span class="text-sm md:text-base font-medium text-body flex-1">${item.question}</span>
            </button>
            <div class="hidden px-5 pb-5 text-sm text-muted leading-relaxed text-right" data-accordion-panel>
              ${item.answer}
            </div>
          </div>`).join('')}
      </div>`;
  },

  bind(container, { singleOpen = true } = {}) {
    container.querySelectorAll('[data-accordion-trigger]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('[data-accordion-item]');
        const panel = item.querySelector('[data-accordion-panel]');
        const icon = btn.querySelector('.accordion-icon');
        const isOpen = !panel.classList.contains('hidden');

        if (singleOpen) {
          container.querySelectorAll('[data-accordion-item]').forEach((other) => {
            if (other === item) return;
            other.querySelector('[data-accordion-panel]').classList.add('hidden');
            other.querySelector('[data-accordion-trigger]').setAttribute('aria-expanded', 'false');
            other.querySelector('.accordion-icon')?.classList.remove('rotate-180');
          });
        }

        panel.classList.toggle('hidden', isOpen);
        btn.setAttribute('aria-expanded', String(!isOpen));
        icon?.classList.toggle('rotate-180', !isOpen);
      });
    });
  },
};

export default Accordion;
