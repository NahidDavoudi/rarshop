<?php

namespace App\Modules\Product;

use App\Core\Database\Model;

class ProductImageModel extends Model
{
    protected string $table = 'product_images';
    protected bool $timestamps = false;  // فقط created_at دارد
    protected array $fillable = [
        'product_id',
        'image_url',
        'image_large_url',
        'image_medium_url',
        'image_thumb_url',
        'alt_text',
        'is_main',
        'sort_order',
    ];

    public function getByProductId(int $productId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM {$this->table}
            WHERE product_id = ?
            ORDER BY is_main DESC, sort_order ASC
        ");
        $stmt->execute([$productId]);
        return $stmt->fetchAll();
    }

    public function getMainImage(int $productId): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM {$this->table}
            WHERE product_id = ? AND is_main = 1
            LIMIT 1
        ");
        $stmt->execute([$productId]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function unsetMain(int $productId): void
    {
        $this->pdo->prepare("
            UPDATE {$this->table} SET is_main = 0 WHERE product_id = ?
        ")->execute([$productId]);
    }

    public function setMain(int $imageId, int $productId): bool
    {
        $this->unsetMain($productId);
        return parent::update($imageId, ['is_main' => 1]);
    }

    public function deleteAllForProduct(int $productId): bool
    {
        $stmt = $this->pdo->prepare(
            "DELETE FROM {$this->table} WHERE product_id = ?"
        );
        return $stmt->execute([$productId]);
    }
}