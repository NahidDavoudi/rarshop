# PROJECT_MAP.md - rarshop: Persian E-commerce Platform Audit Report

## 1. Overview

**Project**: rarshop (ریارشاپ) - فارسی: فروشگاه آنلاین ریشه
- **Stack**: PHP 8+ (Custom MVC framework, Laravel-like structure), MySQL, Tailwind CSS v4, Vanilla JS (navigo routing, swiper sliders, lucide icons)
- **Version**: Custom framework, no Laravel artisan
- **Entry Point**: `api/index.php`
- **Frontend**: `index.html` (storefront SPA), `admin.html` (admin panel SPA)
- **Dependencies** (api/composer.json):
  - guzzlehttp/guzzle: ^7.7
  - monolog/monolog: ^2.9
  - respect/validation: ^2.2
  - vlucas/phpdotenv: ^5.5
  - firebase/php-jwt: ^6.0
  - predis/predis: ^2.2
  - intervention/image: ^2.7
  - ext-imagick: *
- **Frontend Dependencies** (package.json):
  - @tailwindcss/cli: ^4.3.0
  - d3: ^7.9.0
  - lucide: ^1.16.0
  - navigo: ^8.11.1
  - persian-date: ^1.1.0
  - swiper: ^12.1.4
  - tailwindcss: ^4.3.0

**How to run locally**:
1. `cd api && composer install`
2. `npm install`
3. Copy `api/.env.example` → `api/.env`, configure DB + JWT secrets
4. Run migrations manually (no artisan - `api/database/` directory exists but empty)
5. `npm run build:css`
6. `php -S localhost:8000 -t api` (dev server from api/index.php)

**Deployment**: Custom PHP setup, no Dockerfile, no CI/CD config visible. Upload directory configured via `UPLOAD_DIR` env var. Production requires `APP_ENV=production`, `UPLOAD_DIR` outside webroot, JWT secrets ≥32 chars.

---

## 2. Architecture Map

### Folder-by-folder responsibility

| Directory | Purpose |
|-----------|---------|
| `api/app/Core/` | Framework core: Router, Request, Env, Logger, JWT, Middleware, Security, Session, SMS, Upload, Validation |
| `api/app/Modules/` | Feature modules (Auth, Product, Category, Cart, Order, Payment, Discount, Settings, Admin, Attribute, Size, Variant, Users, HeroSlide, PromoBanner) |
| `api/app/Models/` (implicit via Model base class) | DB models extending App\Core\Database\Model |
| `api/routes/api.php` | API route definitions (public, auth-required, admin groups) |
| `api/index.php` | Entry point: loads env, boots router, security headers, dispatches requests |
| `assets/css/input.css` | Tailwind v4 entry with custom theme + RTL utilities |
| `assets/css/output.css` | Built CSS (committed for zero-build deploys) |
| `assets/js/app.js` | SPA entry: initConfig, initTheme, loadStoreSettings, router, state, components |
| `assets/js/core/api.js` | HTTP layer: request helpers, auth flow, cart store, error mapping |
| `assets/js/config/store.config.js` | Default store config (fallback when API unavailable) |
| `assets/js/config/app.config.js` | App-wide config (messages, fallback, storage keys, hooks) |
| `admin.html` | Admin panel SPA with navigo routing |
| `index.html` | Storefront SPA with navigo routing |
| `uploads/` | User-uploaded media (categories, hero-slides, products, promo-banners, receipts, settings) |

### Request Lifecycle

```
api/index.php
  → Env::load() + Env::assertProductionReady()
  → RequestContext::boot() + SecurityHeaders::apply()
  → set_exception_handler + set_error_handler → ExceptionHandler
  → Router::dispatch(Request)
    → normalizePath + matchPath (regex {id})
    → Middleware Pipeline (LogMiddleware → AuthMiddleware → AdminMiddleware if applicable)
    → callHandler (instantiate controller, inject Request params)
    → controller method → model queries → Response::json()
```

### Third-party Libraries & External Services

