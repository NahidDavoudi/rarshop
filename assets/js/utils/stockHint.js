import { storeConfig } from '../config/bootstrap.js';

export function getLowStockThreshold() {
  return Number(storeConfig.product?.lowStockThreshold ?? 5);
}

export function isLowStock(stock) {
  const qty = Number(stock);
  return qty > 0 && qty <= getLowStockThreshold();
}

export function formatLowStockMessage(stock) {
  const template = storeConfig.texts.product?.lowStockMessage || 'فقط {count} عدد باقی مانده';
  return template.replace('{count}', Number(stock).toLocaleString('fa-IR'));
}

export default { getLowStockThreshold, isLowStock, formatLowStockMessage };
