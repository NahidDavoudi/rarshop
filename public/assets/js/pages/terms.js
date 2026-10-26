/**
 * pages/terms.js
 */
import { storeConfig } from '../config/bootstrap.js';
import Router from '../core/router.js';
import PageHeader from '../components/PageHeader.js';
import LegalContent from '../components/LegalContent.js';

Router.onEnter('terms', function () {
  const root = document.getElementById('terms-root');
  if (!root) return;

  const { terms, lastUpdated } = storeConfig.texts.legal;
  root.innerHTML = `
    ${PageHeader.render({ title: terms.title, subtitle: terms.subtitle, icon: terms.icon })}
    ${LegalContent.render({ sections: terms.sections, lastUpdated })}`;

  if (window.lucide) lucide.createIcons();
});
