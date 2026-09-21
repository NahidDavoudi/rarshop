<?php

namespace App\Core\Sms\Providers;

use App\Core\Logger;
use App\Core\Sms\Contracts\SmsProviderInterface;

class LogSmsProvider implements SmsProviderInterface
{
    public function getName(): string
    {
        return 'log';
    }

    public function send(string $phone, string $message): bool
    {
        Logger::get('sms')->info('SMS sent (log driver)', [
            'phone'   => $phone,
            'message' => $message,
        ]);

        return true;
    }
}
