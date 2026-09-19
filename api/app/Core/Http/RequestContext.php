<?php

namespace App\Core\Http;

use App\Core\Env;
use App\Core\Logger;

class RequestContext
{
    private static ?string $requestId = null;

    public static function boot(): void
    {
        self::$requestId = bin2hex(random_bytes(16));
    }

    public static function id(): string
    {
        if (self::$requestId === null) {
            self::boot();
        }
        return self::$requestId;
    }

    public static function ip(): string
    {
        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }

    public static function method(): string
    {
        return $_SERVER['REQUEST_METHOD'] ?? 'GET';
    }

    public static function endpoint(): string
    {
        return $_SERVER['REQUEST_URI'] ?? '/';
    }

    public static function userId(): ?int
    {
        $user = \App\Core\Auth\Auth::user();
        return $user->user_id ?? null;
    }

    public static function toArray(): array
    {
        return [
            'request_id' => self::id(),
            'ip'         => self::ip(),
            'method'     => self::method(),
            'endpoint'   => self::endpoint(),
            'user_id'    => self::userId(),
        ];
    }

    public static function configureProduction(): void
    {
        if (Env::get('APP_ENV', 'production') === 'production') {
            ini_set('display_errors', '0');
            ini_set('display_startup_errors', '0');
        }
    }
}
