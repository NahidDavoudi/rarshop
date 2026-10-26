/**
 * core/storeSettings.js — fetch /settings and merge into runtime store config
 * Backend = source of truth · store.config.js = fallback
 */
import { mergeStoreSettings } from '../config/bootstrap.js';

export async function loadStoreSettings(api) {
  try {
    const data = await api.settings.get();
    if (data) mergeStoreSettings(data);
  } catch (err) {
    console.warn('[StoreSettings] using local fallback:', err?.message || err);
  }
}

export default loadStoreSettings;
