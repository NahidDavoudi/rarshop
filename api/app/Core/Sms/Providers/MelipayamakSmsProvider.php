<?php

namespace App\Core\Sms\Providers;

use App\Core\Env;
use App\Core\Sms\Contracts\SmsProviderInterface;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

/**
 * Melipayamak Console REST API (token-based)
 * @see https://console.melipayamak.com
 */
class MelipayamakSmsProvider implements SmsProviderInterface
{
    private const CONSOLE_URL = 'https://console.melipayamak.com/api/send/simple';
    private const LEGACY_URL  = 'https://rest.payamak-panel.com/api/SendSMS/SendSMS';

    private Client $client;

    public function __construct(?Client $client = null)
    {
        $this->client = $client ?? new Client([
            'timeout' => (int) Env::get('SMS_API_TIMEOUT', 15),
            'verify'  => true,
        ]);
    }

    public function getName(): string
    {
        return 'melipayamak';
    }

    public function send(string $phone, string $message): bool
    {
        $apiKey = $this->apiKey();
        $sender = $this->sender();

        if ($apiKey === '') {
            throw new \RuntimeException('کلید API ملی‌پیامک در .env تنظیم نشده است.', 500);
        }

        if ($sender === '') {
            throw new \RuntimeException('شماره خط ارسال ملی‌پیامک در .env تنظیم نشده است.', 500);
        }

        if ($this->useLegacyApi()) {
            return $this->sendLegacy($phone, $message, $apiKey, $sender);
        }

        return $this->sendConsole($phone, $message, $apiKey, $sender);
    }

    private function sendConsole(string $phone, string $message, string $apiKey, string $sender): bool
    {
        $base = trim((string) Env::get('MELIPAYAMAK_CONSOLE_URL', 'https://console.melipayamak.com/api/send/simple'));
        if ($base === '') {
            $base = 'https://console.melipayamak.com/api/send/simple';
        }

        $url = rtrim($base, '/') . '/' . rawurlencode($apiKey);

        try {
            $response = $this->client->post($url, [
                'headers' => [
                    'Accept'       => 'application/json',
                    'Content-Type' => 'application/json',
                ],
                'json' => [
                    'from' => $sender,
                    'to'   => $this->normalizePhone($phone),
                    'text' => $message,
                ],
            ]);
        } catch (GuzzleException $e) {
            throw new \RuntimeException('ارسال پیامک ملی‌پیامک با خطا مواجه شد: ' . $e->getMessage(), 502);
        }

        return $this->assertSuccess($response->getStatusCode(), (string) $response->getBody());
    }

    private function sendLegacy(string $phone, string $message, string $apiKey, string $sender): bool
    {
        $username = trim((string) Env::get('MELIPAYAMAK_USERNAME', ''));

        if ($username === '') {
            throw new \RuntimeException('نام کاربری پنل ملی‌پیامک (MELIPAYAMAK_USERNAME) در .env تنظیم نشده است.', 500);
        }

        try {
            $response = $this->client->post(self::LEGACY_URL, [
                'form_params' => [
                    'username' => $username,
                    'password' => $apiKey,
                    'from'     => $sender,
                    'to'       => $this->normalizePhone($phone),
                    'text'     => $message,
                    'isFlash'  => 'false',
                ],
            ]);
        } catch (GuzzleException $e) {
            throw new \RuntimeException('ارسال پیامک ملی‌پیامک با خطا مواجه شد: ' . $e->getMessage(), 502);
        }

        return $this->assertSuccess($response->getStatusCode(), (string) $response->getBody());
    }