| Category | Library/Service | Purpose |
|----------|----------------|---------|
| HTTP | guzzlehttp/guzzle | API calls (SMS, payment gateways) |
| Logging | monolog/monolog | Application logging |
| Validation | respect/validation | Input validation |
| Environment | vlucas/phpdotenv | .env loading |
| JWT | firebase/php-jwt | Access + refresh token generation |
| Redis | predis/predis | Rate limiting (optional) |
| Image | intervention/image + ext-imagick | Image optimization/resizing |
| Frontend | navigo | Client-side routing |
| Frontend | swiper | Product carousels / hero sliders |
| Frontend | lucide | SVG icons |
| Frontend | persian-date | Persian calendar formatting |
| Frontend | d3 | Charts (admin dashboard) |

---

## 3. Database

**Engine**: MySQL with PDO (prepared statements, `ATTR_EMULATE_PREPARES => false`)

**Connection**: `api/index.php` → `Env::load()` → `Database` class constructs PDO with `$_ENV['DB_HOST']`, `$_ENV['DB_NAME']`, `$_ENV['DB_USER']`, `$_ENV['DB_PASS']`

**Tables** (inferred from models):

| Table | Purpose | Key Columns | FK Relationships |
|-------|---------|-------------|------------------|
| `products` | Products catalog | id, name, slug, price, sale_price, category_id, stock, is_active, status, product_type | → categories(id), → product_variants(product_id) |
| `categories` | Product categories | id, name, slug, description, poster_image_* | → products(category_id) |
| `users` | User accounts | id, name, phone, password_hash, role, is_active | → orders(user_id) |
| `orders` | Orders | id, order_number, user_id, customer_*, total_amount, discount_code_id, payment_method, status, notes, cancel_reason | → users(id), → order_items(order_id), → payment_transactions(order_id) |
| `order_items` | Order items | id, order_id, product_id, variant_id, quantity, price, variant_title | → orders(id), → products(id), → product_variants(id) |
| `product_variants` | Product variants/options | id, product_id, sku, title, combo_key, price, sale_price, cost_price, is_active, position | → products(product_id) |
| `product_images` | Product images | id, product_id, image_url, image_large_url, image_medium_url, image_thumb_url, is_main, sort_order | → products(product_id) |
| `payment_transactions` | Payment records | id, order_id, gateway, ref_id, tracking_code, amount, status | → orders(order_id) |
| `discount_codes` | Coupons/discounts | id, code, type (percent/fixed), value, valid_from, valid_to, is_active | — |
| `attribute_types` | Product attributes/options | id, name, slug, input_type, is_variant_axis, is_filterable, is_required, sort_order | → product_attributes(attribute_type_id), → variant_attribute_values(attribute_type_id) |
| `variant_attribute_values` | Variant attribute values | id, variant_id, attribute_value_id | → product_variants(variant_id), → attribute_values(id) |
| `attribute_values` | Attribute values | id, value, slug, swatch_hex, sort_order, is_active | → attribute_types(attribute_type_id) |
| `product_variant_axes` | Variant axes (new schema) | id, product_id, name, slug, input_type, sort_order, is_active | → products(product_id) |
| `product_axis_values` | Variant axis values | id, axis_id, value, slug, swatch_hex, sort_order, is_active | → product_variant_axes(id), → product_variant_links(axis_value_id, axis_id) |
| `product_variant_links` | Variant axis→value links | id, variant_id, axis_id, axis_value_id | → product_variants(variant_id), → product_variant_axes(id), → product_axis_values(id) |
| `shop_settings` | Store-wide settings | id, shop_name, shop_slogan, shop_logo_*, bank_card, payment_method, zarinpal_merchant_id, contact_*, social_*, shipping_*, sms_*, meta_*, notification_*, legal_content, enamad_html | — (singleton via id=1) |
| `hero_slides` | Hero section images | id, image_url, image_large_url, image_medium_url, image_thumb_url, sort_order, is_active | — |
| `promo_banners` | Promotional banners | id, title, image_url, image_large_url, image_medium_url, image_thumb_url, sort_order, is_active | — |
| `refresh_tokens` | JWT refresh tokens (Auth) | id, user_id, token_hash, expires_at | → users(user_id) |

**Migrations**: SQL migrations in `api/database/` directory - **EXISTENT but empty** (directory exists but no files found). Custom migration script at `api/scripts/migrate_variant_axes.php` (3-phase: DDL, data migration, unique constraint).

