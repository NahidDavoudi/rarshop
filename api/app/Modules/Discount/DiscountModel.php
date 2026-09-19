<?php

namespace App\Modules\Discount;

use App\Core\Database\Model;

class DiscountModel extends Model
{
    protected string $table = 'discount_codes';
    protected bool $timestamps = false;  // فقط created_at دارد
    protected array $fillable = [
        'code',
        'type',        // enum: 'percent', 'fixed'
        'value',
        'valid_from',
        'valid_to',
        'is_active',
    ];

    public function findByCode(string $code): ?array
    {
        return $this->findBy('code', $code);
    }

    // کد تخفیف معتبر پیدا کن (فعال + در بازه زمانی)
    public function findValidCode(string $code): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM {$this->table}
            WHERE code = ?
              AND is_active = 1
              AND valid_from <= NOW()
              AND valid_to >= NOW()
            LIMIT 1
        ");
        $stmt->execute([$code]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    // محاسبه مبلغ تخفیف
    public function calculateDiscount(array $discount, int $totalAmount): int
    {
        if ($discount['type'] === 'percent') {
            return (int) round($totalAmount * $discount['value'] / 100);
        }
        // fixed
        return min((int) $discount['value'], $totalAmount);
    }

    public function deactivate(int $id): bool
    {
        return parent::update($id, ['is_active' => 0]);
    }

    public function getActive(): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM {$this->table}
            WHERE is_active = 1
            ORDER BY created_at DESC
        ");
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
