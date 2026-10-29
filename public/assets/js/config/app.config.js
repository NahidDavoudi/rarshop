/**
 * app.config.js — تنظیمات زیرساختی (ثابت بین فروشگاه‌ها)
 */
export default {
  app: {
    name: 'RAR shop',
    locale: 'fa-IR',
  },

  api: {
    baseUrl: 'https://api.rarshop.ir/api/v1',
    timeout: 30000,
    retries: 1,
    retryDelay: 600,
    autoRefresh: true,
  },

  storage: {
    token: 'gb_token',
    refreshToken: 'gb_refresh',
    role: 'gb_role',
    user: 'gb_user',
    guestCart: 'gb_guest_cart',
  },

  messages: {
    network: 'خطا در اتصال به سرور. اتصال اینترنت را بررسی کنید.',
    timeout: 'زمان درخواست به پایان رسید. دوباره تلاش کنید.',
    parse: 'پاسخ سرور قابل پردازش نیست.',
    unknown: 'خطای ناشناخته رخ داد.',
    unauthorized: 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.',
    forbidden: 'شما اجازه انجام این عملیات را ندارید.',
    notFound: 'مورد درخواستی یافت نشد.',
    validation: 'لطفاً اطلاعات وارد شده را بررسی کنید.',
    rateLimit: 'تعداد درخواست‌ها بیش از حد مجاز است. کمی صبر کنید.',
    server: 'خطای داخلی سرور. بعداً تلاش کنید.',
  },

  fallback: {
    products: { data: [], facets: [], price_range: { min: 0, max: 0, step: 1 }, total: 0 },
    categories: [],
    settings: null,
    cart: { items: [], total: 0 },
  },

  hooks: {
    onUnauthorized: null,
    onError: null,
  },
};
