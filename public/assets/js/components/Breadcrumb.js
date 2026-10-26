import DOM from '../utils/dom.js';

const Breadcrumb = {
  render(items) {
    const parts = [...items].reverse().map((item, i) => {
      const link = item.href
        ? `<a href="${item.href}" data-link class="hover:text-body ${i === 0 ? 'text-body' : 'text-muted'}">${item.label}</a>`
        : `<span class="text-muted">${item.label}</span>`;
      return link;
    });

    return parts.join('<span class="text-muted mx-1">/</span>');
  },

  bind(container) {
    /* router handles data-link */
  },
};

export default Breadcrumb;
