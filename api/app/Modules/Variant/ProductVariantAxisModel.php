<?php

namespace App\Modules\Variant;

use App\Core\Database\Model;
use App\Utils\SlugHelper;

class ProductVariantAxisModel extends Model
{
    protected string $table = 'product_variant_axes';
    protected array $fillable = ['product_id', 'name', 'slug', 'input_type', 'sort_order', 'is_active'];
    protected bool $timestamps = true;

    public function getByProductId(int $productId, bool $activeOnly = true): array
    {
        $sql = "SELECT * FROM {$this->table} WHERE product_id = ?";
        if ($activeOnly) $sql .= ' AND is_active = 1';
        $sql .= ' ORDER BY sort_order ASC, id ASC';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$productId]);
        return $stmt->fetchAll();
    }

    public function getWithValues(int $productId, bool $activeOnly = true): array
    {
        $axes = $this->getByProductId($productId, $activeOnly);
        $valModel = new ProductAxisValueModel();
        foreach ($axes as &$axis) {
            $axis['values'] = $valModel->getByAxisId((int)$axis['id'], $activeOnly);
        }
        return $axes;
    }

    public function findActive(int $id): ?array
    {
        $row = $this->find($id);
        if (!$row || (int)($row['is_active'] ?? 1) !== 1) return null;
        return $row;
    }

    public function slugExistsInProduct(string $slug, int $productId, ?int $excludeId = null): bool
    {
        $sql = "SELECT COUNT(*) FROM {$this->table} WHERE product_id = ? AND slug = ?";
        $params = [$productId, $slug];
        if ($excludeId) { $sql .= " AND id != ?"; $params[] = $excludeId; }
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return (bool)$stmt->fetchColumn();
    }

    public function countActiveByProduct(int $productId): int
    {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM {$this->table} WHERE product_id = ? AND is_active = 1");
        $stmt->execute([$productId]);
        return (int)$stmt->fetchColumn();
    }

    /**
     * @deprecated is_variant_axis on attribute_types — keep for facets only
     */
    public function isVariantAxisDeprecated(): void {}
}
