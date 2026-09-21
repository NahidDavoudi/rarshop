<?php

namespace App\Modules\Category;

use App\Core\Database\Model;

class CategoryImageModel extends Model
{
    protected string $table = 'category_images';
    protected bool $timestamps = false;  // جدول فقط created_at دارد، updated_at ندارد
    protected array $fillable = [
        'category_id',
        'image_url',
        'image_large_url',
        'image_medium_url',
        'image_thumb_url',
        'alt_text',
        'is_main',
        'sort_order',
    ];

    public function getByCategoryId(int $categoryId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM {$this->table}
            WHERE category_id = ?
            ORDER BY is_main DESC, sort_order ASC
        ");
        $stmt->execute([$categoryId]);
        return $stmt->fetchAll();
    }

    public function getMainImage(int $categoryId): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM {$this->table}
            WHERE category_id = ? AND is_main = 1
            LIMIT 1
        ");
        $stmt->execute([$categoryId]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    // قبل از set کردن تصویر اصلی جدید، بقیه رو unset می‌کنیم
    public function unsetMain(int $categoryId): void
    {
        $this->pdo->prepare("
            UPDATE {$this->table} SET is_main = 0 WHERE category_id = ?
        ")->execute([$categoryId]);
    }

    public function setMain(int $imageId, int $categoryId): bool
    {
        $this->unsetMain($categoryId);
        return parent::update($imageId, ['is_main' => 1]);
    }

    public function deleteAllForCategory(int $categoryId): bool
    {
        $stmt = $this->pdo->prepare(
            "DELETE FROM {$this->table} WHERE category_id = ?"
        );
        return $stmt->execute([$categoryId]);
    }
}
