<?php

namespace App\Modules\Payment;

use App\Core\Controller;
use App\Core\Http\Request;
use App\Core\Logger;
use App\Core\Env;

class PaymentController extends Controller
{
    private PaymentService $service;

    public function __construct()
    {
        $this->service = new PaymentService();
    }

    public function initiate(Request $request): void
    {
        if (!$this->validate($request->all(), [
            'order_id' => 'required|integer',
        ])) {
            return;
        }

        $orderId = (int) $request->input('order_id');
        $result = $this->service->initiate($orderId);

        if (!$result['success']) {
            $this->error($this->mapErrorMessage($result['error']), 400);
            return;
        }

        $this->success(['redirect_url' => $result['redirect_url']], 'لینک پرداخت ایجاد شد');
    }

    public function callback(Request $request): void
    {
        $params = [
        'trans_id' => $request->query('trans_id'),
        'id_get'   => $request->query('id_get'),
        ];
        
        $result = $this->service->handleCallback($params);
        $redirectBase = Env::get('BITPAY_REDIRECT_URL');
        $status = $result['success'] ? 'success' : 'failed';
        $orderId = $result['order_id'] ?? '';
    
        header("Location: {$redirectBase}?order_id={$orderId}&status={$status}");
        exit;
    }

    private function mapErrorMessage(string $code): string
    {
        return match ($code) {
            'order_not_found'  => 'سفارش یافت نشد',
            'connection_failed' => 'خطا در اتصال به درگاه پرداخت',
            'api_key_invalid'  => 'کلید API درگاه نامعتبر است',
            'invalid_amount'   => 'مبلغ پرداخت نامعتبر است',
            default            => 'خطا در ایجاد تراکنش پرداخت',
        };
    }
}