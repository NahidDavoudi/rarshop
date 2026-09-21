# FRONTEND_MAP — ممیزی فرانت‌اند RAR shop

> خواندن-فقط (READ-ONLY). هر ادعا با `file:line` یا نام تابع مستند شده است. موارد تأیید نشده "UNVERIFIED" نوشته شده‌اند.

---

## 1. ساختار (Structure)

### 1.1 درخت فایل + حجم (LOC)

| مسیر | کارکرد | LOC |
|---|---|---|
| `assets/js/app.js` | نقطه ورود SPA فروشگاه | 146 |
| `assets/js/login.js` | نقطه ورود صفحه ورود/ثبت‌نام | 424 |
| `assets/js/config/app.config.js` | تنظیمات زیرساختی (api, storage, messages) | 50 |
| `assets/js/config/store.config.js` | تنظیمات پیش‌فرض فروشگاه (fallback) | 1690 |
| `assets/js/config/bootstrap.js` | ایجاد runtime config + merge با settings سرور | 146 |
| `assets/js/core/api.js` | لایه HTTP (fetch, refresh, error map) | 560 |
| `assets/js/core/auth.js` | مدیریت نشست (توکن = HttpOnly cookie) | 83 |
| `assets/js/core/cartStore.js` | سبد خرید (guest localStorage + API) | 268 |
| `assets/js/core/router.js` | روتر navigo hash-mode + گارد auth | 131 |
| `assets/js/core/state.js` | state ساده reactive (get/set/on) | 29 |
| `assets/js/core/events.js` | event bus سبک | 26 |
| `assets/js/core/storeSettings.js` | fetch + merge تنظیمات از API | 16 |
| `assets/js/core/theme.js` | تزریق theme به CSS vars + meta | 66 |
| `assets/js/pages/*` (16 فایل) | هندلرهای صفحات SPA (home, shop, product, cart, checkout, payment, orders, profile, legal) | 2388 (مجموع) |
| `assets/js/components/*` (29 فایل) | کامپوننت‌های storefront (Header, Footer, ProductCard, ProductInfo, HeroSection, ...) | 2929 (مجموع) |
| `assets/js/utils/*` (17 فایل) | ابزارهای مشترک (escapeHtml, dom, deepMerge, priceFormatter, guestCart, ...) | 893 (مجموع) |
| `assets/js/admin/admin.js` | نقطه ورود پنل مدیریت | 94 |
| `assets/js/admin/branding.js` | اعمال نام/لوگو/متن به پنل | 58 |
| `assets/js/admin/pages/*` (13 فایل) | صفحات ادمین (dashboard, products, orders, discounts, settings, ...) | ~1900 (مجموع) |
| `assets/js/admin/components/VariantTable.js` | جدول واریانت‌ها | UNVERIFIED |
| `assets/js/libs/*` | کتابخانه‌های vendored (navigo, lucide, swiper, d3, persian-date) | — |
| `assets/css/input.css` | ورودی Tailwind v4 + theme | 480 |
| `assets/css/output.css` | خروجی build (committed) | UNVERIFIED |
| `assets/css/fonts.css` | تعریف فونت | UNVERIFIED |
| `assets/css/libs/swiper-bundle.min.css` | CSS سوئیپر | — |
| `index.html` | بدنه SPA فروشگاه | 613 |
| `admin.html` | بدنه پنل مدیریت | ~2900+ |
| `login.html` | صفحه ورود | UNVERIFIED |
| `result.php` | صفحه نتیجه پرداخت (PHP-rendered) | 78 |

### 1.2 مشترک vs تکراری

**مشترک (shared modules — هر دو سمت import می‌کنند):**
- `core/api.js` — کل لایه API
- `core/auth.js` — نشست
- `core/theme.js`، `config/bootstrap.js`، `core/storeSettings.js`، `utils/helpers.js`، `utils/priceFormatter.js`، `utils/htmlEscape.js`

**تکراری (duplicated):**
- `theme` به صورت جزئی در `admin.html:17-54` و `index.html:15-117` (CSS inline) و `result.php:18-25` تکرار شده.
- تعریف status map در `store.config.js:1643` (orderStatuses) و `utils/helpers.js:52-56` (DEFAULT_STATUS_MAP) — منبع دوم فقط هنگام نبود config است.
- `window.Router/state/api` هم در `app.js:36-41` و هم در `admin.js:15-16` ست می‌شود.
- عکس preview upload در `productList.js:129-138` (FileReader) — الگوی تکراری جزئی.

### 1.3 پایپلاین build

