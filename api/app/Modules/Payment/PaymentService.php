<?php

namespace App\Modules\Payment;

use App\Modules\Payment\Gateways\BitPayGateway;
use App\Modules\Order\OrderModel;
use App\Core\Logger;
use App\Core\Env;

class PaymentService
{
    private BitPayGateway $gateway;
    private PaymentTransactionModel $transactions;
    private OrderModel $orders;

    public function __construct()
    {
        $this->gateway      = new BitPayGateway();
        $this->transactions = new PaymentTransactionModel();
        $this->orders       = new OrderModel();
    }

    public function initiate(int $orderId): array
    {
        $order = $this->orders->find($orderId);
        if (!$order) {
            return ['success' => false, 'error' => 'order_not_found'];
        }

        $callbackUrl = Env::get('BITPAY_CALLBACK_URL');
        $result = $this->gateway->requestPayment((float) $order['total_amount'] * 10 , (string) $orderId, $callbackUrl);

        if (!$result['success']) {
            return $result;
        }

        $this->transactions->createPending($orderId, $result['ref_id'], (float) $order['total_amount']);

        return $result;
    }

    public function handleCallback(array $callbackData): array
    {
        // لاگ کردن داده‌های دریافتی برای دیباگ
        Logger::info('BitPay callback received', $callbackData);
        
        $result = $this->gateway->verifyPayment($callbackData);
        
        // بررسی وجود id_get
        $idGet = $callbackData['id_get'] ?? null;
        if (!$idGet) {
            Logger::error('Missing id_get in callback', ['callback_data' => $callbackData]);
            return ['success' => false, 'order_id' => null, 'error' => 'missing_id_get'];
        }
        
        $transaction = $this->transactions->findByRefId((string) $idGet);
        
        if (!$transaction) {
            Logger::error('Transaction not found', ['ref_id' => $idGet]);
            return ['success' => false, 'order_id' => null, 'error' => 'transaction_not_found'];
        }
    
        if ($result['success']) {
            $this->transactions->markStatus($transaction['id'], 'success', $result['tracking_code'] ?? null);
            $this->orders->update($transaction['order_id'], ['status' => 'paid']);
        } else {
            $this->transactions->markStatus($transaction['id'], 'failed');
            Logger::error('Payment verification failed', [
                'order_id' => $transaction['order_id'],
                'result' => $result
            ]);
        }
    
        $result['order_id'] = $transaction['order_id'];
        return $result;
    }
}