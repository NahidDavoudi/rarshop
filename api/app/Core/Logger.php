<?php
namespace App\Core;

use Monolog\Logger as MonologLogger;
use Monolog\Handler\StreamHandler;
use Monolog\Handler\RotatingFileHandler;
use Monolog\Formatter\LineFormatter;

class Logger
{
    private static array $instances = [];
    private static string $logPath;

    public static function boot(): void
    {
        self::$logPath = dirname(__DIR__) . '/storage/logs';

        if (!is_dir(self::$logPath)) {
            mkdir(self::$logPath, 0755, true);
        }
    }

    public static function get(string $channel = 'app'): MonologLogger
    {
        if (isset(self::$instances[$channel])) {
            return self::$instances[$channel];
        }

        $logger = new MonologLogger($channel);

        // فرمت لاگ
        $dateFormat = 'Y-m-d H:i:s';
        $output = "[%datetime%] %channel%.%level_name%: %message% %context%\n";
        $formatter = new LineFormatter($output, $dateFormat);

        // فایل rotating — هر روز یه فایل جدید، max 30 روز نگه داره
        $fileHandler = new RotatingFileHandler(
            self::$logPath . "/{$channel}.log",
            30,
            MonologLogger::DEBUG
        );
        $fileHandler->setFormatter($formatter);
        $logger->pushHandler($fileHandler);

        // توی dev، توی console هم نشون بده
        if (Env::get('APP_ENV') === 'development') {
            $consoleHandler = new StreamHandler('php://stderr', MonologLogger::DEBUG);
            $consoleHandler->setFormatter($formatter);
            $logger->pushHandler($consoleHandler);
        }

        self::$instances[$channel] = $logger;
        return $logger;
    }

    // ─── Shortcut های استاتیک ─────────────────────────────────────────────

    public static function info(string $message, array $context = []): void
    {
        self::get()->info($message, $context);
    }

    public static function error(string $message, array $context = []): void
    {
        self::get()->error($message, $context);
    }

    public static function warning(string $message, array $context = []): void
    {
        self::get()->warning($message, $context);
    }

    public static function debug(string $message, array $context = []): void
    {
        self::get()->debug($message, $context);
    }

    // ─── Channel های خاص ─────────────────────────────────────────────────

    public static function auth(): MonologLogger
    {
        return self::get('auth');
    }

    public static function payment(): MonologLogger
    {
        return self::get('payment');
    }
}