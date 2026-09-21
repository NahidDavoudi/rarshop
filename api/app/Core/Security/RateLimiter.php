<?php
namespace App\Core\Security;

use Predis\Client;
use App\Core\Cache\RedisConnector;

class RateLimiter
{
    private Client $redis;

    public function __construct(?Client $redis = null)
    {
        $this->redis = $redis ?? RedisConnector::getInstance();
    }

    public function tooManyAttempts(string $key, int $max, int $decaySeconds): bool
    {
        $attempts = (int) $this->redis->get($key);
        return $attempts >= $max;
    }

    public function hit(string $key, int $decaySeconds): void
    {
        $lua = "
            local current = redis.call('INCR', KEYS[1])
            if current == 1 then
                redis.call('EXPIRE', KEYS[1], ARGV[1])
            end
            return current
        ";
        $this->redis->eval($lua, 1, $key, $decaySeconds);
    }

    public function clear(string $key): void
    {
        $this->redis->del([$key]);
    }

    // متد کمکی برای ریست تلاش‌های لاگین بعد از موفقیت
    public function resetAttempts(string $prefix): void
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $this->clear($prefix . ':' . $ip);
    }
}