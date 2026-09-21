<?php

namespace App\Modules\Variant;

use App\Core\Database\Model;

class ProductAxisValueModel extends Model
{
    protected string $table = 'product_axis_values';
    protected array $fillable = ['axis_id', 'value', 'slug', 'swatch_hex', 'sort_order', 'is_active'];
    protected bool $timestamps = true;

    public function getByAxisId(int $axisId, bool $activeOnly = true): array
    {
        $sql = "SELECT * FROM {$this->table} WHERE axis_id = ?";
        if ($activeOnly) $sql .= ' AND is_active = 1';
        $sql .= ' ORDER BY sort_order ASC, id ASC';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$axisId]);
        return $stmt->fetchAll();
    }

    public function getByIds(array $ids): array
    {
        if (empty($ids)) return [];
        $ph = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->pdo->prepare("SELECT pav.*, pva.product_id, pva.name AS axis_name, pva.slug AS axis_slug, pva.input_type FROM {$this->table} pav JOIN product_variant_axes pva ON pva.id = pav.axis_id WHERE pav.id IN ($ph) ORDER BY pva.sort_order, pav.sort_order");
        $stmt->execute(array_values($ids));
        return $stmt->fetchAll();
    }

    public function findActive(int $id): ?array
    {
        $row = $this->find($id);
        if (!$row || (int)($row['is_active'] ?? 1) !== 1) return null;
        return $row;
    }

    public function slugExistsInAxis(string $slug, int $axisId, ?int $excludeId = null): bool
    {
        $sql = "SELECT COUNT(*) FROM {$this->table} WHERE axis_id = ? AND slug = ?";
        $params = [$axisId, $slug];
        if ($excludeId) { $sql .= " AND id != ?"; $params[] = $excludeId; }
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return (bool)$stmt->fetchColumn();
    }

    public function validateHex(?string $hex): ?string
    {
        if ($hex === null || $hex === '') return null;
        $hex = trim($hex);
        if (!str_starts_with($hex, '#')) $hex = '#' . $hex;
        if (!preg_match('/^#[0-9a-fA-F]{6}$/', $hex)) return null;
        return strtoupper($hex);
    }
}
