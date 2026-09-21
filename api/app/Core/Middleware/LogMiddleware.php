<?php
namespace App\Core\Middleware;

use App\Core\Http\MiddlewareInterface;
use App\Core\Http\Request;
use App\Core\Http\Response;
use App\Core\Http\RequestContext;
use App\Core\Logger;

class LogMiddleware implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response
    {
        $start = microtime(true);

        $response = $next($request);

        $duration = round((microtime(true) - $start) * 1000, 2);

        Logger::info('request', array_merge(RequestContext::toArray(), [
            'method'   => $request->method(),
            'uri'      => $request->uri(),
            'duration' => $duration . 'ms',
        ]));

        return $response;
    }
}