    private function assertSuccess(int $status, string $body): bool
    {
        if ($status < 200 || $status >= 300) {
            throw new \RuntimeException('پاسخ ناموفق از ملی‌پیامک (HTTP ' . $status . ').', 502);
        }

        $decoded = json_decode($body, true);

        if (!is_array($decoded)) {
            $raw = trim($body);
            if ($raw === '') {
                throw new \RuntimeException('پاسخ خالی از ملی‌پیامک دریافت شد.', 502);
            }

            if (is_numeric($raw)) {
                return $this->assertLegacyValue((int) $raw, '');
            }

            throw new \RuntimeException('پاسخ نامعتبر از ملی‌پیامک: ' . $raw, 502);
        }

        if (isset($decoded['recId'])) {
            $recId = is_string($decoded['recId']) ? $decoded['recId'] : (string) $decoded['recId'];
            if ($recId !== '' && $recId !== '0' && (!ctype_digit($recId) || (int) $recId !== 0)) {
                if (!empty($decoded['status']) && is_string($decoded['status'])) {
                    $this->throwIfConsoleError($decoded['status']);
                }
                return true;
            }
        }

        if (isset($decoded['status']) && is_string($decoded['status'])) {
            $statusText = trim($decoded['status']);
            if (strtolower($statusText) === 'success') {
                return true;
            }
            $this->throwIfConsoleError($statusText);
        }

        if (array_key_exists('Value', $decoded) && is_numeric($decoded['Value'])) {
            $hint = is_string($decoded['StrRetStatus'] ?? null) ? $decoded['StrRetStatus'] : '';
            return $this->assertLegacyValue((int) $decoded['Value'], $hint);
        }

        throw new \RuntimeException('پاسخ نامعتبر از ملی‌پیامک.', 502);
    }

    private function assertLegacyValue(int $value, string $hint): bool
    {
        // RecId موفق معمولاً عدد بزرگ است؛ کدهای خطا اعداد کوچک (۰ تا ۱۱۰)
        if ($value >= 1000) {
            return true;
        }

        throw new \RuntimeException($this->legacyErrorMessage($value, $hint), 502);
    }

    private function throwIfConsoleError(string $status): void
    {
        if ($status === '' || strtolower($status) === 'success' || strtolower($status) === 'ok') {
            return;
        }

        throw new \RuntimeException('ارسال پیامک ملی‌پیامک ناموفق بود: ' . $status, 502);
    }

    private function legacyErrorMessage(int $code, string $hint): string
    {
        $map = [
            0   => 'نام کاربری یا رمز/API نامعتبر است.',
            2   => 'اعتبار پنل پیامک کافی نیست.',
            3   => 'محدودیت ارسال روزانه فعال است.',
            4   => 'محدودیت حجم ارسال.',
            5   => 'شماره خط ارسال (فرستنده) معتبر نیست.',
            6   => 'سامانه در حال بروزرسانی است.',
            7   => 'متن پیامک شامل کلمه فیلترشده است.',
            9   => 'ارسال از خط عمومی از طریق وب‌سرویس مجاز نیست.',
            10  => 'پنل پیامکی غیرفعال است.',
            11  => 'ارسال نشد؛ شماره گیرنده در لیست سیاه مخابرات است یا خط تبلیغاتی برای OTP کافی نیست. از خط خدماتی یا پترن OTP استفاده کنید.',
            12  => 'مدارک احراز هویت پنل کامل نیست.',
            14  => 'خط ارسال مجاز به ارسال لینک نیست.',
            16  => 'شماره گیرنده یافت نشد.',
            17  => 'متن پیامک خالی است.',
            18  => 'شماره گیرنده نامعتبر است.',
            35  => 'شماره گیرنده در لیست سیاه مخابرات است.',
        ];

        $message = $map[$code] ?? ('ارسال پیامک ناموفق بود (کد ' . $code . ').');
        if ($hint !== '' && $hint !== 'Ok') {
            $message .= ' (' . $hint . ')';
        }

        return $message;
    }

    private function apiKey(): string
    {
        foreach ([
            'MELIPAYAMAK_API_KEY',
            'MELLI_PAYAMAK_API',
            'MELLI_PAYMAK_API',
        ] as $key) {
            $value = trim((string) Env::get($key, ''));
            if ($value !== '') {
                return $value;
            }
        }

        return '';
    }

    private function sender(): string
    {
        foreach ([
            'MELIPAYAMAK_SENDER',
            'MELLI_PAYAMK_PHONE',
        ] as $key) {
            $value = trim((string) Env::get($key, ''));
            if ($value !== '') {
                return $value;
            }
        }

        return '';
    }

    private function useLegacyApi(): bool
    {
        return strtolower((string) Env::get('MELIPAYAMAK_MODE', 'console')) === 'legacy';
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($digits, '98') && strlen($digits) === 12) {
            return '0' . substr($digits, 2);
        }

        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            return '0' . $digits;
        }

        return $digits;
    }
}
