<?php
require_once 'vendor/autoload.php';
\App\Core\Logger::boot();
use App\Core\Env;
use App\Core\Http\Router;
use App\Core\Http\Request;
use App\Core\Http\ExceptionHandler;
use App\Core\Http\SecurityHeaders;
use App\Core\Http\RequestContext;

// ─── CORS ────────────────────────────────────
// باید قبل از هر خروجی و هر چیز دیگه‌ای باشه، تا روی خطاها هم اعمال بشه
$allowedOrigins = [
    'https://rar.nadstore.ir',
    'https://www.rar.nadstore.ir',
    'https://rar.test'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type, Accept, X-Requested-With');
    header('Access-Control-Max-Age: 86400');
}

// درخواست preflight: همین‌جا جواب بده و تموم کن
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}


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
