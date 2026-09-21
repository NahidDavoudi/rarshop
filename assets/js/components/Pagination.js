const Pagination = {
  render({ page, totalPages, total, perPage }) {
    if (totalPages <= 1) return '';

    const start = (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, total);

    let buttons = `<button data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}
      class="w-7 h-7 rounded-lg border border-border text-muted hover:border-accent/40 disabled:opacity-30 text-xs transition-colors">‹</button>`;

    for (let p = 1; p <= totalPages; p++) {
      buttons += `<button data-page="${p}"
        class="w-7 h-7 rounded-lg border text-xs transition-colors
               ${p === page ? 'border-accent bg-accent/20 text-body' : 'border-border text-muted hover:border-accent/40'}">
        ${p.toLocaleString('fa-IR')}</button>`;
    }

    buttons += `<button data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}
      class="w-7 h-7 rounded-lg border border-border text-muted hover:border-accent/40 disabled:opacity-30 text-xs transition-colors">›</button>`;

    return {
      info: `نمایش ${start.toLocaleString('fa-IR')} تا ${end.toLocaleString('fa-IR')} از ${total.toLocaleString('fa-IR')}`,
      nav: buttons,
    };
  },

  bind(navEl, { onPageChange }) {
    navEl.querySelectorAll('button[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.dataset.page, 10);
        if (!Number.isNaN(p)) onPageChange?.(p);
      });
    });
  },
};

export default Pagination;
