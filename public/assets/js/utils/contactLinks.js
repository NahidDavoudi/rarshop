/**
 * contactLinks.js — build normalized contact/social link data (pure functions)
 */

const CHANNEL_ORDER = ['phone', 'email', 'telegram', 'instagram', 'whatsapp'];

function trim(value) {
  return String(value ?? '').trim();
}

function digitsOnly(value) {
  return value.replace(/\D/g, '');
}

function normalizePhoneHref(value) {
  const raw = trim(value);
  if (!raw) return '';
  if (/^tel:/i.test(raw)) return raw;
  const digits = digitsOnly(raw);
  if (!digits) return `tel:${raw}`;
  if (digits.startsWith('98')) return `tel:+${digits}`;
  if (digits.startsWith('0')) return `tel:+98${digits.slice(1)}`;
  return `tel:+98${digits}`;
}

function normalizeEmailHref(value) {
  const raw = trim(value);
  if (!raw) return '';
  if (/^mailto:/i.test(raw)) return raw;
  return `mailto:${raw}`;
}

function normalizeTelegramHref(value) {
  const raw = trim(value);
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const username = raw.replace(/^@/, '');
  return `https://t.me/${encodeURIComponent(username)}`;
}

function normalizeInstagramHref(value) {
  const raw = trim(value);
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const username = raw.replace(/^@/, '').replace(/^instagram\.com\//i, '');
  return `https://instagram.com/${encodeURIComponent(username)}`;
}

function normalizeWhatsappHref(value) {
  const raw = trim(value);
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const digits = digitsOnly(raw);
  if (!digits) return '';
  if (digits.startsWith('98')) return `https://wa.me/${digits}`;
  if (digits.startsWith('0')) return `https://wa.me/98${digits.slice(1)}`;
  return `https://wa.me/98${digits}`;
}

const HREF_BUILDERS = {
  phone: normalizePhoneHref,
  email: normalizeEmailHref,
  telegram: normalizeTelegramHref,
  instagram: normalizeInstagramHref,
  whatsapp: normalizeWhatsappHref,
};

/**
 * @param {Record<string, string>} contacts
 * @param {Record<string, { label: string, icon: string }>} meta
 * @returns {{ key: string, label: string, icon: string, value: string, href: string, external: boolean }[]}
 */
export function buildContactLinks(contacts = {}, meta = {}) {
  return CHANNEL_ORDER.reduce((links, key) => {
    const value = trim(contacts[key]);
    if (!value) return links;

    const href = HREF_BUILDERS[key]?.(value) || value;
    if (!href) return links;

    links.push({
      key,
      label: meta[key]?.label || key,
      icon: meta[key]?.icon || 'link',
      value,
      href,
      external: key !== 'phone' && key !== 'email',
    });
    return links;
  }, []);
}

export default buildContactLinks;
