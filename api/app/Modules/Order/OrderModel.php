<?php

namespace App\Modules\Order;

use App\Core\Database\Model;

class OrderModel extends Model
{
    protected string $table = 'orders';
    protected array $fillable = [
        'order_number',
        'user_id',
        'customer_name',
        'customer_email',
        'customer_phone',
        'shipping_address',
        'total_amount',
        'discount_code_id',
        'payment_method',
        'status',
        'notes',
        'cancel_reason',
    ];
    protected bool $timestamps = true;

    public const STATUSES = ['pending', 'pending_payment', 'paid', 'shipped', 'delivered', 'cancelled'];

    public function findByOrderNumber(string $orderNumber): ?array
    {
        return $this->findBy('order_number', $orderNumber);
    }

    public function getFullOrder(int $id): ?array
    {
        $order = $this->find($id);
        if (!$order) return null;

        $order['items'] = $this->getItems($id);
        return $order;
    }

    public function getItems(int $orderId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT oi.*,
                   p.name AS product_name,
                   oi.variant_title AS variant_label,
                   (SELECT pi.image_url FROM product_images pi
                    WHERE pi.product_id = oi.product_id AND pi.is_main = 1
                    LIMIT 1) AS product_image
            FROM order_items oi
            LEFT JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = ?
        ");
        $stmt->execute([$orderId]);
        return $stmt->fetchAll();
    }

    public function getByUser(int $userId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM {$this->table}
            WHERE user_id = ?
            ORDER BY created_at DESC
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    public function updateStatus(int $id, string $status, ?string $cancelReason = null): bool
    {
        if (!in_array($status, self::STATUSES)) return false;

        $data = ['status' => $status];
        if ($status === 'cancelled' && $cancelReason !== null) {
            $data['cancel_reason'] = trim($cancelReason);
        }

        return parent::update($id, $data);
    }

    public function paginateForAdmin(int $page = 1, int $limit = 20, ?string $status = null): array
    {
        $where  = ['1=1'];
        $params = [];

        if ($status && in_array($status, self::STATUSES)) {
            $where[]  = 'status = ?';
            $params[] = $status;
        }

        $whereStr = implode(' AND ', $where);
        $offset   = ($page - 1) * $limit;

        $stmt = $this->pdo->prepare("
            SELECT o.*,
                   u.name AS user_name,
                   (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
            FROM {$this->table} o
            LEFT JOIN users u ON u.id = o.user_id
            WHERE {$whereStr}
            ORDER BY o.created_at DESC
            LIMIT {$limit} OFFSET {$offset}
        ");
        $stmt->execute($params);
        $items = $stmt->fetchAll();

        $countStmt = $this->pdo->prepare(
            "SELECT COUNT(*) FROM {$this->table} WHERE {$whereStr}"
        );
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        return [
            'data'      => $items,
            'total'     => $total,
            'page'      => $page,
            'limit'     => $limit,
            'last_page' => (int) ceil($total / $limit),
        ];
    }

    public static function generateOrderNumber(): string
    {
        return 'GB-' . strtoupper(substr(uniqid(), -6));
    }
}