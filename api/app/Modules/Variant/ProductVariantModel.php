<?php

namespace App\Modules\Variant;

use App\Core\Database\Model;

class ProductVariantModel extends Model
{
    protected string $table = 'product_variants';
    protected array $fillable = [
        'product_id',
        'sku',
        'title',
        'price',
        'sale_price',
        'cost_price',
        'image_id',
        'position',
        'is_default',
        'is_active',
    ];

    public function getByProductId(int $productId, bool $activeOnly = false): array
    {
        $sql = "SELECT * FROM {$this->table} WHERE product_id = ?";
        if ($activeOnly) {
            $sql .= ' AND is_active = 1';
        }
        $sql .= ' ORDER BY position ASC, id ASC';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$productId]);
        return $stmt->fetchAll();
    }

    public function getDefault(int $productId): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM {$this->table}
            WHERE product_id = ? AND is_default = 1
            LIMIT 1
        ");
        $stmt->execute([$productId]);
        $row = $stmt->fetch();
        if ($row) {
            return $row;
        }

        $stmt = $this->pdo->prepare("
            SELECT * FROM {$this->table}
            WHERE product_id = ?
            ORDER BY position ASC, id ASC
            LIMIT 1
        ");
        $stmt->execute([$productId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function getWithDetails(int $variantId): ?array
    {
        $variant = $this->find($variantId);
        if (!$variant) {
            return null;
        }

        $variant['attribute_values'] = $this->getAttributeValues($variantId);

        $inv = new InventoryModel();
        $variant['inventory'] = $inv->getByVariantId($variantId) ?: [
            'quantity' => 0,
            'reserved_quantity' => 0,
            'low_stock_threshold' => null,
            'track_inventory' => 1,
        ];

        if (!empty($variant['image_id'])) {
            $stmt = $this->pdo->prepare('SELECT * FROM product_images WHERE id = ?');
            $stmt->execute([$variant['image_id']]);
            $variant['image'] = $stmt->fetch() ?: null;
        }

        return $variant;
    }

    public function getAttributeValues(int $variantId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT av.*, at.name AS type_name, at.slug AS type_slug, at.input_type
            FROM variant_attribute_values vav
            JOIN attribute_values av ON av.id = vav.attribute_value_id
            JOIN attribute_types at ON at.id = av.attribute_type_id
            WHERE vav.variant_id = ?
            ORDER BY at.sort_order ASC, av.sort_order ASC
        ");
        $stmt->execute([$variantId]);
        return $stmt->fetchAll();
    }

    public function skuExists(string $sku, ?int $excludeId = null): bool
    {
        return $this->exists('sku', $sku, $excludeId);
    }

    public function unsetDefault(int $productId): void
    {
        $this->pdo->prepare("
            UPDATE {$this->table} SET is_default = 0 WHERE product_id = ?
        ")->execute([$productId]);
    }

    public function setAttributeValues(int $variantId, array $valueIds): void
    {
        $this->pdo->prepare('DELETE FROM variant_attribute_values WHERE variant_id = ?')
            ->execute([$variantId]);

        $stmt = $this->pdo->prepare('
            INSERT INTO variant_attribute_values (variant_id, attribute_value_id) VALUES (?, ?)
        ');
        foreach ($valueIds as $valueId) {
            $stmt->execute([$variantId, (int) $valueId]);
        }
    }

    public function deleteByProductId(int $productId): void
    {
        $this->pdo->prepare("DELETE FROM {$this->table} WHERE product_id = ?")
            ->execute([$productId]);
    }

    public function countByProductId(int $productId): int
    {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM {$this->table} WHERE product_id = ?");
        $stmt->execute([$productId]);
        return (int) $stmt->fetchColumn();
    }
}
