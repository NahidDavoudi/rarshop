<?php

namespace App\Core\Http;

use App\Core\Env;

class SecurityHeaders
{
    public static function apply(): void
    {
        if (headers_sent()) {
            return;
        }

        header('X-Frame-Options: DENY');
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: strict-origin');
        header("Content-Security-Policy: default-src 'self'");

        if (self::isProduction() && self::isHttps()) {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }
    }

    private static function isProduction(): bool
    {
        return Env::get('APP_ENV', 'production') === 'production';
    }

    private static function isHttps(): bool
    {
        return !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    }
}