- `package.json:3-4` — فقط CSS: `npm run build:css` / `watch:css` با `@tailwindcss/cli`. هیچ bundler برای JS نیست؛ ماژول‌ها به صورت native ES modules `<script type="module">` لود می‌شوند.
- **Committed:** `assets/css/output.css`، تمام `assets/js/**`، `assets/js/libs/*` (کتابخانه‌ها vendored شده‌اند: navigo.min.js, lucide.min.js, swiper-bundle.min.js, d3.min.js, persian-date.min.js).
- **Generated:** فقط `output.css`. JS هرگز build/minify نمی‌شود.
- دپ سمت front `package.json:6-14`: tailwindcss, d3, lucide, navigo, persian-date, swiper — همه vendored در `libs/` بنابراین node_modules فقط برای CSS وجه است (d3 عملاً فقط برای admin dashboard استفاده می‌شود).

---

## 2. مدل رندر (Rendering Model)

### 2.1 روش رندر

**روش غالب: Template strings + innerHTML** (بدون virtual DOM، بدون web component استاندارد).

نماینده: `assets/js/components/ProductCard.js:31-49`:
```js
return `
  <a href="${href}" data-link class="group block iris-card ...">
    <div class="relative ${ui.productCardAspect} overflow-hidden bg-surface">
      ${outOfStock}
      ${renderImageWithFallback({ src: img, alt: p.name, ... })}
      ${renderProductCardOverlay({ name: p.name, ... })}
    </div>
  </a>`;
```
سپس در صفحه: `wrap.innerHTML = arr.map((p) => \`<div class="swiper-slide">${ProductCard.render(p)}</div>\`).join('')` — `pages/home.js:138`.

برخی کامپوننت‌ها از createElement استفاده می‌کنند: `helpers.js:15-30` (toast)، `dashboard.js:174-190` و `288-331` (چارت‌های vanilla). `productEditor.js:121`/`dashboard.js:73` هم innerHTML.

### 2.2 روتر (navigo — hash mode)

`core/router.js:98`: `new Navigo('/', { hash: true, strategy: 'ONE' })` — **hash routing** (`#/shop`).

| Route | data-page | اسم module | title |
|---|---|---|---|
| `/` | home | home | storeConfig.name |
| `/shop` | shop | shop | `فروشگاه \| {name}` |
| `/product` | product | products | storeConfig.name |
| `/categories` | categories | categories | `دسته‌بندی‌ها \| {name}` |
| `/cart` | cart | cart | `سبد خرید \| {name}` |
| `/checkout` | checkout | checkout | `تکمیل سفارش \| {name}` |
| `/payment` | payment | payment | `پرداخت \| {name}` |
| `/payment/result` | payment_result | payment-result | `نتیجه پرداخت \| {name}` |
| `/orders` | orders | orders | `سفارشات \| {name}` |
| `/profile` | profile | profile | `پروفایل \| {name}` |
| `/about`,`/contact`,`/terms`,`/privacy`,`/refund`,`/faq` | همنام | همان | `… \| {name}` |

گارد auth: `AUTH_ROUTES = ['/checkout','/payment','/orders','/profile']` — `router.js:8,55`؛ اگر لاگین نباشد → `login.html?redirect=index.html#...` (ری‌دایرکت مستقیم، بدون page module).
fallback بدون navigo: `_initFallbackRouter()` در `router.js:115-128`.

### 2.3 SSR / Prerendering: **هیچ‌کدام**

- `index.html` فقط یک اسکلت خالی است؛ همه content با JS ساخته می‌شود (DOMContentLoaded → `app.js:133-146`).
- خزنده با JS خاموش فقط می‌بیند: `<div data-page="home">` خالی + بخش‌های خالی (`hero-section`, `featured-section`, ...). حتی `<title>` در `index.html:9` خالی است.
- **product page با JS خاموش = صفحه سفید.** هیچ `noscript` هم وجود ندارد.
- تنها HTML سمت سرور، `result.php:1-78` است (نتیجه پرداخت، اسکالر سفارش_ID قدیمی).

### 2.4 SEO meta

- `<title>`: توسط `theme.js:49` (init) و `router.js:61` (pageTitle) و `product.js:111` (pageTitle(p.name)) ست می‌شود — همه سمت کلاینت.
- `meta description`: `router.js:62` فقط برای صفحات قانونی از `storeConfig.texts.legal.*.meta`؛ صفحه محصول/category **بدون** meta description.
- `canonical`: **وجود ندارد.** Open Graph tags: **وجود ندارند.** (هیچ فایلی تولیدشان نمی‌کند)
- `robots.txt`: UNVERIFIED (در گِرد assets پیدا نشد).
- `sitemap.xml`: UNVERIFIED (در ریپو پیدا نشد).

---

## 3. State و جریان داده

### 3.1 حالات سراسری

| State | محل سکونت | به‌روزرسانی | اشتراک |
|---|---|---|---|
| `cartCount` | `core/state.js:8` (حافظه) | `app.js:67` state.set | `events.on('cart:updated')` |
| `storeConfig` (نام، theme، texts) | `window.StoreConfig` — `bootstrap.js:14` | `mergeStoreSettings()` — `bootstrap.js:30` | import مستقیم از `bootstrap.js` |
| user (profile) | `localStorage['gb_user']` — `auth.js:34` | `auth.persistSession` — `auth.js:53` | `auth.getCurrentUser()` |
| role | `localStorage['gb_role']` — `auth.js:26` | `role.set` | `auth.role.isAdmin()` |
| guest cart | `localStorage['gb_guest_cart']` — `guestCart.js:20` | `guestCart.addItem/...` | — |

