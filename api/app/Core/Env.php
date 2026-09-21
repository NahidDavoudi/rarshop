<?php
namespace App\Core;

class Env
{
    public static function load($path = null)
    {
        $path = $path ?? dirname(__DIR__, 2) . '/.env'; // ریشه پروژه

        if (!file_exists($path)) {
            throw new \RuntimeException(".env فایل یافت نشد: {$path}");
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (str_starts_with(trim($line), '#')) {
                continue;
            }
            if (str_contains($line, '=')) {
                [$name, $value] = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);
                $value = trim($value, '"\'');
                putenv("{$name}={$value}");
                $_ENV[$name] = $value;
            }
        }
    }
    public static function get(string $key, mixed $default = null): mixed
    {
        return $_ENV[$key] ?? getenv($key) ?? $default;
    }

    /** @throws \RuntimeException در محیط production اگر تنظیمات حیاتی ناامن باشد */
    public static function assertProductionReady(): void
    {
        if (self::get('APP_ENV', 'production') !== 'production') {
            return;
        }

        $weakSecrets = ['change-me-access-token-secret', 'change-me-refresh-token-secret', ''];
        $jwt = (string) self::get('JWT_SECRET', '');
        $refresh = (string) self::get('REFRESH_SECRET', '');

        if (in_array($jwt, $weakSecrets, true) || strlen($jwt) < 32) {
            throw new \RuntimeException('JWT_SECRET در محیط production باید حداقل ۳۲ کاراکتر (256-bit) و غیر پیش‌فرض باشد.');
        }

        if (in_array($refresh, $weakSecrets, true) || strlen($refresh) < 32) {
            throw new \RuntimeException('REFRESH_SECRET در محیط production باید حداقل ۳۲ کاراکتر (256-bit) و غیر پیش‌فرض باشد.');
        }

        $uploadDir = self::get('UPLOAD_DIR');
        if (!$uploadDir || !is_dir($uploadDir)) {
            throw new \RuntimeException('UPLOAD_DIR در production باید تنظیم شده و خارج از webroot باشد.');
        }
    }
}