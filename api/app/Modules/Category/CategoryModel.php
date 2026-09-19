<?php

namespace App\Modules\Category;

use App\Core\Database\Model;

class CategoryModel extends Model
{
    protected string $table = 'categories';
    protected array $fillable = [
        'name',
        'slug',
        'description',
        'poster_image',
        'poster_image_medium',
        'poster_image_thumb',
    ];
    protected bool $timestamps = true;

    public function findBySlug(string $slug): ?array
    {
        return $this->findBy('slug', $slug);
    }

    public function findByName(string $name): ?array
    {
        return $this->findBy('name', $name);
    }

    public function getAllWithImageCount(): array
    {
        $stmt = $this->pdo->prepare("
            SELECT c.*,
                   COUNT(ci.id) AS image_count,
                   (SELECT ci2.image_url FROM category_images ci2
                    WHERE ci2.category_id = c.id AND ci2.is_main = 1
                    LIMIT 1) AS main_image
            FROM {$this->table} c
            LEFT JOIN category_images ci ON ci.category_id = c.id
            GROUP BY c.id
            ORDER BY c.name ASC
        ");
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function slugExists(string $slug, ?int $excludeId = null): bool
    {
        return $this->exists('slug', $slug, $excludeId);
    }
}