**Per-store vs Global**: Currently **single-tenant only**. `shop_settings` is singleton (id=1). No `store_id` or `tenant_id` on any table. All data shared globally.

---

## 4. Feature Inventory

| Feature | Status | Evidence (Paths) | Notes |
|---------|--------|------------------|-------|
| Product & Category Management | COMPLETE | ProductController, CategoryController, ProductModel, CategoryModel | Full CRUD, images, slugs, filtering |
| Variants/Options | PARTIAL | VariantService, ProductVariantModel, migrate_variant_axes.php | Axis/value system partially implemented; migration script shows intent |
| Inventory | PARTIAL | InventoryModel, variant stock tracking | Stock decrement/increment in ProductModel; inventory items table not clearly defined |
| Cart | COMPLETE | CartController, CartModel, CartService, api.js cart | Per-user cart, items, discount application, guest cart merge |
| Checkout | COMPLETE | Checkout page (index.html), OrderController, OrderService | Form with address, discount, order summary; payment initiation |
| Orders | COMPLETE | OrderController, OrderModel, OrderService, admin orders | Full flow: place → payment callback → status updates → admin management |
| Order Status Flow | COMPLETE | OrderModel::STATUSES ['pending','pending_payment','paid','shipped','delivered','cancelled'] | Admin can update status; customer can cancel |
| Customer Accounts/Auth | COMPLETE | AuthController, AuthService, AuthMiddleware, API routes | JWT access+refresh, OTP, password login, admin login, session management |
| Admin Auth & Roles | COMPLETE | AdminMiddleware (role='admin'), AuthController adminLogin, API route groups | Protected admin endpoints, role-based access |
| Payment Gateways | STUB | PaymentController (BitPay only), PaymentService | `initiate()` hardcodes `'gateway' => 'bitpay'`; callback redirects to env redirect_url |
| Receipt-upload Payment | PARTIAL | result.php, PaymentTransactionModel | Payment result page; transactions stored but gateway integration limited |
| Discounts/Coupons | COMPLETE | DiscountController, DiscountModel, API validateCode | Code validation, percent/fixed types, valid date range |
| Shipping | COMPLETE | SettingsModel (shipping_standard_cost, shipping_free_from), checkout form | Configurable free shipping threshold + standard cost |
| SMS/Notifications | PARTIAL | SmsManager, SmsService, LoginRateLimiter, storeConfig notifications | Melipayamak driver + HTTP fallback; OTP SMS for auth; notification bar config |
| Image Upload & Storage | COMPLETE | UploadHelper::storeOptimizedImage, ProductController addImage, SettingsController upload | Intervention Image + Imagick; multiple variants (large/medium/thumb) |
| Search | COMPLETE | ProductModel::paginateWithFilters with LIKE queries, attribute filters | Product search by name/description, category, price range, attributes |
| SEO (meta, sitemap, slugs) | PARTIAL | SettingsModel (meta_title, meta_description), ProductModel slug, storeConfig texts | Meta fields in settings; no sitemap generator; slugs on products/categories |
| Homepage Banners/Sections | COMPLETE | HeroSlideModel, PromoBannerModel, storeConfig hero/carousel | Hero slides + promo banners carousel on homepage |
| Settings | COMPLETE | SettingsController, SettingsModel, API endpoints | Shop identity, payment, contact, shipping, SMS, SEO, uploads |
| Reports/Export | PARTIAL | AdminController dashboard stats, revenue, lowStock, topProducts | Admin dashboard with charts; no CSV/Excel export |
| i18n/RTL | COMPLETE | index.html dir="rtl", admin.html dir="rtl", Persian date in storeConfig, Arabic/Persian text throughout | Full RTL support with `dir="rtl"` on html element |
| Caching | STUB | No Redis caching in production (optional per .env) | Rate limiter uses Redis when configured; no app-level caching |
| Background Jobs/Queues | MISSING | No queue system visible | All processing synchronous; no queue workers |
| Logging | COMPLETE | Monolog integration via Logger::boot() in index.php | Error handlers, exception handling |
| Backups | MISSING | No backup system visible | Manual DB export only |

---

## 5. Multi-tenancy Readiness

