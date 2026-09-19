<?php

namespace App\Core\Http;

use App\Core\Env;
use App\Core\Logger;
use Throwable;

class ExceptionHandler
{
    private bool $isDevMode;

    public function __construct()
    {
        $this->isDevMode = Env::get('APP_ENV', 'production') === 'development';
    }

    public function handle(Throwable $e): void
    {
        $statusCode = $this->resolveStatusCode($e);

        if ($statusCode >= 500) {
            Logger::error($e->getMessage(), array_merge(RequestContext::toArray(), [
                'exception' => get_class($e),
                'file'      => $e->getFile(),
                'line'      => $e->getLine(),
            ]));
        }

        if ($this->expectsJson()) {
            $this->respondJson($e, $statusCode);
        } else {
            $this->respondHtml($e, $statusCode);
        }
    }

    public function handleError(
        int    $severity,
        string $message,
        string $file,
        int    $line
    ): bool {
        if (!(error_reporting() & $severity)) {
            return false;
        }

        throw new \ErrorException($message, 0, $severity, $file, $line);
    }

    private function respondJson(Throwable $e, int $code): void
    {
        SecurityHeaders::apply();
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');

        $body = [
            'success' => false,
            'message' => $this->resolveMessage($e, $code),
        ];

        if ($this->isDevMode) {
            $body['debug'] = [
                'exception' => get_class($e),
                'message'   => $e->getMessage(),
                'file'      => $e->getFile(),
                'line'      => $e->getLine(),
                'trace'     => $this->formatTrace($e),
            ];
        }

        echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    private function respondHtml(Throwable $e, int $code): void
    {
        SecurityHeaders::apply();
        http_response_code($code);
        header('Content-Type: text/html; charset=utf-8');

        if ($this->isDevMode) {
            $this->renderDevPage($e, $code);
            exit;
        }

        $viewPath = $this->resolveView($code);

        if (file_exists($viewPath)) {
            $statusCode = $code;
            $message    = $this->resolveMessage($e, $code);
            require $viewPath;
        } else {
            echo "<h1>خطای {$code}</h1><p>" . $this->resolveMessage($e, $code) . "</p>";
        }

        exit;
    }

    private function resolveStatusCode(Throwable $e): int
    {
        $code = $e->getCode();

        if (is_int($code) && $code >= 400 && $code < 600) {
            return $code;
        }

        return match (true) {
            $e instanceof \InvalidArgumentException => 400,
            $e instanceof \RuntimeException         => 400,
            default                                 => 500,
        };
    }

    private function resolveMessage(Throwable $e, int $code): string
    {
        if ($this->isDevMode) {
            return $e->getMessage() ?: $this->defaultMessage($code);
        }

        return $this->defaultMessage($code);
    }

    private function defaultMessage(int $code): string
    {
        return match ($code) {
            400 => 'درخواست نادرست',
            401 => 'ابتدا وارد حساب کاربری خود شوید',
            403 => 'شما اجازه دسترسی به این بخش را ندارید',
            404 => 'صفحه یا منبع مورد نظر یافت نشد',
            405 => 'متد درخواست مجاز نیست',
            422 => 'خطای اعتبارسنجی',
            429 => 'تعداد درخواست‌ها بیش از حد مجاز است',
            500 => 'خطای داخلی سرور',
            503 => 'سرویس موقتاً در دسترس نیست',
            default => 'خطای ناشناخته',
        };
    }

    private function resolveView(int $code): string
    {
        $base = dirname(__DIR__, 2) . '/views/errors';
        $specific = "{$base}/{$code}.php";
        if (file_exists($specific)) {
            return $specific;
        }

        $category = (int) floor($code / 100) . 'xx';
        $general  = "{$base}/{$category}.php";
        if (file_exists($general)) {
            return $general;
        }

        return "{$base}/500.php";
    }

    private function expectsJson(): bool
    {
        $accept      = $_SERVER['HTTP_ACCEPT']       ?? '';
        $contentType = $_SERVER['HTTP_CONTENT_TYPE'] ?? $_SERVER['CONTENT_TYPE'] ?? '';

        return str_contains($accept, 'application/json')
            || str_contains($contentType, 'application/json')
            || str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/api');
    }

    private function renderDevPage(Throwable $e, int $code): void
    {
        $class   = get_class($e);
        $message = htmlspecialchars($e->getMessage());
        $file    = htmlspecialchars($e->getFile());
        $line    = $e->getLine();
        $trace   = htmlspecialchars($e->getTraceAsString());

        echo <<<HTML
        <!DOCTYPE html>
        <html dir="ltr" lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Error {$code}</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: monospace; background: #0f0f0f; color: #e0e0e0; padding: 2rem; }
                h1 { color: #ff5f5f; font-size: 1.5rem; margin-bottom: 1rem; }
                .badge { display: inline-block; background: #ff5f5f; color: #fff;
                         padding: .2rem .6rem; border-radius: 4px; font-size: .8rem; margin-bottom: 1rem; }
                .box { background: #1a1a1a; border: 1px solid #333; border-radius: 6px;
                       padding: 1.2rem; margin-bottom: 1rem; }
                .label { color: #888; font-size: .75rem; margin-bottom: .4rem; }
                .location { color: #7eb8f7; }
                pre { white-space: pre-wrap; word-break: break-all; font-size: .8rem;
                      color: #bbb; max-height: 400px; overflow-y: auto; }
            </style>
        </head>
        <body>
            <span class="badge">HTTP {$code} — DEV MODE</span>
            <h1>{$message}</h1>
            <div class="box">
                <div class="label">EXCEPTION</div>
                <div>{$class}</div>
            </div>
            <div class="box">
                <div class="label">LOCATION</div>
                <div class="location">{$file} : {$line}</div>
            </div>
            <div class="box">
                <div class="label">STACK TRACE</div>
                <pre>{$trace}</pre>
            </div>
        </body>
        </html>
        HTML;
    }

    private function formatTrace(Throwable $e): array
    {
        return array_map(function (array $frame): array {
            return [
                'file'     => $frame['file']     ?? '[internal]',
                'line'     => $frame['line']      ?? 0,
                'function' => ($frame['class']    ?? '')
                            . ($frame['type']     ?? '')
                            . ($frame['function'] ?? ''),
            ];
        }, $e->getTrace());
    }
}
