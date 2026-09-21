<?php

namespace App\Core\Middleware;

use App\Core\Http\MiddlewareInterface;
use App\Core\Http\Request;
use App\Core\Http\Response;

class AdminMiddleware implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response
    {
        $user = $request->user();

        if (!$user || ($user->role ?? '') !== 'admin') {
            return Response::forbidden('دسترسی فقط برای ادمین مجاز است');
        }

        return $next($request);
    }
}