`core/state.js` خیلی ابتدایی است: چند فراخوانی عملاً به عنوان bus اضافه کار می‌کند؛ بیشتر کامپوننت‌ها از امپورت مستقیم `storeConfig` و callback استفاده می‌کنند.

### 3.2 لایه API — `core/api.js`

- **Base URL:** `api.js:14` → `API().baseUrl || 'api/v1'`. ساخت URL: `buildUrl` در `api.js:104-114` → نسبت به صفحه فعلی (`new URL(relative, pageBase)`).
- **Auth header:** `api.js:181-197` — فقط `Accept` و `Content-Type`؛ **بدون `Authorization` header**؛ توکن فقط via `credentials:'include'` (cookie) ارسال می‌شود.
- **Token refresh:** `api.js:212-222` — هنگام 401 به جز login/otp، `_tryRefresh()` روی `/auth/refresh` (cookie)؛ موفق → retry؛ ناموفق → `auth.clearSession()` + `emitUnauthorized()`.
- **Error mapping:** `mapResponse` (api.js:45)، `defaultMessage` (api.js:81)، کلاس `ApiError` با getterهای `.isAuth/.isValidation/.isRateLimit...` (api.js:16-43).
- **Cache/fallback:** `withFallback()` (api.js:245) برای `products.list/featured` و `categories.list` و `settings.get` — اگر شبکه/5xx/404 شد → `CFG().fallback.*`. عملاً caching واقعی (TTL/مموری) وجود ندارد.

### 3.3 محل ذخیره توکن

- **Access و Refresh tokens در JS ذخیره نمی‌شوند.** `core/auth.js:13-23`:
```js
export const token = { get: () => null, set: () => {}, remove: () => {} };
export const refreshToken = { get: () => null, set: () => {}, remove: () => {} };
```
مدل: **HttpOnly cookie** — `api.js:194` `credentials:'include'`؛ توکن‌ها فقط در مرورگر/cookie دیده می‌شوند (UNVERIFIED سمت کوکی: set-cookie در backend است).
- در localStorage فقط: `gb_role` (`auth.js:26-27`), `gb_user` (`auth.js:34-44`), `gb_guest_cart` (`guestCart.js:20`). `clearSession` امنیتی: کلیدهای قدیمی `gb_token`, `gb_refresh`, `access_token`, `refresh_token` را هم پاک می‌کند (`auth.js:68-71`) — سازگاری عقب.

---

## 4. Config و Theming (نقطه بحرانی multi-tenancy)

### 4.1 `store.config.js` — برچسب هر کلیدگروه

برچسب: **(a)** از API override می‌شود، **(b)** hard-coded در config، **(c)** generic.

| گروه | وضعیت | یادداشت |
|---|---|---|
| `name` | (a) | `bootstrap.js:33` ← `shop_name` |
| `contacts.*` | (a) | از `contact_phone/email` و socialها — `bootstrap.js:81-100` |
| `contactLinkMeta` | (c) | ثابت |
| `notificationBar.*` | (a) | `notification_enabled/text/bg_color/text_color` — `bootstrap.js:103-114` |
| `product.lowStockThreshold` | (b) | hard-coded (هیچ mapping در merge نیست) |
| `logo`, `logoVariants`, `favicon` | (a) | `shop_logo[_medium/_thumb]`, `shop_favicon` — `bootstrap.js:51-70` |
| `hero.*` | (a/partial) | `image|title` از API (`shop_hero_image`, `shop_name`)؛ `ctaPrimary/ctaSecondary/autoplayMs/speed` hard-coded (b) |
| `theme.*` (۹ کلید رنگ) | (b/a partial) | در API فقط **notification** رنگ‌ها می‌آید؛ **رنگ‌های اصلی (البته accent/dark) از API نمی‌آیند** — فقط در `store.config.js` است |
| `fonts.*` | (b) | فقط از config؛ هیچ mapping در `bootstrap.js` نیست |
| `shipping.*` | (a) | `min_order_amount`, `shipping_free_from`, `shipping_standard_cost` — `bootstrap.js:116-132` |
| `addresses.maxCount` | (b) | hard-coded |
| `data.iranLocations` | (c) | ثابت |
| `payment.*` | (a) | `bank_card/owner/method` — `bootstrap.js:120-122` + `paymentInfo` در `api.js:333` |
| `ui.*` (cardRadius, btnPrimary, toast colors, variant classes) | (b) | **کاملاً hard-coded**؛ هیچ mapping در merge نیست |
| `promoSlider.*` | (b) | hard-coded |
| `images.*` (presets) | (c/generic) | قراردادی برای variantهای تصویر |
| `carousel.featured.*` | (b) | hard-coded (curve metrics) |
| `auth.smsOtpEnabled` | (b) | hard-coded `false`؛ config اضافه دارد اما UNDERSERVED |
| `texts.*` (nav, UI labels, legal, admin) | (a/partial) | **متون user-facing عمدتاً (b)** hard-coded؛ فقط legal pages + footer از API می‌گیرد (`bootstrap.js:43-49, 38-40`)؛ `texts.nav`, `texts.product`, `texts.shop`، ... از API نمی‌آیند |
| `api.baseUrl` | (c) | ثابت |

