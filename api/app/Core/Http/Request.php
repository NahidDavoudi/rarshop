<?php
namespace App\Core\Http;

class Request {
    private array $params = [];
    private array $body = [];
    private array $headers = [];

    public function __construct() {
        // Parse JSON body
        $rawBody = file_get_contents('php://input');
        $this->body = json_decode($rawBody, true) ?? [];

        // Also merge $_POST for form data
        if (!empty($_POST)) {
            $this->body = array_merge($this->body, $_POST);
        }

        // Also merge $_FILES
        if (!empty($_FILES)) {
            $this->body = array_merge($this->body, $_FILES);
        }

        // Collect headers - استفاده از getallheaders()
        $this->loadHeaders();
    }

    private function loadHeaders(): void {
        // روش اول: استفاده از getallheaders()
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            foreach ($headers as $key => $value) {
                $this->headers[$key] = $value;
                // همچنین با فرمت استاندارد شده هم ذخیره کن
                $normalizedKey = strtoupper(str_replace('-', '_', $key));
                $this->headers[$normalizedKey] = $value;
            }
        }
        
        // روش دوم: از $_SERVER به عنوان fallback
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $headerName = str_replace('_', '-', substr($key, 5));
                if (!isset($this->headers[$headerName])) {
                    $this->headers[$headerName] = $value;
                }
            }
        }
    }

    public function setParams(array $params): void {
        $this->params = $params;
    }

    public function param(string $key, mixed $default = null): mixed {
        return $this->params[$key] ?? $default;
    }

    public function input(string $key, mixed $default = null): mixed {
        return $this->body[$key] ?? $default;
    }

    public function all(): array {
        return array_merge($this->params, $this->body);
    }

    public function only(array $keys): array {
        $data = [];
        foreach ($keys as $key) {
            if (isset($this->body[$key])) {
                $data[$key] = $this->body[$key];
            }
        }
        return $data;
    }

    public function has(string $key): bool {
        return isset($this->body[$key]);
    }

    public function header(string $key, mixed $default = null): mixed {
        // جستجو در کلیدهای مختلف
        $variations = [
            $key,
            strtolower($key),
            strtoupper($key),
            str_replace('-', '_', $key),
            str_replace('_', '-', $key)
        ];
        
        foreach ($variations as $variant) {
            if (isset($this->headers[$variant])) {
                return $this->headers[$variant];
            }
        }
        
        return $default;
    }

    public function bearerToken(): ?string {
        $cookieToken = \App\Core\Auth\AuthCookie::getAccessToken();
        if ($cookieToken) {
            return $cookieToken;
        }

        // روش اول: از هدر Authorization
        $auth = $this->header('Authorization', '');
        
        if (empty($auth)) {
            $auth = $this->header('AUTHORIZATION', '');
        }
        
        // روش دوم: مستقیماً از getallheaders()
        if (empty($auth) && function_exists('getallheaders')) {
            $headers = getallheaders();
            $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }
        
        // استخراج توکن
        if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
            return trim($matches[1]);
        }
        
        return null;
    }

    public function method(): string {
        return $_SERVER['REQUEST_METHOD'];
    }

    public function uri(): string {
        $uri  = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $base = rtrim($_ENV['APP_BASE_PATH'] ?? '', '/');
        if ($base && str_starts_with($uri, $base)) {
            $uri = substr($uri, strlen($base));
        }
        return $uri ?: '/';
    }

    public function path(): string {
        return $this->uri();
    }

    public function setParam(string $key, mixed $value): void {
        $this->params[$key] = $value;
    }

    public function setUser(mixed $user): void {
        $this->params['__user'] = $user;
    }

    public function user(): mixed {
        return $this->params['__user'] ?? null;
    }

    public function userId(): int|null {
        $user = $this->params['__user'] ?? null;
        return $user ? (int) $user->user_id : null;
    }

    public function query(string $key, mixed $default = null): mixed {
        return $_GET[$key] ?? $default;
    }
}