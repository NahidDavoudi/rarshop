<?php

namespace App\Modules\Attribute;

use App\Core\Database\Model;

class AttributeValueModel extends Model
{
    protected string $table = 'attribute_values';
    protected array $fillable = [
        'attribute_type_id',
        'value',
        'slug',
        'swatch_hex',
        'metadata',
        'sort_order',
    ];

    public function getByTypeId(int $typeId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM {$this->table}
            WHERE attribute_type_id = ?
            ORDER BY sort_order ASC, value ASC
        ");
        $stmt->execute([$typeId]);
        return $stmt->fetchAll();
    }

    public function getByIds(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->pdo->prepare("
            SELECT av.*, at.name AS type_name, at.slug AS type_slug, at.input_type
            FROM {$this->table} av
            JOIN attribute_types at ON at.id = av.attribute_type_id
            WHERE av.id IN ({$placeholders})
            ORDER BY at.sort_order ASC, av.sort_order ASC
        ");
        $stmt->execute(array_values($ids));
        return $stmt->fetchAll();
    }
}