### 4.2 Merge با defaults + رفتار خطا

- `bootstrap.js:30-145` `mergeStoreSettings(remote)` — **merge دستی، نه deepMerge کامل**: هر کلید جداگانه چک می‌شود. `deepMerge` فقط برای `texts.legal` (`bootstrap.js:44`) استفاده می‌شود.
- `utils/deepMerge.js:31` — پیاده‌سازی بازگشتی (UNVERIFIED جزئیات).
- اگر API fail شود: `storeSettings.js:11-13` فقط `console.warn`؛ runtime با `store.config.js` (fallback) کار می‌کند — سایت با هویت پیش‌فرض (RAR shop, قرمز) بالا می‌آید.

### 4.3 تعریف/اعمال رنگ، فونت، radius

- **Tailwind @theme**: `input.css:3-16` — `--color-*`، `--font-vazir/display/felipa`.
- **Semantic utils**: `input.css:18-52` — `.bg-body/.text-accent/...` همه از CSS variable می‌خوانند.
- **Runtime override**: `theme.js:7-17` `VAR_MAP` → `root.style.setProperty('--color-accent', ...)` + `document.body.style` (theme.js:45-47). radiusها و کلاس‌های ui **CSS variable ندارند** — اسم کلاس Tailwind هستند (`rounded-2xl`).

**رنگ‌های hard-coded (به‌جای variable):**
- `input.css:50` `.admin-table-head { background: var(--color-accent); color:#fff; }`
- `input.css:83-87` success green `#16a34a/#15803d`
- `input.css:94-143` `.btn-aluminum` گرادیان‌های خاکستری (`#fafafa,#e8e8ed,...`) — بوتون‌های aluminum کاملاً خارج از theme
- `input.css:153-159,175-178` `.btn-glass` rgba سفیدها
- `input.css:207` `.iris-card:hover box-shadow rgba(220,38,38)` — قرمز ثابت
- `input.css:212-219` `.product-card__gradient` نویسی black
- `input.css:364` mask `rgba(0,0,0,…)`
- `index.html:109` `rgba(0,0,0,0.4)` backdrop؛ `index.html:165-176` newsletter bg `#f5f5f7`/`black/10`
- `store.config.js:155` `cardHover: 'hover:shadow-[0_12px_40px_rgba(220,38,38,0.12)]'` — قرمز در اسم کلاس
- `helpers.js:161-167` toast palette هگز (از config اما در default هگز)
- `dashboard.js:206` `COLORS = [accent, accentHover, '#1d4ed8', '#7c3aed', '#15803d', muted]`

### 4.4 جریان لوگو/فاویکون/نام

**فروشگاه:** `theme.js:31-40` favicon از `storeConfig.faviconVariants`؛ `Header.js:9,31-32` لوگو+نام؛ بعد از `loadStoreSettings` در `app.js:134` همگام می‌شود.

**پنل ادمین:** `branding.js:16-56` `[data-store-name]`, `[data-store-logo]`, `[data-admin-text]` را پس از `applyAdminBranding()` پر می‌کند (`admin.js:86`).

**صفحه ورود:** `login.js:28-49` همان الگوی data-*.

### 4.5 برای «یک build با چند فروشگاه» چه لازم است (تغییرات با مسیر)

