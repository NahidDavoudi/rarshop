<?php

namespace App\Core\Sms\Providers;

use App\Core\Env;
use App\Core\Sms\Contracts\SmsProviderInterface;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class HttpSmsProvider implements SmsProviderInterface
{
    private Client $client;

    public function __construct(?Client $client = null)
    {
        $this->client = $client ?? new Client([
            'timeout' => (int) Env::get('SMS_API_TIMEOUT', 10),
        ]);
    }

    public function getName(): string
    {
        return 'http';
    }

    public function send(string $phone, string $message): bool
    {
        $url = trim((string) Env::get('SMS_API_URL', ''));
        if ($url === '') {
            throw new \RuntimeException('آدرس API پیامک (SMS_API_URL) تنظیم نشده است.', 500);
        }

        $body = $this->buildBody($phone, $message);
        $headers = $this->buildHeaders();

        try {
            $response = $this->client->request(
                strtoupper((string) Env::get('SMS_API_METHOD', 'POST')),
                $url,
                [
                    'headers' => $headers,
                    'json'    => $body,
                ]
            );
        } catch (GuzzleException $e) {
            throw new \RuntimeException('ارسال پیامک با خطا مواجه شد: ' . $e->getMessage(), 502);
        }

        $status = $response->getStatusCode();
        if ($status < 200 || $status >= 300) {
            throw new \RuntimeException('پاسخ ناموفق از سرویس پیامک (HTTP ' . $status . ').', 502);
        }

        return true;
    }

    private function buildBody(string $phone, string $message): array
    {
        $template = Env::get('SMS_API_BODY');
        if ($template) {
            $decoded = json_decode(
                str_replace(['{phone}', '{message}'], [$phone, $message], $template),
                true
            );

            if (!is_array($decoded)) {
                throw new \RuntimeException('قالب SMS_API_BODY نامعتبر است.', 500);
            }

            return $decoded;
        }

        $phoneField   = (string) Env::get('SMS_API_PHONE_FIELD', 'mobile');
        $messageField = (string) Env::get('SMS_API_MESSAGE_FIELD', 'message');

        $body = [
            $phoneField   => $phone,
            $messageField => $message,
        ];

        $sender = Env::get('SMS_API_SENDER');
        if ($sender) {
            $body[(string) Env::get('SMS_API_SENDER_FIELD', 'sender')] = $sender;
        }

        $apiKeyField = Env::get('SMS_API_KEY_FIELD');
        $apiKey      = Env::get('SMS_API_KEY');
        if ($apiKeyField && $apiKey) {
            $body[$apiKeyField] = $apiKey;
        }

        return $body;
    }

    private function buildHeaders(): array
    {
        $headers = ['Content-Type' => 'application/json', 'Accept' => 'application/json'];

        $extra = Env::get('SMS_API_HEADERS');
        if ($extra) {
            $decoded = json_decode($extra, true);
            if (is_array($decoded)) {
                $headers = array_merge($headers, $decoded);
            }
        }

        $apiKey = Env::get('SMS_API_KEY');
        if ($apiKey && !isset($headers['Authorization'])) {
            $prefix = (string) Env::get('SMS_API_AUTH_PREFIX', 'Bearer');
            $headers['Authorization'] = trim($prefix . ' ' . $apiKey);
        }

        return $headers;
    }
}