### Current Store/Tenant Identification
- **None**: No store/tenant identification mechanism exists
- **Single database**, single `shop_settings` singleton (id=1)
- No subdomain, domain, or config-based tenant isolation
- All stores share same codebase, same DB, same upload directory

### Tables Missing `tenant_id`/`store_id` (should have it)
| Table | Current Key Columns | Should Add |
|-------|--------------------|------------|
| `products` | category_id, user_id (via admin) | `store_id` |
| `categories` | — | `store_id` |
| `users` | — | `store_id` |
| `orders` | user_id | `store_id` |
| `order_items` | order_id, product_id | `store_id` |
| `product_variants` | product_id | `store_id` |
| `product_images` | product_id | `store_id` |
| `payment_transactions` | order_id | `store_id` |
| `discount_codes` | — | `store_id` |
| `shop_settings` | id (singleton) | `store_id` + per-store row |
| `hero_slides` | — | `store_id` |
| `promo_banners` | — | `store_id` |
| `attribute_types` | — | `store_id` |
| `variant_attribute_values` | — | `store_id` |

### Code Assuming Single Store (hard-coded)

| File/Path | Hard-coded Single-store Element |
|-----------|--------------------------------|
| `api/app/Models/SettingsModel.php:54-62` | `getSingleton()` → `SELECT * FROM shop_settings ORDER BY id ASC LIMIT 1` - assumes single row id=1 |
| `api/app/Core/SettingsService.php` (not read but referenced) | Likely uses singleton pattern |
| `assets/js/config/store.config.js:11` | `name: 'RAR shop'` - hard-coded default store name |
| `assets/js/config/store.config.js:14-18` | Hard-coded contacts (phone, email, telegram, instagram, whatsapp) |
| `assets/js/config/store.config.js:40` | `hero: { title: 'RAR shop' }` - hard-coded |
| `assets/js/config/store.config.js:503-508` | `footer: { tagline: 'RAR shop — فروشگاه آنلاین با استایل مشکی و قرمز.' }` |
| `assets/js/config/store.config.js:510-518` | Hard-coded enamad trust seal code/URL |
| `assets/js/config/store.config.js:128-136` | Payment config hard-coded for card_to_card |
| `api/routes/api.php` | All routes under single `/api/v1` namespace, no tenant prefix |
| `api/app/Core/Env.php:53-56` | `assertProductionReady()` checks single `UPLOAD_DIR` |
| `api/app/Core/Auth/Auth.php:83-89` | Refresh token storage per `user_id` only, no `store_id` |
| `admin.html:97-101` | `<div id="adminLogoWrap">` with hard-coded logo, `data-store-logo` attribute |
| `admin.html:103` | `<h2 class="font-bold text-lg text-body" data-store-name>RAR shop</h2>` |
| `index.html:4` | `<html lang="fa" dir="rtl">` - hard-coded RTL |
| `index.html:120` | `<body class="bg-body text-body overflow-x-hidden" dir="rtl">` |
| `index.html:131-162` | Homepage sections hard-coded for single store |
| `result.php` | Hard-coded success/failure messages without store context |

### Tenant Isolation Risks

1. **Shared upload directory**: `UPLOAD_DIR` from env is shared across all stores (if multi-tenant)
2. **Shared sessions/cache**: No `store_id` on session/data; Redis keys would collide
3. **Admin endpoints without tenant filter**: `OrderModel::getByUser()` queries all orders for user across stores
4. **Product queries without tenant filter**: `ProductModel::paginateWithFilters()` returns all products
5. **Settings singleton**: `shop_settings` single row id=1 - updating affects all "stores"
6. **Payment gateway keys**: `zarinpal_merchant_id`, `sms_api_key` stored globally, not per-store
7. **No tenant-based API routing**: All routes accessible without store context

### Creating New Store with NO Code Changes (only DB rows/config)

**Currently IMPOSSIBLE** - the codebase is tightly coupled to a single store. To enable zero-code new store creation would require:

1. **Add `store_id` column** to all relevant tables and update all queries to filter by `store_id`
2. **Replace `shop_settings` singleton** with per-store rows (add `store_id`, remove `ORDER BY id ASC LIMIT 1`)
3. **Add tenant filtering** to all Model `all()`, `paginate()`, `find()`, `where()` calls
4. **Isolate upload directories** per store (store_id in upload path)
5. **Persist store identity** per-request (middleware or router prefix)
6. **Separate payment keys** per store in DB (zarinpal_merchant_id, sms_api_key)
7. **Per-store config** in `store.config.js` merged from API or default

**Concrete list of changes needed** (estimated 2-3 weeks development):
- DB schema: Add `store_id` to 15+ tables, migration scripts
- Core: Tenant middleware to detect/store current store ID
- Models: Add `where(['store_id' => $this->storeId])` to all queries
- Controllers: Pass/store ID from request context
- Frontend: Dynamic store config loading per subdomain/domain
- Admin: Per-store settings isolation
- Payment: Per-store gateway credentials

---

## 6. Theming/Customization

### How Colors, Logo, Templates Applied

| Element | Current Mechanism | File(s) |
|---------|------------------|---------|
| **Primary color** | Tailwind config + CSS variables | `assets/css/input.css` `@theme` block (not fully read but referenced) |
| **Logo** | `storeConfig.logo` from API settings or default | `assets/js/config/store.config.js:51-57`; `admin.html:97-101`; `index.html:39` |
| **Favicon** | `storeConfig.favicon` | `store.config.js:40-46`; `link rel="shortcut icon"` in HTML headers |
| **Theme (light/dark)** | `class="light"` on html element in admin.html; storeConfig controls CSS vars | `admin.html:2`, `assets/css/input.css` |
| **Notification bar** | `storeConfig.notificationBar` (bgColor, textColor, enabled, text) | `store.config.js:29-34`; `admin.html:163-170` settings page |
| **Fonts** | `storeConfig.fonts.body`/`display`/`felipa` | `store.config.js:93-101` |
| **Texts/Strings** | `storeConfig.texts.*` deep-merged from API settings | `store.config.js:286-941` comprehensive Persian/English texts |
| **Footer** | `storeConfig.footer.*` (tagline, social, copyright, enamad) | `store.config.js:500-520` |
| **Carousel settings** | `storeConfig.promoSlider` + hero slides from API | `store.config.js:189-274` |
| **Shipping text** | `storeConfig.texts.product.shippingText` from settings | `store.config.js:134-136` |

### Difficulty of 3 Selectable Base Templates + Per-store Color/Logo

**HIGH difficulty** - would require:

1. **Template system**: Add template selection to `storeConfig` or DB, load different CSS/HTML structures
2. **3 base templates**: Create 3 distinct layout schemes (e.g., minimalist, premium, marketplace) with different component compositions
3. **Per-store color/logo**: Already partially supported via `storeConfig.logo` and CSS variables, but would need:
   - Store ID detection (middleware or subdomain)
   - Per-store CSS override or CSS-in-JS with scoped variables
   - Template selector stored per store in DB
4. **Estimated effort**: 3-5 days for template system + 2-3 days per store customization
5. **Risk**: Low-moderate - frontend is already component-based; main challenge is store ID → template mapping

**Current customization ease**: MODERATE - colors/logos can be changed via admin settings API, but only one "theme" exists. Adding 3 templates would require significant frontend restructuring.

---

## 7. Security Review