1. **رنگ‌ها از API** — کمترین تغییر: افزودن `theme.*` به پیلود `/settings` و map در `bootstrap.js` + `theme.js` قبلاً آماده است (`--color-accent`). (فایل‌ها: `api` backend — خارج از scope؛ front: `bootstrap.js:30`, `theme.js:7`)
2. **«همه رنگ‌های hard-coded #hex / rgba»** را به CSS var منتقل کن — لیست §4.3. به‌خصوص `.btn-aluminum`، `.btn-glass`، `.iris-card` shadow، toast، `cardHover` class در `store.config.js:155`. (فایل‌ها: `input.css`, `store.config.js`, `index.html`)
3. **فونت از API** — mapping `fonts.body/display` در `bootstrap.js` + بارگذاری پویا woff2 (اکنون `fonts.css` استاتیک است). فعلاً فقط `theme.js:27-29` مقدار را به var می‌ریزد؛ فایل فونت باید موجود باشد.
4. **radius/ui classها از API** — `ui.*` مقادیر کلاس Tailwind است، یعنی با build ثابت می‌شود؛ یا به یک مجموعه محدود enum تبدیل شود و در `store.config.js` با switch ست شود، یا به CSS var (`--radius-card`).
5. **متون داینامیک از API** — بزرگ‌ترین کار: `texts.nav`, `texts.home/shop/product/profile/checkout`, `texts.newsletter`, دکمه‌ها. اکنون `[data-admin-text]` و `[data-store-name]` فقط در admin/login هست؛ در storefront بخش‌های static در `index.html` (مثل `cart.js:66-70`, `payment.js:145`, `checkout.js:66`) hard-coded فارسی دارند.
6. **آسیب‌پذیری لوگو/favicon** — `theme.js:31-40` و `branding.js:44-51` لوگو را در `<img src>` می‌ریزند؛ اگر `shop_logo` از API کنترل شود، `javascript:` یا URL خارجی قابل سوءاستفاده نیست (img)، اما باید تمیز شود تا از `data:` هم جلوگیری شود.
7. **change ذخیره کامل** — pack config را در `store.config.js` به عنوان schema document نگه دار و «کدام کلیدها از API می‌آیند» را در `bootstrap.js` به یک نگاشت واحد تجمیع کن (حذف merge دستی ۱۵۰ خطی).

### 4.6 امکان ۳ layout انتخابی

**سختی: متوسط.** معماری component-base است، لذا ممکن است؛ اما دو مانع:
- `index.html` اسکلت همه صفحات را استاتیک دارد (`data-page=...`)؛ هر `data-page` حداقل یک root دارد. تغییر layout = رندر کامل innerHTML جایگزین (انعطاف‌پذیر) ولی شکستن اسکلت‌های سیستماتی مثل `#hero-section`, `#products-grid` که کل صفحه‌ها (`home.js:132-144`) به idهای خاص وصل‌اند → تغییر layout یعنی تغییر نام idها در BOTH html و JS.
- کلاس‌های Tailwind داخل templateهای JS (نه فقط output.css) هستند؛ layout-twadiff یعنی انتخاب‌های درشت‌تر class در `store.config.js` (مانند `ui.cardBase`).

**کوچک‌ترین طراحی کارا:**
1. یک `texts.templates` یا `config.layout = 'classic|curve|minimal'` در `store/API`.
2. یک فایل `components/layouts/registry.js` که `{ home: fn, productCard: fn, }.` برای هر نام layout دارد (مثل `FeaturedCarousel`/`CurveCarousel` از قبل دو variant دارند — `components/CurveCarousel.js` و `components/FeaturedCarousel.js`).
3. pageها به‌جای import مستقیم، از registry سؤال می‌کنند (`home.js:112` → `registry.resolve('home', config.layout)`).
4. تمام idهای پرکننده را ثابت نگه دار (جزء detail/JSON).

---

## 5. امنیت فرانت (XSS)

### 5.1 درج innerHTML/template بدون escape (داده کنترل‌شده کاربر/API)

الگو: کامپوننت‌های storefront تقریباً **هیچ‌جا** escape نمی‌کنند؛ `ProductCard.js:31-49` نام/قیمت/تصویر محصول را مستقیم در innerHTML می‌ریزد (نام محصول ← `name: p.name`)؛ `alt` هم از داده است. جاهای اصلی:

| فایل:خط | داده | وضعیت |
|---|---|---|
| `components/ProductCard.js:31-49` | p.name, p.price, p.id | بدون escape |
| `components/RelatedProductCard.js` | نام/قیمت محصول | بدون escape (UNVERIFIED دقیق) |
| `components/ProductInfo.js` (394 LOC) | name, description, price, variantLabels | بدون escape (UNVERIFIED دقیق) |
| `components/ProductGallery.js` | image urls, alt | بدون escape |
| `components/HeroSection.js:render` | slides (title از API) | بدون escape (UNVERIFIED دقیق) |
| `components/FeaturedCarousel.js` ، `FeaturedPosterCard.js` | محصول/پوستر | بدون escape |
| `components/ShopProductCard.js` ، `ShopSidebar.js` | محصول، نام facet | بدون escape |
| `components/OrderDetail.js` / `OrderRow.js` | اقلام سفارش، وضعیت | بدون escape (UNVERIFIED دقیق) |
| `pages/orders.js` ، `pages/profile.js` | آدرس‌ها، نام کاربر | بدون escape (UNVERIFIED دقیق — profile آدرس API دارد) |
| `pages/shop.js:…` | facet نام، category name | بدون escape (UNVERIFIED دقیق) |
| `app.js:43-51` (window.renderStars) | rating عددی | safe |
| `components/Header.js:16` | **nav link** (l.href از config، un-fetched) | config-controlled |
| `components/Header.js:20` | `user?.name || user?.phone` | **بدون escape** — user-controlled |

