<?php
namespace App\Core\Cache;

use Predis\Client;
use App\Core\Env;

class RedisConnector
{
    private static ?Client $instance = null;

    public static function getInstance(): Client
    {
        if (self::$instance === null) {
            $host = Env::get('REDIS_HOST', 'localhost');
            $port = Env::get('REDIS_PORT', 6379);
            $password = Env::get('REDIS_PASSWORD', null);

            $params = [
                'scheme' => 'tcp',
                'host'   => $host,
                'port'   => $port,
            ];
            if ($password && $password !== 'null') {
                $params['password'] = $password;
            }
            self::$instance = new Client($params);
        }
        return self::$instance;
    }
}