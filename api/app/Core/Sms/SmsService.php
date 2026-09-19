<?php

namespace App\Core\Sms;

use App\Core\Env;
use App\Core\Sms\Contracts\SmsProviderInterface;
use App\Modules\Settings\SettingsModel;

class SmsService
{
    public function __construct(
        private ?SmsProviderInterface $provider = null,
        private ?SettingsModel $settingsModel = null,
    ) {
        $this->provider      = $provider ?? SmsManager::provider();
        $this->settingsModel = $settingsModel ?? new SettingsModel();
    }

    public function sendOtp(string $phone, string $code): void
    {
        $this->ensureEnabled();

        $template = (string) Env::get('SMS_OTP_TEMPLATE', 'کد تایید شما: {code}');
        $message  = str_replace('{code}', $code, $template);

        $this->provider->send($phone, $message);
    }

    public function send(string $phone, string $message): void
    {
        $this->ensureEnabled();
        $this->provider->send($phone, $message);
    }

    public function driverName(): string
    {
        return $this->provider->getName();
    }

    private function ensureEnabled(): void
    {
        if ($this->provider->getName() === 'log') {
            return;
        }

        $settings = $this->settingsModel->getSingleton();
        if (!$settings || !(int) ($settings['sms_enabled'] ?? 0)) {
            throw new \RuntimeException('سرویس پیامک در تنظیمات فروشگاه غیرفعال است.', 503);
        }
    }
}
