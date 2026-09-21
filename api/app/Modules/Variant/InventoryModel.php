<?php

namespace App\Modules\Variant;

use App\Core\Database\Model;

class InventoryModel extends Model
{
    protected string $table = 'inventory_items';
    protected array $fillable = [
        'variant_id',
        'quantity',
        'reserved_quantity',
        'low_stock_threshold',
        'track_inventory',
    ];

    public function getByVariantId(int $variantId): ?array
    {
        return $this->findBy('variant_id', $variantId);
    }

    public function upsert(int $variantId, array $data): void
    {
        $existing = $this->getByVariantId($variantId);
        $payload  = [
            'quantity'              => (int) ($data['quantity'] ?? 0),
            'low_stock_threshold'   => isset($data['low_stock_threshold'])
                ? (int) $data['low_stock_threshold'] : null,
            'track_inventory'       => (int) ($data['track_inventory'] ?? 1),
        ];

        if ($existing) {
            $this->update($existing['id'], $payload);
        } else {
            $this->create(array_merge(['variant_id' => $variantId], $payload));
        }
    }

    public function decrementStock(int $variantId, int $qty = 1): bool
    {
        $stmt = $this->pdo->prepare("
            UPDATE {$this->table}
            SET quantity = quantity - ?
            WHERE variant_id = ? AND quantity >= ? AND track_inventory = 1
        ");
        $stmt->execute([$qty, $variantId, $qty]);
        return $stmt->rowCount() > 0;
    }

    public function incrementStock(int $variantId, int $qty = 1): void
    {
        $this->pdo->prepare("
            UPDATE {$this->table}
            SET quantity = quantity + ?
            WHERE variant_id = ?
        ")->execute([$qty, $variantId]);
    }

    public function getAvailable(int $variantId): int
    {
        $row = $this->getByVariantId($variantId);
        if (!$row) {
            return 0;
        }
        return max(0, (int) $row['quantity'] - (int) $row['reserved_quantity']);
    }
}