**escape شده (موارد معدود):**
- `pages/cart.js:33-36` — `escapeHtml(getCartDisplayName(item))` و variantLine ✓
- `pages/checkout.js:43-46` — `escapeHtml(...)` ✓، آدرس‌های ذخیره‌شده ✓ (خط 207-218)
- `admin/pages/products/productList.js:29,59-65` — category، name، slug ✓
- `utils/helpers.js:81-84` `statusBadge` — label از config ✓ (موارد admin)

### 5.2 آیا helper escape وجود دارد و سازگار استفاده می‌شود؟

- بله: `utils/htmlEscape.js:13-19` (escapeHtml/escapeAttr).
- **نه، سازگار نیست.** لایه کامپوننت‌های storefront (که داده API/user بیشتری دارند) عملاً از آن استفاده نمی‌کنند؛ فقط cart/checkout و admin productList. یعنی حملات اصلی (نام محصول با `<img onerror>`، توضیحات، پیام آدرس) **اجرا می‌شوند**.

### 5.3 ریسک ذخیره توکن و دستاورد XSS

- Access/refresh در **HttpOnly cookie** → XSS نمی‌تواند توکن را «بخواند»، اما **می‌تواند درخواست‌های authenticated بفرستد** (چون cookie خودکار ارسال می‌شود؛ `credentials:'include'` در `api.js:194`). پس هر XSS = فیش کامل روی حساب کاربر؛ در admin همان = تغییر محصول/وضعیت سفارش/تنظیمات (backedandler در `api.js`).
- `gb_user` و `gb_role` در localStorage (auth.js:26-44) توسط XSS قابل تغییرند → یک XSS می‌تواند `gb_role=admin` بنویسد؛ اما `admin.js:31-34` با `api.auth.validateSession()` (درخواست به `/auth/me` با cookie) احراز می‌کند، لذا نقش تقلبی بدون backend مجوزی کار نمی‌کند.

### 5.4 پنل ادمین — سمت کلاینت یا backend؟

- گارد ورود سمت کلاینت: `admin.js:31-34` — `validateSession()` + `api.auth.isAdmin()`؛ مردود → `location.replace('login.html')`. با این‌که بخشی کلاینت است، سد اصلی backend است (`/admin/*` routes → `api.js:352-357` etc. همه endpointهای `/admin/...` با رول backend محافظت می‌شوند).
- **بدون** مخفی‌سازی UI بر اساس نقش؛ صرفاً نمایش نام/لوگو.
- ریسک: `admin.html:56-63` toggleSidebar از inline onclick؛ `admin.html` همه صفحات را upfront-loaded میکند (بخش‌های page-* همگی در DOM هستند) — فقط visibility. چون endpointها backend-protectedاند، امن است.
- config `sms_enabled/sms_api_key` در `settings.js:215` به سرور ارسال شده و UI آن را نمایش می‌دهد؛ ست‌نیز دوباره در response قابلیت لو رفتن دارد — unverified.

---

## 6. فهرست ویژگی/صفحات

| صفحه/ویژگی | فروشگاه/ادمین | وضعیت | مسیر | یادداشت |
|---|---|---|---|---|
| Home | Storefront | PARTIAL | `index.html:131-180` + `pages/home.js:105-150` | hero, featured curve carousel، جدیدترین‌ها، promo poster؛ خبرنامه **disabled** (`index.html:165`) |
| Shop (list + filter) | Storefront | COMPLETE | `pages/shop.js:271` + `components/ShopSidebar.js` | فیلتر قیمت/size/color، load-more |
| Product detail | Storefront | COMPLETE | `pages/product.js:94` + `components/ProductInfo.js` | گالری، واریانت/سایز، add-to-cart/quickbuy، related |
| Categories | Storefront | PARTIAL | `pages/categories.js:23` | فقط درج Cat؛ بدون زیرکالانها |
| Cart | Storefront | COMPLETE | `pages/cart.js:110` | guest+user، discount، free shipping calc |
| Checkout | Storefront | COMPLETE | `page/checkout.js:353` | address form + saved، iran provinces json |
| Payment | Storefront | PARTIAL | `pages/payment.js:24` | از sessionStorage خوانده و redirect؛ هیچ callback نیست (دکمه online فقط redirect) |
| Payment result | Storefront | BROKEN/STUB | `pages/payment-result.js:31` + `result.php` | صفحه result در index.html فقط یک `#payment-result-container`؛ منطق اصلی در `result.php` است |
| Order tracking | Storefront | PARTIAL | `pages/orders.js:125` | list + status؛ جزئیات tracking زمان‌محور نیست |
| Account/Profile | Storefront | COMPLETE | `pages/profile.js:247` | آدرس CRUD، max 3 |
| Login/OTP | Storefront | COMPLETE | `login.js:424` | password+OTP (configable؛ smsOtpEnabled=false) |
| Search | Storefront | **BROKEN** | `Header.js:36-38` | آیکون search در هدر است ولی بدون handler — dead UI |
| Admin Dashboard | Admin | COMPLETE | `admin/pages/dashboard.js:31` | stats + D3/vannila charts |
| Admin Products (list) | Admin | PARTIAL | `admin/pages/products/productList.js:89` | list/search/filter؛ unlimited=100 خط `limit:100` |
| Admin Product edit | Admin | COMPLETE | `admin/pages/products/productEditor.js:318` | full-page editor + tabs |
| Admin Categories | Admin | COMPLETE | `admin/pages/categories.js` | UNVERIFIED دقیق؛ CRUD + images |
| Admin Variants | Admin | COMPLETE | `admin/components/VariantTable.js` + `tabs/variantsTab.js` | axes+generate+bulk update |
| Admin Orders | Admin | COMPLETE | `admin/pages/orders.js` | search/filter/status/receipt approve-reject |
| Admin Discounts | Admin | COMPLETE | `admin/pages/discounts.js` | cards CRUD |
| Admin Hero Slides | Admin | COMPLETE | `admin/pages/heroSlides.js` | upload/reorder |
| Admin Promo Banners | Admin | COMPLETE | `admin/pages/promoBanners.js` | upload/reorder |
| Admin Settings | Admin | COMPLETE | `admin/pages/settings.js:313` | 6 tabs، upload logo/hero/favicon، enamad، sms |
| Admin Pages (legal) | Admin | COMPLETE | `admin/pages/pages.js` | UNVERIFIED دقیق |
| Size Guides | Admin | STUB | `admin/pages/sizeGuides.js` + nav مخفی `admin.html:136-138` (comment) | تعریف شده ولی ورودی nav کد it OUT — غیرفعال |

