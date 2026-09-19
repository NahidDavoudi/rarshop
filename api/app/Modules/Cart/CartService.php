<?php

namespace App\Modules\Cart;

use App\Modules\Discount\DiscountModel;
use App\Modules\Product\ProductModel;
use App\Modules\Variant\InventoryModel;
use App\Modules\Variant\VariantService;

class CartService
{
    public function __construct(
        private CartModel     $cartModel,
        private CartItemModel $itemModel,
        private ProductModel  $productModel,
        private DiscountModel $discountModel,
        private VariantService $variantService,
        private InventoryModel $inventoryModel,
    ) {}

    public function getCart(int $userId): array
    {
        $cart = $this->cartModel->getCartWithItems($userId);

        if (!$cart) {
            $this->cartModel->getOrCreateForUser($userId);
            return $this->emptyCart();
        }

        return $cart;
    }

    public function addItem(int $userId, int $productId, int $qty = 1, ?int $variantId = null): array
    {
        if ($qty < 1) {
            throw new \RuntimeException('تعداد باید حداقل ۱ باشد.', 422);
        }

        $product = $this->productModel->find($productId);
        if (!$product || !$product['is_active']) {
            throw new \RuntimeException('محصول یافت نشد.', 404);
        }

        if ($this->variantService->requiresExplicitVariant($productId) && !$variantId) {
            throw new \RuntimeException('لطفاً سایز یا رنگ محصول را انتخاب کنید.', 422);
        }

        $variantId = $this->variantService->resolveVariantId($productId, $variantId);
        $variant   = $this->variantService->getProductVariants($productId);
        $variantRow = null;
        foreach ($variant as $v) {
            if ((int) $v['id'] === $variantId) {
                $variantRow = $v;
                break;
            }
        }
        if (!$variantRow || !$variantRow['is_active']) {
            throw new \RuntimeException('واریانت یافت نشد.', 404);
        }

        $available = $this->inventoryModel->getAvailable($variantId);
        $cart      = $this->cartModel->getOrCreateForUser($userId);
        $existing  = $this->itemModel->findByCartAndVariant($cart['id'], $variantId);
        $totalNeeded = ($existing ? $existing['quantity'] : 0) + $qty;

        if ($available < $totalNeeded) {
            throw new \RuntimeException(
                "موجودی کافی نیست. فقط {$available} عدد در انبار موجود است.",
                422
            );
        }

        $this->itemModel->addOrIncrement($cart['id'], $productId, $variantId, $qty);

        return $this->getCart($userId);
    }

    public function updateItem(int $userId, int $productId, int $qty, ?int $variantId = null): array
    {
        $product = $this->productModel->find($productId);
        if (!$product || !$product['is_active']) {
            throw new \RuntimeException('محصول یافت نشد.', 404);
        }

        if ($this->variantService->requiresExplicitVariant($productId) && !$variantId) {
            throw new \RuntimeException('لطفاً سایز یا رنگ محصول را انتخاب کنید.', 422);
        }

        $variantId = $this->variantService->resolveVariantId($productId, $variantId);
        $available = $this->inventoryModel->getAvailable($variantId);

        if ($qty > $available) {
            throw new \RuntimeException(
                "موجودی کافی نیست. فقط {$available} عدد در انبار موجود است.",
                422
            );
        }

        $cart = $this->cartModel->findByUserId($userId);
        if (!$cart) {
            throw new \RuntimeException('سبد خرید یافت نشد.', 404);
        }

        $this->itemModel->updateQuantityByVariant($cart['id'], $variantId, $qty);

        return $this->getCart($userId);
    }

    public function removeItem(int $userId, int $productId, ?int $variantId = null): array
    {
        $cart = $this->cartModel->findByUserId($userId);
        if (!$cart) {
            throw new \RuntimeException('سبد خرید یافت نشد.', 404);
        }

        if ($variantId) {
            $this->itemModel->removeByVariant($cart['id'], $variantId);
        } else {
            $this->itemModel->removeItem($cart['id'], $productId);
        }

        return $this->getCart($userId);
    }

    public function clearCart(int $userId): void
    {
        $cart = $this->cartModel->findByUserId($userId);
        if ($cart) {
            $this->cartModel->clearCart($cart['id']);
        }
    }

    public function mergeGuestItems(int $userId, array $items): array
    {
        foreach ($items as $item) {
            $productId = (int) ($item['product_id'] ?? 0);
            $variantId = (int) ($item['variant_id'] ?? 0) ?: null;
            $qty       = max(1, (int) ($item['qty'] ?? $item['quantity'] ?? 1));

            if (!$productId) {
                continue;
            }

            try {
                $this->addItem($userId, $productId, $qty, $variantId);
            } catch (\RuntimeException) {
                continue;
            }
        }

        return $this->getCart($userId);
    }

    public function applyDiscount(int $userId, string $code): array
    {
        $cart = $this->getCart($userId);

        if (empty($cart['items'])) {
            throw new \RuntimeException('سبد خرید خالی است.', 422);
        }

        $discount = $this->discountModel->findValidCode($code);
        if (!$discount) {
            throw new \RuntimeException('کد تخفیف معتبر نیست یا منقضی شده.', 422);
        }

        $discountAmount = $this->discountModel->calculateDiscount($discount, $cart['total']);

        return [
            'cart'            => $cart,
            'discount_code'   => $discount,
            'discount_amount' => $discountAmount,
            'final_total'     => max(0, $cart['total'] - $discountAmount),
        ];
    }

    public function validateForCheckout(int $userId): array
    {
        $cart = $this->getCart($userId);

        if (empty($cart['items'])) {
            throw new \RuntimeException('سبد خرید خالی است.', 422);
        }

        $errors = [];
        foreach ($cart['items'] as $item) {
            if (!$item['is_active']) {
                $errors[] = "محصول «{$item['name']}» دیگر فعال نیست.";
                continue;
            }

            if ($this->variantService->requiresExplicitVariant((int) $item['product_id'])
                && empty($item['variant_id'])) {
                $errors[] = "برای «{$item['name']}» باید سایز یا رنگ انتخاب شود. لطفاً از سبد حذف و دوباره اضافه کنید.";
                continue;
            }

            if (!empty($item['variant_id'])) {
                $available = $this->inventoryModel->getAvailable((int) $item['variant_id']);
                if ($available < $item['quantity']) {
                    $errors[] = "موجودی «{$item['name']}» کافی نیست (موجود: {$available}).";
                }
                continue;
            }

            if ($item['stock'] < $item['quantity']) {
                $errors[] = "موجودی «{$item['name']}» کافی نیست (موجود: {$item['stock']}).";
            }
        }

        if (!empty($errors)) {
            throw new \RuntimeException(implode(' | ', $errors), 422);
        }

        return $cart;
    }

    private function emptyCart(): array
    {
        return ['items' => [], 'total' => 0];
    }
}
