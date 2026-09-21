<?php

namespace App\Modules\Attribute;

use App\Core\Database\Model;

class AttributeTypeModel extends Model
{
    protected string $table = 'attribute_types';
    protected array $fillable = [
        'name',
        'slug',
        'input_type',
        'is_variant_axis',
        'is_filterable',
        'is_required',
        'sort_order',
    ];

    public function getAllWithValues(): array
    {
        $types = $this->all(['sort_order' => 'ASC', 'name' => 'ASC']);
        $valueModel = new AttributeValueModel();

        foreach ($types as &$type) {
            $type['values'] = $valueModel->getByTypeId((int) $type['id']);
        }

        return $types;
    }

    public function getVariantAxes(): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM {$this->table}
            WHERE is_variant_axis = 1
            ORDER BY sort_order ASC, name ASC
        ");
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getFilterableTypes(): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM {$this->table}
            WHERE is_filterable = 1
            ORDER BY sort_order ASC, name ASC
        ");
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function slugExists(string $slug, ?int $excludeId = null): bool
    {
        return $this->exists('slug', $slug, $excludeId);
    }
}