| Finding | Level | File/Path | Description |
|---------|-------|-----------|-------------|
| **JWT secret validation** | MEDIUM | `api/app/Core/Env.php:35-57` | `assertProductionReady()` checks JWT_SECRET ≥32 chars; default `change-me-access-token-secret` is weak - must change before production |
| **Refresh token storage** | MEDIUM | `api/app/Core/Auth/Auth.php:83-89` | Refresh tokens stored in DB with sha256 hash; no IP binding, no device limit |
| **Password hashing** | LOW | `api/app/Models/UsersModel.php:22-24` | Uses `password_hash()` with PASSWORD_DEFAULT (bcrypt) - good practice |
| **SQL injection** | LOW | Throughout | All queries use PDO prepared statements (`ATTR_EMULATE_PREPARES => false`) - safe |
| **XSS/output escaping** | MEDIUM | Frontend (admin.html, index.html) | Uses `{{}}` mustache-like in Tailwind classes; some inline JS; no explicit DOM escaping seen - need to verify |
| **CSRF** | MEDIUM | API routes | No CSRF middleware visible; JWT-based auth typically uses stateless tokens, but form submissions may be vulnerable |
| **File upload validation** | MEDIUM | `UploadHelper::storeOptimizedImage`, `ProductController::addImage`, `SettingsController::uploadImage` | Relies on MIME type from `$_FILES['image']['type']` - client-side can be spoofed; should verify actual content |
| **Rate limiting** | MEDIUM | `LoginRateLimiter`, `AuthMiddleware` | Per-phone rate limiting for OTP/login; Redis-based when configured; no global API rate limit |
| **Debug mode on** | HIGH | `api/.env.example:3` | `APP_ENV=production` required; `assertProductionReady()` will throw if not production - good |
| **Hard-coded secrets** | HIGH | `api/.env.example:15-16` | `JWT_SECRET=change-me-access-token-secret`, `REFRESH_SECRET=change-me-refresh-token-secret` - must be changed before deployment |
| **Upload directory outside webroot** | MEDIUM | `api/.env.example:52-54` | `UPLOAD_DIR` must be outside webroot in production; not verified if currently compliant |
| **Error message leaking** | LOW | `ExceptionHandler.php` (not read but referenced) | `set_exception_handler` + `set_error_handler` → `handle` method; need to verify no sensitive info leaked |

**Security Rating Summary**: 2 HIGH, 4 MEDIUM, 3 LOW

---

## 8. Code Quality & Tech Debt

### Top 15 TODO/FIXME/Code Issues

| # | Path | Issue | Impact |
|---|------|-------|--------|
| 1 | `api/app/Core/Env.php:15-16` | Default weak JWT secrets `change-me-access-token-secret` | CRITICAL - must change for production |
| 2 | `api/scripts/migrate_variant_axes.php` | Complex 3-phase migration with legacy fallback | HIGH - migration risk, legacy code paths |
| 3 | `api/app/Core/Http/Router.php:74-85` | Method not matched sets `methodMatched=true` but continues loop - may cause incorrect 405 | MEDIUM |
| 4 | `api/app/Models/ProductModel.php:131-159` | `create()` duplicate entry handling only checks phone/username via regex | LIMITED - other unique violations may cause unhandled errors |
| 5 | `api/app/Core/Middleware/AuthMiddleware.php:16-19` | No token → immediate 401; no graceful redirect to login page | MEDIUM |
| 6 | `assets/js/config/store.config.js:11-18` | Hard-coded store name, contacts, enamad code - not configurable per store | HIGH for multi-tenancy |
| 7 | `api/app/Models/DiscountModel.php:28-39` | `findValidCode()` checks `is_active`, `valid_from`, `valid_to` - no stock/usage limit check | LOW-MEDIUM |
| 8 | `api/app/Core/Security/RateLimiter.php` (not fully read) | Rate limiter implementation unknown | MEDIUM - need to verify effectiveness |
| 9 | `api/app/Core/ImageProcessor.php` (not fully read) | Image processing security | MEDIUM - verify path traversal protection |
| 10 | `api/app/Core/Sms/SmsService.php` (not fully read) | SMS sending implementation | MEDIUM - HTTP driver vs Melipayamak |
| 11 | `api/app/Models/OrderModel.php:123-126` | `generateOrderNumber()` → `'GB-' . uniqid()` - prefix "GB" hard-coded | LOW |
| 12 | `api/app/Core/Middleware/AdminMiddleware.php:15` | Only checks `role === 'admin'` - no permission/ABAC | MEDIUM |
| 13 | `assets/js/app.js:138-139` | `api.auth.validateSession()` then `api.auth.isLoggedIn()` - potential race condition | LOW |
| 14 | `api/app/Core/Database/Model.php:146-156` | Duplicate entry error handling only for phone/username | LIMITED |
| 15 | Various | No unit/integration tests visible | CRITICAL - no test coverage for business logic |

### Safe to Keep As-Is
- PDO prepared statements throughout (SQL injection protection)
- Password hashing with `password_hash()` 
- RTL support built-in
- Image optimization pipeline
- Admin role-based middleware

