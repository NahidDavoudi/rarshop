import appConfig from './app.config.js';
import defaultStoreConfig from './store.config.js';
import { deepMerge } from '../utils/deepMerge.js';

/** Runtime config — mutated after /settings fetch */
export const storeConfig = typeof structuredClone === 'function'
  ? structuredClone(defaultStoreConfig)
  : JSON.parse(JSON.stringify(defaultStoreConfig));

function syncWindowConfig() {
  if (window.AppConfig) {
    window.AppConfig.app = { ...window.AppConfig.app, name: storeConfig.name };
  }
  window.StoreConfig = storeConfig;
}

export function initConfig() {
  window.AppConfig = {
    ...appConfig,
    app: { ...appConfig.app, name: storeConfig.name },
    api: { ...appConfig.api, ...storeConfig.api },
  };
  window.StoreConfig = storeConfig;
}

/**
 * Merge remote /settings into runtime storeConfig (backend wins when value present)
 * @param {Object|null} remote — API data: shop_name, shop_logo, shop_hero_image, ...
 */
export function mergeStoreSettings(remote) {
  if (!remote || typeof remote !== 'object') return storeConfig;

  if (remote.shop_name) {
    storeConfig.name = remote.shop_name;
    storeConfig.hero.title = remote.shop_name;
  }

  if (remote.shop_slogan) {
    storeConfig.hero.subtitle = remote.shop_slogan;
    storeConfig.texts.footer.tagline = remote.shop_slogan;
  }

  if (remote.legal_content && typeof remote.legal_content === 'object') {
    deepMerge(storeConfig.texts.legal, remote.legal_content);
  }

  if (remote.shop_description) {
    storeConfig.texts.legal.about.intro = remote.shop_description;
  }

  if (remote.shop_logo) {
    storeConfig.logo = remote.shop_logo;
    storeConfig.logoVariants = {
      large: remote.shop_logo,
      medium: remote.shop_logo_medium || remote.shop_logo,
      thumb: remote.shop_logo_thumb || remote.shop_logo,
    };
  }

  if (remote.shop_favicon) {
    storeConfig.favicon = remote.shop_favicon;
    storeConfig.faviconVariants = {
      large: remote.shop_favicon,
      medium: remote.shop_favicon_medium || remote.shop_favicon,
      thumb: remote.shop_favicon_thumb || remote.shop_favicon,
    };
  } else if (remote.shop_logo) {
    storeConfig.favicon = remote.shop_logo;
    storeConfig.faviconVariants = storeConfig.logoVariants;
  }

  if (remote.shop_hero_image) {
    storeConfig.hero.image = remote.shop_hero_image;
    storeConfig.hero.imageVariants = {
      large: remote.shop_hero_image,
      medium: remote.shop_hero_image_medium || remote.shop_hero_image,
      thumb: remote.shop_hero_image_thumb || remote.shop_hero_image,
    };
  }

  if (remote.contact_phone != null) {
    storeConfig.contacts.phone = remote.contact_phone;
    storeConfig.texts.legal.contact.phone.value = remote.contact_phone;
  }
  if (remote.contact_email != null) {
    storeConfig.contacts.email = remote.contact_email;
    storeConfig.texts.legal.contact.email.value = remote.contact_email;
  }
  if (remote.contact_address != null) {
    storeConfig.texts.legal.contact.address.value = remote.contact_address;
  }
  if (remote.social_instagram != null) {
    storeConfig.contacts.instagram = remote.social_instagram;
    storeConfig.texts.footer.social = remote.social_instagram;
  }
  if (remote.social_telegram != null) {
    storeConfig.contacts.telegram = remote.social_telegram;
  }
  if (remote.social_whatsapp != null) {
    storeConfig.contacts.whatsapp = remote.social_whatsapp;
  }

  if (remote.notification_enabled != null) {
    storeConfig.notificationBar.enabled = !!Number(remote.notification_enabled);
  }
  if (remote.notification_text != null) {
    storeConfig.notificationBar.text = remote.notification_text;
  }
  if (remote.notification_bg_color) {
    storeConfig.notificationBar.bgColor = remote.notification_bg_color;
  }
  if (remote.notification_text_color) {
    storeConfig.notificationBar.textColor = remote.notification_text_color;
  }

  if (remote.min_order_amount != null) {
    storeConfig.shipping.minOrder = Number(remote.min_order_amount);
  }

  if (remote.bank_card) storeConfig.payment.cardNumber = remote.bank_card;
  if (remote.bank_owner) storeConfig.payment.cardOwner = remote.bank_owner;
  if (remote.payment_method) storeConfig.payment.method = remote.payment_method;
  if (remote.zarinpal_merchant_id) {
    storeConfig.payment.zarinpalMerchantId = remote.zarinpal_merchant_id;
  }

  if (remote.shipping_free_from != null) {
    storeConfig.shipping.freeFrom = Number(remote.shipping_free_from);
  }
  if (remote.shipping_standard_cost != null) {
    storeConfig.shipping.standardCost = Number(remote.shipping_standard_cost);
  }

  if (remote.product_shipping_text != null && remote.product_shipping_text !== '') {
    storeConfig.texts.product.shippingText = remote.product_shipping_text;
  }

  if (remote.enamad?.href && remote.enamad?.logoUrl) {
    storeConfig.texts.footer.enamad = remote.enamad;
  } else if (Object.prototype.hasOwnProperty.call(remote, 'enamad') && !remote.enamad) {
    storeConfig.texts.footer.enamad = null;
  }

  syncWindowConfig();
  return storeConfig;
}
