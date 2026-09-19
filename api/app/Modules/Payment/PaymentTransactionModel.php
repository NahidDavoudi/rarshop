<?php

namespace App\Modules\Payment;

use App\Core\Database\Model;

class PaymentTransactionModel extends Model
{
    protected string $table = 'payment_transactions';

    protected array $fillable = [
        'order_id',
        'gateway',
        'ref_id',
        'tracking_code',
        'amount',
        'status',
    ];

    public function createPending(int $orderId, string $refId, float $amount): int
    {
        return $this->create([
            'order_id' => $orderId,
            'gateway'  => 'bitpay',
            'ref_id'   => $refId,
            'amount'   => $amount,
            'status'   => 'pending',
        ]);
    }

    public function findByRefId(string $refId): ?array
    {
        return $this->findBy('ref_id', $refId);
    }

    public function markStatus(int $id, string $status, ?string $trackingCode = null): bool
    {
        return $this->update($id, [
            'status'        => $status,
            'tracking_code' => $trackingCode,
        ]);
    }
}