<?php

namespace App\Modules\Order;

use App\Core\Database\Model;

class OrderItemModel extends Model
{
    protected string $table = 'order_items';
    protected bool $timestamps = false;
    protected array $fillable = [
        'order_id',
        'product_id',
        'variant_id',
        'variant_title',
        'sku',
        'quantity',
        'price',
    ];

    public function getByOrderId(int $orderId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT oi.*,
                   p.name AS product_name,
                   p.slug AS product_slug,
                   (SELECT pi.image_url FROM product_images pi
                    WHERE pi.product_id = oi.product_id AND pi.is_main = 1
                    LIMIT 1) AS product_image
            FROM {$this->table} oi
            LEFT JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = ?
        ");
        $stmt->execute([$orderId]);
        return $stmt->fetchAll();
    }

    public function createBulk(int $orderId, array $items): void
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO {$this->table}
                (order_id, product_id, variant_id, variant_title, sku, quantity, price)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        foreach ($items as $item) {
            $stmt->execute([
                $orderId,
                $item['product_id'],
                $item['variant_id'] ?? null,
                $item['variant_title'] ?? null,
                $item['sku'] ?? null,
                $item['quantity'],
                $item['price'],
            ]);
        }
    }
}
