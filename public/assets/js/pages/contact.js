/**
 * pages/contact.js
 */
import { storeConfig } from '../config/bootstrap.js';
import Router from '../core/router.js';
import PageHeader from '../components/PageHeader.js';
import ContactLinks from '../components/ContactLinks.js';
import { escapeHtml } from '../utils/htmlEscape.js';

function renderInfoCard({ icon, label, value, note }) {
  if (!String(value ?? '').trim()) return '';
  return `
    <div class="${storeConfig.ui.cardBase} ${storeConfig.ui.cardRadius} p-6 ${storeConfig.ui.cardHover}">
      <div class="flex items-center gap-3 flex-row-reverse justify-end mb-3">
        <h3 class="font-bold text-body">${escapeHtml(label)}</h3>
        <div class="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center shrink-0">
          <i data-lucide="${icon}" class="w-4 h-4 text-muted"></i>
        </div>
      </div>
      <p class="text-sm md:text-base text-body text-right mb-1">${escapeHtml(value)}</p>
      ${note ? `<p class="text-xs text-muted text-right">${escapeHtml(note)}</p>` : ''}
    </div>`;
}

function renderContactPage() {
  const { contact } = storeConfig.texts.legal;
  const linksHtml = ContactLinks.render({ variant: 'page' });

  return `
    ${PageHeader.render({ title: contact.title, subtitle: contact.subtitle, icon: contact.icon })}
    <div class="max-w-[1280px] mx-auto px-4 md:px-6 py-10 md:py-14">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="space-y-4">
          ${linksHtml || ''}
          ${renderInfoCard({ icon: 'map-pin', ...contact.address })}
          ${renderInfoCard({ icon: 'clock', ...contact.hours })}
        </div>
        <div class="${storeConfig.ui.cardBase} ${storeConfig.ui.cardRadius} p-6 md:p-8 text-right flex flex-col justify-center">
          <h2 class="text-lg font-bold text-body mb-3">${escapeHtml(contact.formSectionTitle || 'راه‌های ارتباطی')}</h2>
          <p class="text-sm text-muted leading-relaxed">${escapeHtml(contact.formUnavailable || 'برای ارتباط با ما از راه‌های تماس سمت راست استفاده کنید.')}</p>
        </div>
      </div>
      <div class="mt-10">
        <div class="${storeConfig.ui.cardBase} ${storeConfig.ui.cardRadius} overflow-hidden">
          <div class="h-64 md:h-80 bg-surface flex flex-col items-center justify-center text-muted border-b border-border">
            <i data-lucide="map" class="w-12 h-12 mb-3 opacity-40"></i>
            <p class="text-sm">${escapeHtml(contact.mapPlaceholder)}</p>
            ${contact.address?.value ? `<p class="text-xs mt-1 opacity-60">${escapeHtml(contact.address.value)}</p>` : ''}
          </div>
        </div>
      </div>
    </div>`;
}

Router.onEnter('contact', function () {
  const root = document.getElementById('contact-root');
  if (!root) return;
  root.innerHTML = renderContactPage();
  if (window.lucide) lucide.createIcons();
});
