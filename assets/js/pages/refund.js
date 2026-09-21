/**
 * pages/refund.js
 */
import { storeConfig } from '../config/bootstrap.js';
import Router from '../core/router.js';
import PageHeader from '../components/PageHeader.js';
import LegalContent from '../components/LegalContent.js';

Router.onEnter('refund', function () {
  const root = document.getElementById('refund-root');
  if (!root) return;

  const { refund, lastUpdated } = storeConfig.texts.legal;
  root.innerHTML = `
    ${PageHeader.render({ title: refund.title, subtitle: refund.subtitle, icon: refund.icon })}
    ${LegalContent.render({ sections: refund.sections, lastUpdated })}`;

  if (window.lucide) lucide.createIcons();
});
