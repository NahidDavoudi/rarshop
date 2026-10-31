<?php
use App\Core\Env;
use App\Core\Http\Router;
use App\Core\Http\Request;
use App\Core\Http\ExceptionHandler;
use App\Core\Http\SecurityHeaders;
use App\Core\Http\RequestContext;

// CORS رو همون اول تنظیم کن (تا روی خطاها هم اعمال بشه، قبل از هر خروجی/روتینگ)
require_once __DIR__ . '/cors.php';

require_once 'vendor/autoload.php';
\App\Core\Logger::boot();

// ─── Load environment ────────────────────────
Env::load(__DIR__ . '/.env');
Env::assertProductionReady();
RequestContext::configureProduction();
RequestContext::boot();
SecurityHeaders::apply();

// ─── Exception Handler ───────────────────────
$handler = new ExceptionHandler();
set_exception_handler([$handler, 'handle']);
set_error_handler([$handler, 'handleError']);

// ─── Router ──────────────────────────────────
$router = new Router();
require_once 'routes/api.php';
$router->dispatch(new Request());
