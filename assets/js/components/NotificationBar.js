import { storeConfig } from '../config/bootstrap.js';
import { escapeHtml } from '../utils/htmlEscape.js';

function safeHexColor(value, fallback) {
  const color = String(value ?? '').trim();
  return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(color) ? color : fallback;
}

const NotificationBar = {
  render() {
    const bar = storeConfig.notificationBar;
    if (!bar?.enabled || !String(bar.text ?? '').trim()) return '';

    const bg = safeHexColor(bar.bgColor, '#c41e3a');
    const color = safeHexColor(bar.textColor, '#ffffff');

    return `
      <div
        id="site-notification-bar"
        class="w-full text-center text-xs sm:text-sm leading-relaxed px-4 py-2"
        style="background-color:${bg};color:${color}"
        role="status"
      >
        <p class="max-w-[1280px] mx-auto">${escapeHtml(bar.text.trim())}</p>
      </div>`;
  },

  bind() { /* static banner */ },
};

export default NotificationBar;