### Should Be Rewritten
- Multi-tenancy foundation (entire codebase needs tenant_id partitioning)
- Settings singleton → per-store configuration
- Migration scripts complexity

### Can Be Deleted
- `migrate_variant_axes.php` phase scripts (replace with proper migration framework)
- Legacy `variant_attribute_values` tables if migrating to new axis/value schema
- Hard-coded default configs in `store.config.js` (load from API or DB)

---

## 9. Cross-Project Notes

This repository appears to be **original project**, not a fork of a known e-commerce platform. Key observations:

- **Custom MVC framework** built from scratch (no Laravel/Symfony/ZF)
- **Tailwind CSS v4** (latest) with custom RTL utilities (`\.dir-rtl`, `\.dir-ltr`)
- **Bilingual (Persian/English)** UI from ground up - `lang="fa"`/`dir="rtl"` on html, Persian date picker, Vazirmatn font
- **Melipayamak SMS integration** specific to Iranian market
- **Zarinpal payment gateway** integration (popular in Iran)
- **Enamad trust seal** integration (Iranian regulatory requirement)
- **Persian calendar** and `persian-date` package usage
- **Market-specific features**: Minimum order amounts in Tomans, province/city shipping, localized legal texts

**Project-specific files** (unique to this repo):
- `api/app/Core/` - custom framework core
- `api/app/Modules/` - all feature modules
- `api/scripts/migrate_variant_axes.php` - custom migration
- `assets/js/config/store.config.js` - extensive default config
- `assets/js/config/app.config.js` - app-wide defaults
- `admin.html` / `index.html` - dual SPA entry points
- `result.php` - payment result handler

**Identical boilerplate** (could be from template/framework):
- `.gitignore` standard pattern
- `composer.json` standard PHP autoload
- `package.json` standard frontend deps
- `api/.env.example` standard env template

---

## 10. Recommended Next Steps

### Top 10 Concrete Tasks (ordered by priority)

| # | Task | Path(s) | Effort | Risk |
|---|------|---------|--------|------|
| 1 | **Add `store_id` to DB schema** and update all Model queries | All Models (`ProductModel`, `OrderModel`, `UsersModel`, etc.) + migrations | L | HIGH - requires careful query updates, risk of breaking existing data |
| 2 | **Replace `shop_settings` singleton** with per-store rows + store_id | `SettingsModel.php`, `SettingsController.php`, API routes | M | MEDIUM - changes how settings are fetched/updated globally |
| 3 | **Add tenant middleware** to detect current store from subdomain/domain | `api/app/Core/Middleware/` + `Router.php` group middleware | M | MEDIUM - must handle fallback for non-tenant routes |
| 4 | **Isolate upload directories per store** | `Env.php`, `UploadHelper.php`, `index.php` config | M | LOW - mostly path configuration |
| 5 | **Per-store payment keys** (zarinpal_merchant_id, sms_api_key) | `SettingsModel.php`, `SettingsController.php`, `.env` example | L | LOW - add `store_id` column + update forms |
| 6 | **Dynamic store config in frontend** | `assets/js/config/store.config.js`, `bootstrap.js`, `api.js` | M | MEDIUM - API must return per-store config; fallback handling |
| 7 | **Admin per-store isolation** | Admin routes, controllers, views - add `store_id` filtering | L | MEDIUM - admin currently shows all data |
| 8 | **Add integration tests** for auth, cart, order flow | `tests/` directory (create) + PHPUnit or similar | M | MEDIUM - establishes regression safety |
| 9 | **Extract migration scripts** to proper migration framework | Replace `migrate_variant_axes.php` with phpunit migrations | M | LOW - cleanup, no user-facing impact |
| 10 | **Document API contracts** for multi-tenant usage | OpenAPI spec updates (`openapi.yaml`), new endpoints | M | LOW - developer experience improvement |

**Priority order**: 1 → 3 → 2 → 4 → 5 → 6 → 7 → 8 → 9 → 10

**Biggest blocker for multi-tenancy**: The entire codebase assumes a single store with no `store_id`/`tenant_id` filtering. Every model query, controller, and admin endpoint would need to be updated to filter by tenant. The `shop_settings` singleton pattern is the most fundamental change needed.