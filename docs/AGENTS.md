# rarshop - Persian E-commerce Platform

## Project Overview
Bilingual (Persian/English) e-commerce platform with custom PHP MVC architecture (Laravel-like structure) and vanilla JS frontend. Manages products, categories, users, cart, orders, payments, and admin dashboard.

## Technology Stack
- **Backend**: PHP 8+, custom MVC framework (App\Core\*), Composer dependencies (guzzlehttp, monolog, respect/validation, vlucas/phpdotenv, firebase/php-jwt, predis/predis, intervention/image)
- **Frontend**: HTML5, Tailwind CSS v4 (@tailwindcss/cli), vanilla JS (navigo routing, swiper sliders, d3.js charts, lucide icons, persian-date picker)
- **Database**: MySQL (migrations in `api/database/`)
- **Auth**: JWT-based (access + refresh tokens)
- **SMS**: Melipayamak and custom HTTP drivers
- **Payments**: Multiple gateway integrations (BitPay, enamad, etc.)
- **Image processing**: Intervention Image + Imagick (requires `ext-imagick`)

## Directory Structure
```
├── admin.html              # Admin dashboard (SPA with navigo)
├── index.html              # Main storefront (SPA with navigo)
├── login.html              # Login page
├── result.php              # Payment result handler
├── assets/                 # CSS, JS, fonts, images
│   ├── css/input.css       # Tailwind v4 entry (imports + custom theme)
│   └── css/output.css      # Built CSS (committed)
├── api/                    # PHP backend
│   ├── .env                # Environment config (not committed)
│   ├── .env.example        # Template for .env
│   ├── index.php           # Entry point (loads env, boots router)
│   ├── composer.json       # PHP dependencies (PSR-4: App\ -> app/)
│   ├── app/
│   │   ├── Core/           # Framework core (Router, Request, Env, Logger, JWT, etc.)
│   │   ├── Modules/        # Feature modules (Product, Cart, Order, Auth, Payment, etc.)
│   │   ├── Utils/          # Shared utilities
│   │   └── storage/        # File storage
│   ├── routes/api.php      # API route definitions
│   ├── database/           # SQL migrations (ignored by git)
│   ├── v1/                 # API v1 endpoints (legacy?)
│   └── vendor/             # Composer packages (ignored)
└── uploads/                # User-uploaded media (public)
```

## Setup Instructions
1. **PHP deps**: `cd api && composer install`
2. **Frontend deps**: `npm install`
3. **Environment**: Copy `api/.env.example` to `api/.env` and configure:
   - `APP_ENV` (production|development)
   - `APP_BASE_PATH` (e.g., `/universal`)
   - `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`
   - `JWT_SECRET`, `REFRESH_SECRET` (32+ char random strings in production)
   - `SMS_DRIVER` (melipayamak|http|log), API keys
   - `REDIS_HOST`, `REDIS_PORT` (optional, for rate limiting)
   - `UPLOAD_DIR` (absolute path outside webroot for production)
4. **Database**: Run migrations from `api/database/` manually or via custom script
5. **Build CSS**: `npm run build:css` (outputs to `assets/css/output.css`)
6. **Dev server**: `php -S localhost:8000 -t api` (serves from `api/index.php`)

## Development Workflow
- **Modules**: Feature modules in `api/app/Modules/` (each has Models, Controllers, Services, Routes)
- **Routing**: API routes in `api/routes/api.php`; frontend uses navigo in `admin.html`/`index.html`
- **RTL support**: Check `assets/css/input.css` for custom Tailwind utilities (`.dir-rtl`, `.dir-ltr`)
- **Dates**: Use `persian-date` package for Persian calendar formatting
- **API spec**: OpenAPI 3.0 in `openapi.yaml` and `api/openapi.yaml`
- **Env loading**: `App\Core\Env::load()` reads `api/.env`; `Env::assertProductionReady()` validates production config

## Coding Conventions
- **PHP**: PSR-2 compatible; PascalCase classes; `App\` namespace (PSR-4 from `app/`)
- **JS**: camelCase variables/components; modules loaded via `<script type="module">`
- **CSS**: Tailwind v4 utility-first; custom theme in `input.css` `@theme` block; semantic utilities (`.bg-body`, `.text-accent`, etc.)
- **HTML**: `lang="fa"` for Persian, `lang="en"` for English; `dir="rtl"` on Persian pages
- **Assets**: kebab-case filenames (English); committed `output.css` for zero-build deploys
- **Secrets**: Never commit `.env`; use `.env.example` as template

## Key Commands
| Task | Command |
|------|---------|
| Install PHP deps | `cd api && composer install` |
| Install JS deps | `npm install` |
| Build CSS (prod) | `npm run build:css` |
| Watch CSS (dev) | `npm run watch:css` |
| Start dev server | `php -S localhost:8000 -t api` |

## Known Issues / Gotchas
- **No Laravel artisan** — this is a custom framework; no `php artisan` commands exist
- **No `public/` directory** — entry point is `api/index.php`; dev server runs from `api/`
- **OneDrive sync** may conflict with file locks during concurrent edits
- **Persian/English bilingual UI** requires careful direction handling (`dir-rtl` vs `dir-ltr`)
- **Imagick extension** required for image optimization (`extension=php_imagick.dll` in php.ini on Windows/XAMPP)
- **Browser caching** may need purge after CSS/JS changes (output.css is committed)
- **Database migrations** in `api/database/` are not auto-run; apply manually
- **Rate limiting** uses Redis when configured (`REDIS_HOST`, `REDIS_PORT` in .env)