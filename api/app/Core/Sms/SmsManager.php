<?php

namespace App\Core\Sms;

use App\Core\Env;
use App\Core\Sms\Contracts\SmsProviderInterface;
use App\Core\Sms\Providers\HttpSmsProvider;
use App\Core\Sms\Providers\LogSmsProvider;
use App\Core\Sms\Providers\MelipayamakSmsProvider;

class SmsManager
{
    private static ?SmsProviderInterface $provider = null;

    public static function provider(): SmsProviderInterface
    {
        if (self::$provider !== null) {
            return self::$provider;
        }

        $driver = strtolower((string) Env::get('SMS_DRIVER', 'log'));

        self::$provider = match ($driver) {
            'http'        => new HttpSmsProvider(),
            'melipayamak' => new MelipayamakSmsProvider(),
            default       => new LogSmsProvider(),
        };

        return self::$provider;
    }

    public static function setProvider(SmsProviderInterface $provider): void
    {
        self::$provider = $provider;
    }

    public static function reset(): void
    {
        self::$provider = null;
    }
}
