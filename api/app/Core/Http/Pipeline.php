<?php

namespace App\Core\Http;

use App\Core\Http\Request;
use App\Core\Http\Response;
use App\Core\Http\MiddlewareInterface;

class Pipeline
{
    private array $middlewares = [];

    public function add(MiddlewareInterface $middleware): self
    {
        $this->middlewares[] = $middleware;
        return $this;
    }

    public function run(Request $request, callable $finalHandler): Response
    {
        $next = $finalHandler;

        foreach (array_reverse($this->middlewares) as $middleware) {
            $next = function (Request $request) use ($middleware, $next): Response {
                return $middleware->handle($request, $next);
            };
        }

        return $next($request);
    }
}