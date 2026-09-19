<?php

namespace App\Modules\Cart;

use App\Core\Controller;
use App\Core\Http\Request;
use App\Modules\Product\ProductModel;
use App\Modules\Discount\DiscountModel;
use App\Modules\Variant\VariantService;
use App\Modules\Variant\ProductVariantModel;
use App\Modules\Variant\InventoryModel;
use App\Modules\Attribute\AttributeValueModel;

class CartController extends Controller
{
    private CartService $service;

    public function __construct()
    {
        $this->service = new CartService(
            new CartModel(),
            new CartItemModel(),
            new ProductModel(),
            new DiscountModel(),
            new VariantService(
                new ProductVariantModel(),
                new InventoryModel(),
                new ProductModel(),
                new AttributeValueModel(),
            ),
            new InventoryModel(),
        );
    }

    private function requireAuth(): void
    {
        if (!$this->isAuthenticated()) {
            $this->unauthorized();
        }
    }

    public function index(): void
    {
        $this->requireAuth();
        $this->success($this->service->getCart($this->userId()));
    }

    public function add(Request $request): void
    {
        $this->requireAuth();

        $productId = (int) $request->input('product_id');
        $variantId = (int) $request->input('variant_id') ?: null;
        $qty       = max(1, (int) $request->input('qty', 1));

        if (!$productId && !$variantId) {
            $this->error('product_id یا variant_id الزامی است', 422);
        }

        try {
            if (!$productId && $variantId) {
                $variant = (new ProductVariantModel())->find($variantId);
                $productId = (int) ($variant['product_id'] ?? 0);
            }
            $cart = $this->service->addItem($this->userId(), $productId, $qty, $variantId);
            $this->success($cart, 'محصول به سبد خرید اضافه شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    public function merge(Request $request): void
    {
        $this->requireAuth();

        $items = $request->input('items', []);
        if (!is_array($items)) {
            $this->error('فرمت آیتم‌های سبد نامعتبر است', 422);
        }

        try {
            $cart = $this->service->mergeGuestItems($this->userId(), $items);
            $this->success($cart, 'سبد خرید ادغام شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    public function update(Request $request): void
    {
        $this->requireAuth();

        $productId = (int) ($request->param('productId') ?: $request->input('product_id'));
        $variantId = (int) ($request->param('variantId') ?: $request->input('variant_id')) ?: null;
        $qty       = (int) $request->input('qty', 0);

        if (!$productId && !$variantId) {
            $this->error('product_id یا variant_id الزامی است', 422);
        }

        try {
            if (!$productId && $variantId) {
                $variant = (new ProductVariantModel())->find($variantId);
                $productId = (int) ($variant['product_id'] ?? 0);
            }
            $cart = $this->service->updateItem($this->userId(), $productId, $qty, $variantId);
            $this->success($cart, 'سبد خرید بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    public function clear(): void
    {
        $this->requireAuth();

        try {
            $this->service->clearCart($this->userId());
            $this->success(null, 'سبد خرید خالی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    public function remove(Request $request): void
    {
        $this->requireAuth();

        $productId = (int) ($request->param('productId') ?: $request->query('product_id'));
        $variantId = (int) ($request->param('variantId') ?: $request->query('variant_id')) ?: null;

        if (!$productId && !$variantId) {
            $this->error('product_id یا variant_id الزامی است', 422);
        }

        try {
            if (!$productId && $variantId) {
                $variant = (new ProductVariantModel())->find($variantId);
                $productId = (int) ($variant['product_id'] ?? 0);
            }
            $cart = $this->service->removeItem($this->userId(), $productId, $variantId);
            $this->success($cart, 'محصول از سبد خرید حذف شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    public function discount(Request $request): void
    {
        $this->requireAuth();

        $code = trim($request->input('code', ''));
        if (!$code) {
            $this->error('کد تخفیف الزامی است', 422);
        }

        try {
            $result = $this->service->applyDiscount($this->userId(), $code);
            $this->success($result, 'کد تخفیف اعمال شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}
