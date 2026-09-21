/**
 * pages/faq.js
 */
import { storeConfig } from '../config/bootstrap.js';
import Router from '../core/router.js';
import PageHeader from '../components/PageHeader.js';
import Accordion from '../components/Accordion.js';

Router.onEnter('faq', function () {
  const root = document.getElementById('faq-root');
  if (!root) return;

  const { faq } = storeConfig.texts.legal;
  root.innerHTML = `
    ${PageHeader.render({ title: faq.title, subtitle: faq.subtitle, icon: faq.icon })}
    <div class="max-w-[800px] mx-auto px-4 md:px-6 py-10 md:py-14">
      ${Accordion.render({ items: faq.items })}
      <div class="mt-10 ${storeConfig.ui.cardBase} ${storeConfig.ui.cardRadius} p-6 text-center">
        <p class="text-sm text-muted mb-3">پاسخ سوال خود را پیدا نکردید؟</p>
        <a href="#/contact" data-link class="inline-flex items-center gap-2 text-sm font-bold text-body hover:text-accent transition-colors">
          <i data-lucide="message-circle" class="w-4 h-4"></i>
          <span>تماس با پشتیبانی</span>
        </a>
      </div>
    </div>`;

  Accordion.bind(root);
  if (window.lucide) lucide.createIcons();
});
