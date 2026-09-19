<?php

namespace App\Modules\Size;

use App\Core\Database\Model;

class SizeModel extends Model
{
    protected string $table = 'size_guide_sets';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'name',
        'category',
        'columns_json',
        'rows_json',
    ];
    protected bool $timestamps = true;

    public function create(array $data): int
    {
        $data = $this->encodeJsonFields($data);
        return parent::create($data);
    }

    public function update(int|string $id, array $data): bool
    {
        $data = $this->encodeJsonFields($data);
        return parent::update($id, $data);
    }

    public function all(array $orderBy = []): array
    {
        $rows = parent::all($orderBy ?: ['name' => 'ASC']);
        return array_map([$this, 'decodeJsonFields'], $rows);
    }

    public function find(int|string $id): ?array
    {
        $row = parent::find($id);
        return $row ? $this->decodeJsonFields($row) : null;
    }

    public function isInUse(int $id): bool
    {
        $stmt = $this->pdo->prepare(
            "SELECT COUNT(*) FROM products WHERE size_guide_set_id = :id"
        );
        $stmt->execute(['id' => $id]);
        return (bool) $stmt->fetchColumn();
    }

    private function encodeJsonFields(array $data): array
    {
        if (isset($data['columns']) && is_array($data['columns'])) {
            $data['columns_json'] = json_encode($data['columns'], JSON_UNESCAPED_UNICODE);
            unset($data['columns']);
        }
        if (isset($data['rows']) && is_array($data['rows'])) {
            $data['rows_json'] = json_encode($data['rows'], JSON_UNESCAPED_UNICODE);
            unset($data['rows']);
        }
        return $data;
    }

    private function decodeJsonFields(array $row): array
    {
        $row['columns'] = json_decode($row['columns_json'] ?? '[]', true) ?? [];
        $row['rows'] = json_decode($row['rows_json'] ?? '[]', true) ?? [];
        unset($row['columns_json'], $row['rows_json']);
        return $row;
    }
}