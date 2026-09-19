<?php

namespace App\Modules\Variant;

use App\Core\Controller;
use App\Core\Http\Request;

class VariantController extends Controller
{
    private VariantService $service;

    public function __construct()
    {
        $this->service = new VariantService(
            new ProductVariantModel(),
            new InventoryModel(),
            new \App\Modules\Product\ProductModel(),
            new \App\Modules\Attribute\AttributeValueModel(),
        );
    }

    // POST /api/v1/admin/products/{id}/variants/generate
    public function generate(Request $request, int $id): void
    {
        try {
            $variants = $this->service->generateVariants($id, $request->input('axes', []));
            $this->created($variants, 'واریانت‌ها ایجاد شدند');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // POST /api/v1/admin/products/{id}/variants/preview
    public function previewGenerate(Request $request, int $id): void
    {
        try {
            $preview = $this->service->previewGenerate($id, $request->input('axes', []));
            $this->success($preview);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /api/v1/admin/products/{id}/variants/bulk
    public function bulkUpdate(Request $request, int $id): void
    {
        try {
            $variants = $this->service->bulkUpdate($id, $request->input('variants', []));
            $this->success($variants, 'واریانت‌ها بروزرسانی شدند');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // POST /api/v1/admin/products/{id}/variants/bulk-inventory
    public function bulkInventory(Request $request, int $id): void
    {
        try {
            $result = $this->service->bulkInventory($id, $request->all());
            $this->success($result, 'موجودی/قیمت گروهی اعمال شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /api/v1/admin/variants/{id}
    public function update(Request $request, int $id): void
    {
        try {
            $variant = $this->service->updateVariant($id, $request->all());
            $this->success($variant, 'واریانت بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ── Axis/Value CRUD ──
    public function listAxes(Request $request, int $id): void
    {
        try { $this->success($this->service->getProductAxes($id, false)); } catch (\RuntimeException $e) { $this->error($e->getMessage(), $e->getCode() ?: 400); }
    }

    public function createAxis(Request $request, int $id): void
    {
        try {
            $axis = $this->service->createAxis($id, $request->all());
            $this->created($axis);
        } catch (\RuntimeException $e) { $this->error($e->getMessage(), $e->getCode() ?: 400); }
    }

    public function updateAxis(Request $request, int $id, int $axisId): void
    {
        try {
            $axis = $this->service->updateAxis($axisId, $request->all());
            $this->success($axis);
        } catch (\RuntimeException $e) { $this->error($e->getMessage(), $e->getCode() ?: 400); }
    }

    public function deactivateAxis(Request $request, int $id, int $axisId): void
    {
        try {
            $axis = $this->service->deactivateAxis($axisId);
            $this->success($axis, 'محور غیرفعال شد');
        } catch (\RuntimeException $e) { $this->error($e->getMessage(), $e->getCode() ?: 400); }
    }

    public function addAxisWithAssignment(Request $request, int $id): void
    {
        try {
            $axis = $this->service->addAxisToProductWithAssignment($id, $request->all());
            $this->created($axis);
        } catch (\RuntimeException $e) { $this->error($e->getMessage(), $e->getCode() ?: 400); }
    }

    public function createAxisValue(Request $request, int $id, int $axisId): void
    {
        try {
            $val = $this->service->createAxisValue($axisId, $request->all());
            $this->created($val);
        } catch (\RuntimeException $e) { $this->error($e->getMessage(), $e->getCode() ?: 400); }
    }

    public function updateAxisValue(Request $request, int $id, int $axisId, int $valueId): void
    {
        try {
            $val = $this->service->updateAxisValue($valueId, $request->all());
            $this->success($val);
        } catch (\RuntimeException $e) { $this->error($e->getMessage(), $e->getCode() ?: 400); }
    }

    public function deactivateAxisValue(Request $request, int $id, int $axisId, int $valueId): void
    {
        try {
            $val = $this->service->deactivateAxisValue($valueId);
            $this->success($val, 'مقدار غیرفعال شد');
        } catch (\RuntimeException $e) { $this->error($e->getMessage(), $e->getCode() ?: 400); }
    }

    public function mergeAxisValues(Request $request, int $id, int $axisId): void
    {
        try {
            $keep = (int)$request->input('keep_value_id');
            $lose = (int)$request->input('lose_value_id');
            $val = $this->service->mergeAxisValues($axisId, $keep, $lose);
            $this->success($val, 'مقادیر ادغام شدند');
        } catch (\RuntimeException $e) { $this->error($e->getMessage(), $e->getCode() ?: 400); }
    }
}
