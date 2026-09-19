<?php

namespace App\Modules\Payment\Gateways;

interface GatewayInterface
{
    /**
     * @param float $amount مبلغ به تومان یا ریال (باید مشخص کنی بیت‌پی کدوم واحد رو می‌خواد)
     * @param string $orderId شناسه سفارش داخلی
     * @param string $callbackUrl
     * @return array{success: bool, redirect_url: ?string, ref_id: ?string, error: ?string}
     */
    public function requestPayment(float $amount, string $orderId, string $callbackUrl): array;

    /**
     * @return array{success: bool, ref_id: ?string, tracking_code: ?string, error: ?string}
     */
    public function verifyPayment(array $callbackData): array;
}