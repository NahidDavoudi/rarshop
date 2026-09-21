<?php

namespace App\Core\Middleware;

use App\Core\Http\MiddlewareInterface;
use App\Core\Http\Request;
use App\Core\Http\Response;
use App\Core\Http\SecurityHeaders;
use App\Core\Auth\Auth;

class AuthMiddleware implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response
    {
        SecurityHeaders::apply();
        $token = $request->bearerToken();

        if (!$token) {
            return Response::unauthorized('توکن احراز هویت ارسال نشده است');
        }

        try {
            $decoded = Auth::verifyToken($token);
            $user = $decoded->data ?? null;

            if (!$user || !isset($user->user_id)) {
                return Response::unauthorized('توکن نامعتبر است');
            }

            $request->setUser($user);
            Auth::setCurrentUser($user);
        } catch (\Firebase\JWT\ExpiredException $e) {
            return Response::unauthorized('توکن منقضی شده است');
        } catch (\RuntimeException $e) {
            if ((int) $e->getCode() === 401) {
                return Response::unauthorized($e->getMessage());
            }
            return Response::unauthorized('توکن نامعتبر است');
        } catch (\Exception $e) {
            return Response::unauthorized('توکن نامعتبر است');
        }

        return $next($request);
    }
}
