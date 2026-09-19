<?php

namespace App\Core\Http;

use App\Core\Http\Request;
use App\Core\Http\Response;
use App\Core\Http\Pipeline;

class Router
{
    /** @var array<int, array{method: string, pattern: string, handler: array, middlewares: string[]}> */
    private array $routes = [];

    /** @var array{prefix: string, middlewares: string[]} */
    private array $groupStack = [];

    // ─── Route Registration ───────────────────────────────────────────────────

    public function get(string $path, array $handler): void
    {
        $this->addRoute('GET', $path, $handler);
    }

    public function post(string $path, array $handler): void
    {
        $this->addRoute('POST', $path, $handler);
    }

    public function put(string $path, array $handler): void
    {
        $this->addRoute('PUT', $path, $handler);
    }

    public function patch(string $path, array $handler): void
    {
        $this->addRoute('PATCH', $path, $handler);
    }

    public function delete(string $path, array $handler): void
    {
        $this->addRoute('DELETE', $path, $handler);
    }

    // ─── Group ────────────────────────────────────────────────────────────────

    /**
     * @param array{prefix?: string, middleware?: string[]} $attributes
     */
    public function group(array $attributes, callable $callback): void
    {
        // محاسبه prefix و middleware تجمیعی با توجه به stack فعلی
        $parentPrefix      = $this->currentPrefix();
        $parentMiddlewares = $this->currentMiddlewares();

        $this->groupStack[] = [
            'prefix'      => $parentPrefix . ($attributes['prefix'] ?? ''),
            'middlewares' => array_merge($parentMiddlewares, $attributes['middleware'] ?? []),
        ];

        $callback($this);

        array_pop($this->groupStack);
    }

    // ─── Dispatch ─────────────────────────────────────────────────────────────

    public function dispatch(Request $request): void
    {
        $method = strtoupper($request->method());
        $path   = $this->normalizePath($request->path());

        $methodMatched = false;

        foreach ($this->routes as $route) {
            $params = [];

            if (!$this->matchPath($route['pattern'], $path, $params)) {
                continue;
            }

            // مسیر match شد — HTTP method رو چک کن
            if ($route['method'] !== $method) {
                $methodMatched = true; // برای تشخیص 405
                continue;
            }

            // پارامترهای URL رو به Request اضافه کن
            foreach ($params as $key => $value) {
                $request->setParam($key, $value);
            }

            // Pipeline ساختن و اجرا
            $pipeline = new Pipeline();

            foreach ($route['middlewares'] as $middlewareClass) {
                $pipeline->add(new $middlewareClass());
            }

            $response = $pipeline->run($request, function (Request $req) use ($route): Response {
                return $this->callHandler($route['handler'], $req);
            });

            $response->send();
            return;
        }

        // هیچ route ای match نشد
        if ($methodMatched) {
            $this->jsonError(405, 'Method Not Allowed');
        } else {
            $this->jsonError(404, 'Not Found');
        }
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    private function addRoute(string $method, string $path, array $handler): void
    {
        $fullPath = $this->currentPrefix() . $path;

        $this->routes[] = [
            'method'      => strtoupper($method),
            'pattern'     => $this->normalizePath($fullPath),
            'handler'     => $handler,
            'middlewares' => $this->currentMiddlewares(),
        ];
    }

    private function matchPath(string $pattern, string $path, array &$params): bool
    {
        // /users/{id}/orders → /users/(?P<id>[^/]+)/orders
        $regex = preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $pattern);
        $regex = '#^' . $regex . '$#';

        if (!preg_match($regex, $path, $matches)) {
            return false;
        }

        // فقط named capture groups رو برگردون
        foreach ($matches as $key => $value) {
            if (is_string($key)) {
                $params[$key] = $value;
            }
        }

        return true;
    }

    /**
     * Controller رو instantiate و متد رو با inject کردن Request صدا می‌زنه
     */
    private function callHandler(array $handler, Request $request): Response
    {
        [$controllerClass, $method] = $handler;

        $controller = new $controllerClass();

        if (!method_exists($controller, $method)) {
            $this->jsonError(500, "متد {$method} در کنترلر وجود ندارد.");
        }

        $reflection = new \ReflectionMethod($controller, $method);
        $args       = [];

        foreach ($reflection->getParameters() as $param) {
            $type = $param->getType();
            $typeName = $type?->getName();

            if ($typeName === Request::class) {
                $args[] = $request;
            } elseif ($typeName === 'int') {
                $val    = $request->param($param->getName());
                $args[] = $val !== null ? (int) $val : ($param->isOptional() ? $param->getDefaultValue() : 0);
            } elseif ($typeName === 'string') {
                $val    = $request->param($param->getName());
                $args[] = $val !== null ? (string) $val : ($param->isOptional() ? $param->getDefaultValue() : '');
            } else {
                $args[] = $param->isOptional() ? $param->getDefaultValue() : null;
            }
        }

        return call_user_func_array([$controller, $method], $args);
    }

    private function currentPrefix(): string
    {
        return empty($this->groupStack) ? '' : end($this->groupStack)['prefix'];
    }

    /** @return string[] */
    private function currentMiddlewares(): array
    {
        return empty($this->groupStack) ? [] : end($this->groupStack)['middlewares'];
    }

    private function normalizePath(string $path): string
    {
        return '/' . trim($path, '/');
    }

    private function jsonError(int $status, string $message): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
        exit;
    }
}