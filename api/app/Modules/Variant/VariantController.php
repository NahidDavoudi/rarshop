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
}
