<?php

namespace App\Modules\Payment\Gateways;

use App\Core\Env;
use App\Core\Logger;

class BitPayGateway implements GatewayInterface
{
    private string $apiKey;

    public function __construct()
    {
        $this->apiKey = Env::get('BITPAY_API_KEY');
    }

    public function requestPayment(float $amountRial, string $orderId, string $callbackUrl): array
    {
        if ($amountRial < 500) {
            return ['success' => false, 'redirect_url' => null, 'ref_id' => null, 'error' => 'amount_too_low'];
        }

        $payload = [
            'api'         => $this->apiKey,
            'amount'      => (int) $amountRial,
            'redirect'    => $callbackUrl, // http_build_query خودش encode می‌کنه، دوباره urlencode نکن
            'factorId'    => $orderId,
            'name'        => '',
            'email'       => '',
            'description' => 'پرداخت سفارش #' . $orderId,
        ];

        $ch = curl_init('https://bitpay.ir/payment/gateway-send');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query($payload),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => true, // نمونه رسمی FALSE گذاشته، ولی توصیه امنیتی TRUE هست؛ اگه با TRUE ارور SSL گرفتی، موقتاً FALSE کن
        ]);

        $response  = curl_exec($ch);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            Logger::error('BitPay request failed', ['error' => $curlError, 'order_id' => $orderId]);
            return ['success' => false, 'redirect_url' => null, 'ref_id' => null, 'error' => 'connection_failed'];
        }

        $refId = trim((string) $response);

        if (!is_numeric($refId) || (int) $refId <= 0) {
            Logger::error('BitPay rejected request', ['response' => $response, 'order_id' => $orderId]);
            return ['success' => false, 'redirect_url' => null, 'ref_id' => null, 'error' => $this->mapSendError($refId)];
        }

        return [
            'success'      => true,
            'redirect_url' => "https://bitpay.ir/payment/gateway-{$refId}-get",
            'ref_id'       => $refId,
            'error'        => null,
        ];
    }

    public function verifyPayment(array $callbackData): array
{
    $transId = $callbackData['trans_id'] ?? null;
    $idGet   = $callbackData['id_get'] ?? null;

    // لاگ برای دیباگ
    Logger::info('Verifying payment', ['trans_id' => $transId, 'id_get' => $idGet]);

    if (!$transId || !$idGet) {
        return ['success' => false, 'ref_id' => null, 'tracking_code' => null, 'error' => 'missing_params'];
    }

    $payload = [
        'api'      => $this->apiKey,
        'id_get'   => $idGet,
        'trans_id' => $transId,
        'json'     => 1,
    ];

    $ch = curl_init('https://bitpay.ir/payment/gateway-result-second'); // ✅ اصلاح آدرس
    
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => false, // موقتاً false برای تست (بعداً true کن)
    ]);
    
    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    curl_close($ch);

    // لاگ پاسخ درگاه
    Logger::info('BitPay verify response', ['response' => $response, 'curl_error' => $curlError]);

    if ($curlError) {
        return ['success' => false, 'ref_id' => null, 'tracking_code' => null, 'error' => 'curl_error: ' . $curlError];
    }

    $result = json_decode($response, true);
    
    // بررسی json
    if (json_last_error() !== JSON_ERROR_NONE) {
        Logger::error('Invalid JSON response', ['response' => $response]);
        return ['success' => false, 'ref_id' => null, 'tracking_code' => null, 'error' => 'invalid_json'];
    }

    $status = (int) ($result['status'] ?? 0);

    // طبق مستندات بیت‌پی، status=1 یعنی موفق
    if ($status !== 1) {
        Logger::error('BitPay verify failed', ['status' => $status, 'response' => $result]);
        return [
            'success'       => false,
            'ref_id'        => $idGet,
            'tracking_code' => $transId,
            'error'         => $this->mapVerifyError($status),
        ];
    }

    return [
        'success'       => true,
        'ref_id'        => $idGet,
        'tracking_code' => $transId,
        'amount'        => $result['amount'] ?? null,
        'card_num'      => $result['cardNum'] ?? null,
        'factor_id'     => $result['factorId'] ?? null,
        'error'         => null,
    ];
}

    private function mapSendError(string $code): string
    {
        return match ($code) {
            '-1' => 'api_key_mismatch',
            '-2' => 'invalid_amount',
            '-3' => 'invalid_redirect',
            '-4' => 'gateway_not_found_or_pending',
            '-5' => 'connection_error',
            default => 'unknown_error',
        };
    }

    private function mapVerifyError(int $status): string
    {
        return match ($status) {
            -1 => 'api_key_mismatch',
            -2 => 'trans_id_not_numeric',
            -3 => 'id_get_not_numeric',
            -4 => 'transaction_not_found_or_failed',
            default => 'verify_failed',
        };
    }
}