<?php

namespace App\Core\Auth;

use App\Core\Env;

class AuthCookie
{
    public const ACCESS  = 'gb_access_token';
    public const REFRESH = 'gb_refresh_token';

    public static function setAccessToken(string $token, int $ttlSeconds): void
    {
        self::set(self::ACCESS, $token, $ttlSeconds);
    }

    public static function setRefreshToken(string $token, int $ttlSeconds): void
    {
        self::set(self::REFRESH, $token, $ttlSeconds);
    }

    public static function setPair(string $accessToken, int $accessTtl, string $refreshToken, int $refreshTtl): void
    {
        self::setAccessToken($accessToken, $accessTtl);
        self::setRefreshToken($refreshToken, $refreshTtl);
    }

    public static function clearAll(): void
    {
        self::clear(self::ACCESS);
        self::clear(self::REFRESH);
    }

    public static function getAccessToken(): ?string
    {
        return self::get(self::ACCESS);
    }

    public static function getRefreshToken(): ?string
    {
        return self::get(self::REFRESH);
    }

    private static function set(string $name, string $value, int $ttlSeconds): void
    {
        setcookie($name, $value, [
            'expires'  => time() + max(1, $ttlSeconds),
            'path'     => self::cookiePath(),
            'domain'   => '',
            'secure'   => self::isSecure(),
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
        $_COOKIE[$name] = $value;
    }

    private static function clear(string $name): void
    {
        setcookie($name, '', [
            'expires'  => time() - 3600,
            'path'     => self::cookiePath(),
            'domain'   => '',
            'secure'   => self::isSecure(),
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
        unset($_COOKIE[$name]);
    }

    private static function get(string $name): ?string
    {
        $value = $_COOKIE[$name] ?? null;
        return is_string($value) && $value !== '' ? $value : null;
    }

    private static function cookiePath(): string
    {
        $base = rtrim((string) Env::get('APP_BASE_PATH', ''), '/');
        return $base !== '' ? $base . '/' : '/';
    }

    private static function isSecure(): bool
    {
        if (Env::get('APP_ENV', 'production') !== 'production') {
            return !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        }
        return true;
    }
}
