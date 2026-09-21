/**
 * pages/privacy.js
 */
import { storeConfig } from '../config/bootstrap.js';
import Router from '../core/router.js';
import PageHeader from '../components/PageHeader.js';
import LegalContent from '../components/LegalContent.js';

Router.onEnter('privacy', function () {
  const root = document.getElementById('privacy-root');
  if (!root) return;

  const { privacy, lastUpdated } = storeConfig.texts.legal;
  root.innerHTML = `
    ${PageHeader.render({ title: privacy.title, subtitle: privacy.subtitle, icon: privacy.icon })}
    ${LegalContent.render({ sections: privacy.sections, lastUpdated })}`;

  if (window.lucide) lucide.createIcons();
});
