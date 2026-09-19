<?php

namespace App\Modules\Order;

use App\Core\Controller;
use App\Core\Http\Request;
use App\Modules\Cart\CartModel;
use App\Modules\Cart\CartService;
use App\Modules\Cart\CartItemModel;
use App\Modules\Discount\DiscountModel;
use App\Modules\Product\ProductModel;
use App\Modules\Variant\VariantService;
use App\Modules\Variant\ProductVariantModel;
use App\Modules\Variant\InventoryModel;
use App\Modules\Attribute\AttributeValueModel;
use App\Modules\Settings\SettingsModel;
use App\Modules\Settings\SettingsService;
use App\Modules\Payment\PaymentService;

class OrderController extends Controller
{
    private OrderService $service;

    public function __construct()
    {
        $variantService = new VariantService(
            new ProductVariantModel(),
            new InventoryModel(),
            new ProductModel(),
            new AttributeValueModel(),
        );

        $cartService = new CartService(
            new CartModel(),
            new CartItemModel(),
            new ProductModel(),
            new DiscountModel(),
            $variantService,
            new InventoryModel(),
        );

        $this->service = new OrderService(
            new OrderModel(),
            new OrderItemModel(),
            new CartModel(),
            $cartService,
            new ProductModel(),
            new DiscountModel(),
            $variantService,
            new SettingsService(new SettingsModel),
            new PaymentService(),
        );
    }

    // POST /api/v1/orders
    public function store(Request $request): void
    {
        $data = $request->only([
            'customer_name', 'customer_email', 'customer_phone',
            'shipping_address', 'payment_method',
            'discount_code', 'notes',
        ]);

        try {
            $order = $this->service->placeOrder($request->userId(), $data);
            if (isset($order['payment_url'])) {
                $this->success([
                    'order'       => $order,
                    'payment_url' => $order['payment_url'],
                    'message'     => 'سفارش ثبت شد. لطفاً برای پرداخت به درگاه هدایت شوید.'
                ]);
            } else {
                $this->created($order, 'سفارش با موفقیت ثبت شد');
            }
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $this->exceptionStatus($e, 400));
        }
    }

    // GET /api/v1/orders
    public function index(Request $request): void
    {
        $orders = $this->service->getUserOrders($request->userId());
        $this->success($orders);
    }

    // GET /api/v1/orders/{id}
    public function show(Request $request, int $id): void
    {
        try {
            $isAdmin = $request->user()->role === 'admin';
            $userId  = $isAdmin ? null : $request->userId();
            $order   = $this->service->getFullOrder($id, $userId);
            $this->success($order);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $this->exceptionStatus($e, 404));
        }
    }

    // GET /api/v1/orders/number/{number}
    public function byNumber(Request $request, string $number): void
    {
        try {
            $order = $this->service->getOrderByNumber($number, $request->userId());
            $this->success($order);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $this->exceptionStatus($e, 404));
        }
    }

    // PATCH /api/v1/orders/{id}/cancel
    public function cancel(Request $request, int $id): void
    {
        try {
            $order = $this->service->cancelOrder($id, $request->userId());
            $this->success($order, 'سفارش لغو شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $this->exceptionStatus($e, 400));
        }
    }

    // ─── Admin ────────────────────────────────────────────────────

    // GET /api/v1/admin/orders?page=1&status=pending
    public function adminIndex(Request $request): void
    {
        $page   = (int) $request->query('page', 1);
        $limit  = (int) $request->query('limit', 20);
        $status = $request->query('status');

        $result = $this->service->paginateForAdmin($page, $limit, $status ?: null);
        $this->success($result);
    }

    // GET /api/v1/admin/orders/{id}
    public function adminShow(Request $request, int $id): void
    {
        try {
            $order = $this->service->getFullOrder($id);
            $this->success($order);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $this->exceptionStatus($e, 404));
        }
    }

    // PATCH /api/v1/admin/orders/{id}/status
    public function updateStatus(Request $request, int $id): void
    {
        $status = $request->input('status');
        $cancelReason = $request->input('cancel_reason');

        if (!$status) {
            $this->error('status الزامی است', 422);
        }

        try {
            $reason = ($status === 'cancelled') ? $cancelReason : null;
            $order = $this->service->updateStatus($id, $status, $reason);
            $this->success($order, 'وضعیت سفارش بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $this->exceptionStatus($e, 400));
        }
    }
}