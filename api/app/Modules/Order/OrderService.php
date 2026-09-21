<?php

namespace App\Modules\Order;

use App\Core\Database\Database;
use App\Modules\Cart\CartModel;
use App\Modules\Cart\CartService;
use App\Modules\Discount\DiscountModel;
use App\Modules\Product\ProductModel;
use App\Modules\Variant\VariantService;
use App\Modules\Settings\SettingsService;
use App\Modules\Payment\PaymentService;

class OrderService
{
    public function __construct(
        private OrderModel          $orderModel,
        private OrderItemModel      $itemModel,
        private CartModel           $cartModel,
        private CartService         $cartService,
        private ProductModel        $productModel,
        private DiscountModel       $discountModel,
        private VariantService      $variantService,
        private SettingsService     $settingsService,
        private PaymentService      $paymentService,
    ) {}

    // ─── User: place order ────────────────────────────────────────

    public function placeOrder(int $userId, array $data): array
    {
        $this->validateOrderData($data);

        $cart = $this->cartService->validateForCheckout($userId);
        $shippingSettings = $this->settingsService->getShippingSettings();
        $shippingFee = $shippingSettings['standard_cost'];
        $total = $cart['total'] + $shippingFee;
        $discountCodeId = null;
        $discountAmount = 0;

        if (!empty($data['discount_code'])) {
            $discount = $this->discountModel->findValidCode($data['discount_code']);
            if (!$discount) {
                throw new \RuntimeException('کد تخفیف معتبر نیست.', 422);
            }
            $discountAmount = $this->discountModel->calculateDiscount($discount, $total);
            $discountCodeId = $discount['id'];
            $total = max(0, $total - $discountAmount);
        }

        $pdo = Database::getInstance()->getConnection();

        try {
            $pdo->beginTransaction();

            $orderId = $this->orderModel->create([
                'order_number'    => OrderModel::generateOrderNumber(),
                'user_id'         => $userId,
                'customer_name'   => trim($data['customer_name']),
                'customer_email'  => trim($data['customer_email'] ?? ''),
                'customer_phone'  => trim($data['customer_phone']),
                'shipping_address'=> trim($data['shipping_address']),
                'total_amount'    => $total,
                'discount_code_id'=> $discountCodeId,
                'payment_method'  => 'card',
                'status'          => 'pending',
                'notes'           => trim($data['notes'] ?? ''),
            ]);

            // ثبت آیتم‌ها و کاهش موجودی
            $orderItems = [];
            foreach ($cart['items'] as $item) {
                $variantId = (int) ($item['variant_id'] ?? 0);
                $productId = (int) $item['product_id'];

                if (!$variantId && $this->variantService->requiresExplicitVariant($productId)) {
                    throw new \RuntimeException(
                        "برای «{$item['name']}» باید سایز یا رنگ انتخاب شود. لطفاً از سبد حذف و دوباره اضافه کنید.",
                        422
                    );
                }

                $orderItems[] = [
                    'product_id'     => $item['product_id'],
                    'variant_id'     => $variantId ?: null,
                    'variant_title'  => $item['variant_label'] ?? $item['variant_title'] ?? null,
                    'sku'            => $item['sku'] ?? null,
                    'quantity'       => $item['quantity'],
                    'price'          => $item['price'],
                ];
                if ($variantId) {
                    $this->variantService->decrementStock($variantId, $item['quantity']);
                } else {
                    $ok = $this->productModel->decrementStock($item['product_id'], $item['quantity']);
                    if (!$ok) {
                        throw new \RuntimeException("موجودی «{$item['name']}» کافی نیست.", 422);
                    }
                }
            }
            $this->itemModel->createBulk($orderId, $orderItems);

            // خالی کردن سبد
            $cartRecord = $this->cartModel->findByUserId($userId);
            if ($cartRecord) {
                $this->cartModel->clearCart($cartRecord['id']);
            }

            $pdo->commit();

        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        $order = $this->getFullOrder($orderId, $userId);

        // اگر روش پرداخت آنلاین است، درخواست به درگاه
        if ($data['payment_method'] === 'card') {
            $result = $this->paymentService->initiate($orderId);
            if (!$result['success']) {
                throw new \RuntimeException('خطا در ایجاد تراکنش پرداخت: ' . ($result['error'] ?? ''));
            }
            // تغییر وضعیت به pending_payment
            $this->orderModel->update($orderId, ['status' => 'pending']);
            $order['payment_url'] = $result['redirect_url'];
        }

        return $order;
    }

    // ─── User: view ───────────────────────────────────────────────

    public function getUserOrders(int $userId): array
    {
        $orders = $this->orderModel->getByUser($userId);

        return array_map(function (array $order) {
            $order['items'] = $this->orderModel->getItems($order['id']);
            return $order;
        }, $orders);
    }

    public function getOrderForUser(int $orderId, int $userId): array
    {
        $order = $this->orderModel->find($orderId);
        if (!$order || $order['user_id'] !== $userId) {
            throw new \RuntimeException('سفارش یافت نشد.', 404);
        }
        return $this->getFullOrder($orderId, $userId);
    }

    public function getOrderByNumber(string $orderNumber, int $userId): array
    {
        $order = $this->orderModel->findByOrderNumber($orderNumber);
        if (!$order || $order['user_id'] !== $userId) {
            throw new \RuntimeException('سفارش یافت نشد.', 404);
        }
        return $this->getFullOrder($order['id'], $userId);
    }

    // ─── Admin ────────────────────────────────────────────────────

    public function paginateForAdmin(int $page = 1, int $limit = 20, ?string $status = null): array
    {
        $result = $this->orderModel->paginateForAdmin($page, $limit, $status);
        // در صورت نیاز می‌توانید تراکنش را نیز اضافه کنید
        return $result;
    }

    public function getFullOrder(int $orderId, ?int $userId = null): array
    {
        $order = $this->orderModel->find($orderId);
        if (!$order) {
            throw new \RuntimeException('سفارش یافت نشد.', 404);
        }
        if ($userId !== null && $order['user_id'] !== $userId) {
            throw new \RuntimeException('سفارش یافت نشد.', 404);
        }
        $order['items'] = $this->orderModel->getItems($orderId);
        return $order;
    }

    public function updateStatus(int $orderId, string $status, ?string $cancelReason = null): array
    {
        $order = $this->orderModel->find($orderId);
        if (!$order) {
            throw new \RuntimeException('سفارش یافت نشد.', 404);
        }

        $ok = $this->orderModel->updateStatus($orderId, $status, $cancelReason);
        if (!$ok) {
            throw new \RuntimeException('وضعیت ارسالی معتبر نیست.', 422);
        }

        // اگه سفارش لغو شد، موجودی رو برگردون
        if ($status === 'cancelled' && $order['status'] !== 'cancelled') {
            $items = $this->itemModel->getByOrderId($orderId);
            foreach ($items as $item) {
                if (!empty($item['variant_id'])) {
                    $this->variantService->incrementStock((int) $item['variant_id'], $item['quantity']);
                } else {
                    $this->productModel->incrementStock($item['product_id'], $item['quantity']);
                }
            }
        }

        return $this->getFullOrder($orderId);
    }

    public function cancelOrder(int $orderId, int $userId): array
    {
        $order = $this->orderModel->find($orderId);
        if (!$order || $order['user_id'] !== $userId) {
            throw new \RuntimeException('سفارش یافت نشد.', 404);
        }

        if (!in_array($order['status'], ['pending'])) {
            throw new \RuntimeException('فقط سفارش‌های در انتظار پرداخت قابل لغو هستند.', 422);
        }

        return $this->updateStatus($orderId, 'cancelled');
    }

    // ─── Private ─────────────────────────────────────────────────

    private function validateOrderData(array $data): void
    {
        $required = ['customer_name', 'customer_phone', 'shipping_address', 'payment_method'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new \RuntimeException("فیلد {$field} الزامی است.", 422);
            }
        }

        $validMethods = ['card']; // فقط این دو روش
        if (!in_array($data['payment_method'], $validMethods)) {
            throw new \RuntimeException('روش پرداخت معتبر نیست.', 422);
        }
    }
}