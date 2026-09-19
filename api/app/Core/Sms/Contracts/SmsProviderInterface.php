<?php

namespace App\Core\Sms\Contracts;

interface SmsProviderInterface
{
    public function getName(): string;

    /**
     * @throws \RuntimeException on provider failure
     */
    public function send(string $phone, string $message): bool;
}
