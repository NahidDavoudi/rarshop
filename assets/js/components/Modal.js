const Modal = {
  render({ id, title, body, footer = '' }) {
    return `
      <div id="${id}" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div class="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-xl">
          ${title ? `<h3 class="text-lg font-bold mb-4">${title}</h3>` : ''}
          <div class="modal-body">${body}</div>
          ${footer ? `<div class="mt-6 flex gap-3 justify-end">${footer}</div>` : ''}
        </div>
      </div>`;
  },

  bind(element, { onClose }) {
    element.addEventListener('click', (e) => {
      if (e.target === element) onClose?.();
    });
  },

  show(id) { document.getElementById(id)?.classList.remove('hidden'); },
  hide(id) { document.getElementById(id)?.classList.add('hidden'); },
};

export default Modal;
