/**
 * copyrightYear.js — dynamic display year for copyright text
 */

export function getCopyrightYear() {
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' }).format(new Date());
  } catch {
    return new Date().getFullYear().toLocaleString('fa-IR');
  }
}

/**
 * @param {string} template — e.g. "© {year} RAR shop — تمام حقوق محفوظ است"
 */
export function formatCopyright(template) {
  const text = String(template ?? '');
  return text.replace(/\{year\}/g, getCopyrightYear());
}

export default getCopyrightYear;