---

## 7. کارایی و کیفیت

### 7.1 باندل/سایز/دپ‌های بلااستفاده

- **JS بدون bundling** → هیچ درخت‌لرزان/مرج‌کردن؛ هر `libs/*.min.js` در htmlload می‌شود: `index.html:607-609` navigo+lucide+swiper؛ admin از همان + `d3.min.js` و `persian-date.min.js`.
- **d3 روی storefront بارگذاری می‌شود؟** نه — در `index.html` نیست، فقط ادمین. اما **`persian-date.min.js` در admin.html** موجود است و admin از it استفاده نمی‌کند (فقط فایل در libs). UNVERIFIED actual use در admin/pages.
- `swiper-bundle.min.css` + `swiper-bundle.min.js` هر دو در storefront — لازم (carouselها).
- `output.css` یک filemin طرخ Tailwind دارد؛ swiper CSS جدا. حجم‌ها UNVERIFIED (بدون run).

### 7.2 تصاویر

- **بدون `loading="lazy"`** در هیچ‌یک از قالب‌های rendering (UNVERIFIED در Admin بیشتر؛ ProductCard ندارد). `renderImageWithFallback` (utils/imagePlaceholder.js) سرویس می‌کند.
- **srcset/picture/WebP:** `utils/imageUrl.js:87` variantها (`_large/_medium/_thumb`) را می‌سازد اما مینیاتورها در `<img src>` ساده استفاده می‌شوند؛ `srcset` فقط UNVERIFIED (maybe در ProductCard و ProductGallery؛ از ProductCard: نه). **source WebP: خیر.**
- `hero-fullbleed` object-cover، هرو در `HeroSection.js` (UNVERIFIED جزئیات lazy).

### 7.3 فونت

- `fonts.css` — فایل simpledef از woff2 محلی (Vazirmatn + Felipa)؛ `font-display: swap` UNVERIFIED؛ از CDN استفاده نمی‌شود (خوب). `Agbalumo` در `@theme` (`input.css:14`) است اما فایل فونت آن در `assets/fonts/` **نیست** (فقط Felipa + vazirmatn) → هرجا `font-display` استفاده شود fallback می‌آید (فقط هدر). Broken font-src.

### 7.4 Accessibility/RTL

- RTL: `dir="rtl"` در html ذاتی؛ کلاس‌های `flex-row-reverse` و margin-inline خوب اعمال شده؛ `dir="ltr"` برای عددها (phone, postal) درست.
- **داده‌شده‌ها:** عدم focus trap در modals (profile-address-modal, rejectReceiptModal — `admin.html:450-479`, `index.html:487-502`)، کلید Esc ندارد؛ `aria` sparse؛ `button` بدون label (search icon در `Header.js:36` فقط title دارد — بهتر است aria-label). `input` checkbox رنگ راست در سینتکسِ Tailwind `focus:ring-accent` فقط برای مورد.
- **هدر accessibility:** modalها focus/Trap ندارند — این را از کد مشخص است؛ گفتن "focus trap отсутствует" ok.

### 7.5 TODO/FIXME/dead code (top)

