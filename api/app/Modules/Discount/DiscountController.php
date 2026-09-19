<?php

namespace App\Modules\Discount;

use App\Core\Controller;
use App\Core\Http\Request;

class DiscountController extends Controller
{
    private DiscountService $service;

    public function __construct()
    {
        $this->service = new DiscountService(new DiscountModel());
    }

    // GET /api/v1/discounts/validate?code=X&total=500000
    public function validateCode(Request $request): void
    {
        $code  = trim($request->query('code', ''));
        $total = (int) $request->query('total', 0);

        if (!$code) {
            $this->error('کد تخفیف ارسال نشده', 422);
        }

        try {
            $result = $this->service->validate($code, $total);
            $this->success($result);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 422);
        }
    }

    // GET /api/v1/admin/discounts
    public function index(): void
    {
        $this->success($this->service->getAll());
    }

    // GET /api/v1/admin/discounts/active
    public function active(): void
    {
        $this->success($this->service->getActive());
    }

    // POST /api/v1/admin/discounts
    public function store(Request $request): void
    {
        $data = $request->only(['code', 'type', 'value', 'valid_from', 'valid_to', 'is_active']);

        try {
            $discount = $this->service->create($data);
            $this->created($discount);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /api/v1/admin/discounts/{id}
    public function update(Request $request, int $id): void
    {
        $data = $request->only(['code', 'type', 'value', 'valid_from', 'valid_to', 'is_active']);

        try {
            $discount = $this->service->update($id, $data);
            $this->success($discount, 'کد تخفیف بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PATCH /api/v1/admin/discounts/{id}/deactivate
    public function deactivate(Request $request, int $id): void
    {
        try {
            $this->service->deactivate($id);
            $this->success(null, 'کد تخفیف غیرفعال شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // DELETE /api/v1/admin/discounts/{id}
    public function destroy(Request $request, int $id): void
    {
        try {
            $this->service->delete($id);
            $this->noContent();
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}