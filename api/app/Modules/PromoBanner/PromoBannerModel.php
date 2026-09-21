<?php

namespace App\Modules\PromoBanner;

use App\Core\Database\Model;

class PromoBannerModel extends Model
{
    protected string $table = 'promo_banners';
    protected array $fillable = [
        'title',
        'image_url',
        'image_large_url',
        'image_medium_url',
        'image_thumb_url',
        'sort_order',
        'is_active',
    ];

    public function getAllOrdered(): array
    {
        $stmt = $this->pdo->query(
            "SELECT * FROM {$this->table} ORDER BY sort_order ASC, id ASC"
        );
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getActive(): array
    {
        $stmt = $this->pdo->query(
            "SELECT id, title, image_url, image_large_url, image_medium_url, image_thumb_url, sort_order
             FROM {$this->table}
             WHERE is_active = 1
             ORDER BY sort_order ASC, id ASC"
        );
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getNextSortOrder(): int
    {
        $stmt = $this->pdo->query(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM {$this->table}"
        );
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return (int) ($row['next_order'] ?? 0);
    }

    public function reorder(array $ids): void
    {
        $this->pdo->beginTransaction();
        try {
            foreach (array_values($ids) as $index => $id) {
                $stmt = $this->pdo->prepare(
                    "UPDATE {$this->table} SET sort_order = :sort_order WHERE id = :id"
                );
                $stmt->execute([
                    'sort_order' => $index,
                    'id'         => (int) $id,
                ]);
            }
            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
