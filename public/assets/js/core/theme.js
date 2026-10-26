/**
 * core/theme.js — inject store theme into CSS variables & document meta
 */
import { storeConfig } from '../config/bootstrap.js';
import { pickVariantSet } from '../utils/imageUrl.js';

const VAR_MAP = {
  primary: '--color-accent',
  primaryHover: '--color-accent-hover',
  background: '--color-dark',
  surface: '--color-dark-2',
  card: '--color-dark-3',
  border: '--color-border',
  muted: '--color-muted',
  textDim: '--color-text-dim',
  bodyText: '--color-body-text',
};

export function initTheme() {
  const root = document.documentElement;
  const { theme, fonts } = storeConfig;

  Object.entries(VAR_MAP).forEach(([key, cssVar]) => {
    if (theme[key]) root.style.setProperty(cssVar, theme[key]);
  });

  if (fonts?.body) root.style.setProperty('--font-vazir', `'${fonts.body}', sans-serif`);
  if (fonts?.display) root.style.setProperty('--font-display', `'${fonts.display}', sans-serif`);
  if (fonts?.felipa) root.style.setProperty('--font-felipa', `'${fonts.felipa}', sans-serif`);

  const faviconSrc = pickVariantSet(storeConfig.faviconVariants, 'thumb') || storeConfig.favicon;
  if (faviconSrc) {
    let link = document.querySelector('link[rel="shortcut icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.head.appendChild(link);
    }
    link.href = faviconSrc;
  }

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor && theme?.background) themeColor.content = theme.background;

  document.body?.style.setProperty('font-family', 'var(--font-vazir)');
  if (theme?.background) document.body?.style.setProperty('background-color', theme.background);
  if (theme?.bodyText) document.body?.style.setProperty('color', theme.bodyText);

  document.title = storeConfig.name;
}

export function pageTitle(title) {
  document.title = title || storeConfig.name;
}

export function setMetaDescription(description) {
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'description';
    document.head.appendChild(meta);
  }
  meta.content = description || '';
}

export default { initTheme, pageTitle, setMetaDescription };
