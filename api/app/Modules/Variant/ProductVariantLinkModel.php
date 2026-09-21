<?php

namespace App\Modules\Variant;

use App\Core\Database\Model;

class ProductVariantLinkModel extends Model
{
    protected string $table = 'product_variant_links';
    protected array $fillable = ['variant_id', 'axis_id', 'axis_value_id'];
    protected bool $timestamps = false;

    public function getByVariantId(int $variantId): array
    {
        $stmt = $this->pdo->prepare("SELECT pvl.*, pav.value, pav.slug AS value_slug, pav.swatch_hex, pva.name AS axis_name, pva.slug AS axis_slug, pva.input_type FROM {$this->table} pvl JOIN product_axis_values pav ON pav.id = pvl.axis_value_id JOIN product_variant_axes pva ON pva.id = pvl.axis_id WHERE pvl.variant_id = ? ORDER BY pva.sort_order, pav.sort_order");
        $stmt->execute([$variantId]);
        return $stmt->fetchAll();
    }

    public function getByProductId(int $productId): array
    {
        $stmt = $this->pdo->prepare("SELECT pvl.* FROM {$this->table} pvl JOIN product_variants pv ON pv.id = pvl.variant_id WHERE pv.product_id = ?");
        $stmt->execute([$productId]);
        return $stmt->fetchAll();
    }

    public function setLinks(int $variantId, array $axisValuePairs): void
    {
        // $axisValuePairs = [[axis_id, axis_value_id], ...]
        $this->pdo->prepare('DELETE FROM product_variant_links WHERE variant_id = ?')->execute([$variantId]);
        $stmt = $this->pdo->prepare('INSERT INTO product_variant_links (variant_id, axis_id, axis_value_id) VALUES (?,?,?)');
        foreach ($axisValuePairs as [$axisId, $valueId]) {
            $stmt->execute([$variantId, (int)$axisId, (int)$valueId]);
        }
    }

    public function deleteByVariantId(int $variantId): void
    {
        $this->pdo->prepare('DELETE FROM product_variant_links WHERE variant_id = ?')->execute([$variantId]);
    }
}