| # | فایل:خط | نوع |
|---|---|---|
| 1 | `Header.js:36-38` | **dead UI**: آیکون جستجو بدون handler (search نگه داشتن) |
| 2 | `index.html:164-179` | **disabled**: بخش newsletter `hidden`/aria-hidden — active false |
| 3 | `admin.html:136-138` | commented-out nav → sizeGuides؛ page فایل موجود است ولی غیرفعال |
| 4 | `productEditor.js:343-366` | `openProductEditor` legacy modal path — `useFullPage=true`؛ شاخه modal dead |
| 5 | `admin.js:31-34` | sessionOk guard — fetch `/auth/me` همیشه (همچنین با cookie) |
| 6 | `login.js` — debug_code نمایش OTP در dev (`login.js:253`)، در production باید حذف شود — security |
| 7 | `pages/payment.js:25-60` | `console.log` های دیباگ گسترده production (🟢📦) |
| 8 | `core/state.js` | كاملاً خالی؛ `state` بیشتر مجاز است تا ضرورت (فقط cartCount) |
| 9 | `auth.js:68-71` | پاک‌کردن کلیدهای قدیمی توکن — safe |
| 10 | duplicate status maps | `store.config.js:1643` vs `helpers.js:51-56` |

---

## 8. قدم‌های پیشنهادی بعدی (اولویت)

| # | کار | تلاش | ریسک | توضیح |
|---|---|---|---|---|
| 1 | **رنگ‌ها از API** (افزودن theme block به settings + map در `bootstrap.js`/`theme.js`) | S | کم | زیرساخت آماده است (`theme.js:7`). لازمه multi-tenancy |
| 2 | **نقشه واحد merge** در `bootstrap.js` جایگزین دستی ۱۵۰ خطی + schema در `store.config.js` | M | متوسط | همه کلیدهای (b) در §4.1 قابل mapping می‌شوند |
| 3 | **escape سراسری** در کامپوننت‌های storefront (ProductCard, ProductInfo, Hero, Orders, Profile) | M | متوسط | XSS واقعی؛ `htmlEscape` از قبل هست |
| 4 | **حذف hard-coded colors/classes** از CSS/JS (btn-aluminum, toast, cardHover, shadows) به CSS var | M | کم | §4.3 کامل |
| 5 | **SSR/prerender برای product page** — انتخاب: **بله، رندر شل بلافاصله** سبک| S/M | کم | ارزان‌ترین: یک `product.php` که با PHP محصول را fetch کرده و HTML کامل + OG/meta/canonical برگرداند (مثل `result.php` که PHP است). بدون node server. با JS فعال، SPA load و Navigation به همان روت hash برمی‌گردد. |
| 6 | **canonical + OG + meta description داینامیک** در router (`router.js:61-63`) برای shop/product pageها + robots.txt + sitemap.xml | S | کم | SEO — سریع قابل افزودن در `theme.js` |
| 7 | **متون UI فروشگاه از API** (nav, home, shop, product, newsletter, checkout) | L | متوسط | حجیم؛ با schema در `store.config.js` |
| 8 | **layout registry برای ۳ قالب** (home + product card variants) | M | متوسط | §4.6 — بدون تغییر کل اسکلت |
| 9 | **لود فونت‌های داینامیک** (fontFace API یا preload از settings) | S | کم | `frame` فونت از API |
| 10 | **پاکسازی dead code** (search btn، newsletter، size-guide nav، legacy modal، console.log در payment/login) | S | کم | حذف `#` از HTML لزوماً تغییر API نیست |

**نتیجه‌گیری SEO:** این پلتفرم امروز برای سئو **نامرئی** است — اسکلت خالی + hash router + بدون SSR/canonical/OG → موتورهای جستجو محصولات را ایندکس نمی‌کنند. SSR یا handful prerender برای product/category بالاترین اولویت است، در این stack (PHP) ارزان تمام می‌شود: یک فایل `product.php`-مانند به سبک `result.php` که index/OG/canonical کامل تولید کند.

---

### خلاصه (برای چت)
- **Rendering:** SPA با navigo hash-روتر؛ همه صفحات تمپلیت‌کمپوننت + innerHTML (نه web component/VDOM). هیچ SSR؛ با JS-off خزنده یک صفحه سفید بدون `<title>` می‌بیند.
- **Token:** access/refresh فقط HttpOnly cookie (`auth.js` هست null-stubs؛ ارسال با `credentials:'include'`). localStorage فقط برای role/user/guest-cart.
- **Blocker theme:** رنگ/فونت/radius همگی hard-coded در input.css و قالب‌های JS (و اسم کلاس‌های ui در `store.config.js`)؛ تنها theme override از API نیست؛ اسکلت innerHTML idها و کلاس‌ها در همه‌جا در هم تنیده‌اند.
- **XSS:** هیچ escape در کامپوننت‌ها؛ هشت نقطه نامطمئن؛ cookie توکن و `credentials:include` یعنی XSS = تحویل کامل نشست.
- **SEO:** شکست کامل — بدون SSR/canonical/OG/sitemap/robots؛ ارزان‌ترین راه: `product.php` به سبک `result.php`.

**Kанدد**: همه موارد بالا را به فارسی در FRONTEND_MAP.md نوشتم.