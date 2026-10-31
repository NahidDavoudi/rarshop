<?php

// ─── CORS (single source of truth) ───────────────────────────────────────────
// باید قبل از هر خروجی و روتینگ اجرا بشه (require در ابتدای هر دو index.php)
$allowedOrigins = [
    'https://rarshop.ir',
    'https://www.rarshop.ir',
    'https://rar.test',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type, Accept, X-Requested-With');
    header('Access-Control-Max-Age: 86400');
}

// درخواست preflight: همین‌جا جواب بده و تموم کن
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
