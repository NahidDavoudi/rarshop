<?php

namespace App\Modules\Product;

use App\Core\Controller;
use App\Core\Http\Request;
use App\Core\ImageVariants;
use App\Core\UploadHelper;

class ProductController extends Controller
{
    private ProductService $service;

    public function __construct()
    {
        $this->service = new ProductService(
            new ProductModel(),
            new ProductImageModel(),
            new \App\Modules\Variant\VariantService(
                new \App\Modules\Variant\ProductVariantModel(),
                new \App\Modules\Variant\InventoryModel(),
                new ProductModel(),
                new \App\Modules\Attribute\AttributeValueModel(),
            ),
            new \App\Modules\Attribute\AttributeTypeModel(),
        );
    }

    // GET /api/v1/products?page=1&limit=12&category_id=2&attrs[color]=black&price_min=...&q=...&sort=newest
    public function index(Request $request): void
    {
        $attrs = $request->query('attrs');
        if (!is_array($attrs)) {
            $attrs = [];
        }

        $filters = [
            'category_id' => $request->query('category_id'),
            'category'    => $request->query('category'),
            'featured'    => $request->query('featured'),
            'q'           => $request->query('q'),
            'sort'        => $request->query('sort', 'newest'),
            'page'        => (int) $request->query('page', 1),
            'limit'       => (int) $request->query('limit', 12),
            'price_min'   => $request->query('price_min'),
            'price_max'   => $request->query('price_max'),
            'attrs'       => $attrs,
        ];

        $this->success($this->service->list($filters));
    }

    // GET /api/v1/products/featured
    public function featured(Request $request): void
    {
        $limit = (int) $request->query('limit', 8);
        $this->success($this->service->getFeatured($limit));
    }

    // GET /api/v1/products/{id}
    public function show(Request $request, int $id): void
    {
        try {
            $this->success($this->service->getById($id));
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 404);
        }
    }

    // POST /api/v1/admin/products
    public function store(Request $request): void
    {
        $data = $request->only([
            'name', 'slug', 'description', 'short_description', 'full_description',
            'price', 'sale_price', 'category_id',
            'stock', 'low_stock_threshold', 'featured', 'is_active', 'status', 'product_type',
            'size_guide_set_id',
        ]);

        try {
            $product = $this->service->create($data);
            $this->created($product);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /api/v1/admin/products/{id}
    public function update(Request $request, int $id): void
    {
        $data = $request->only([
            'name', 'slug', 'description', 'short_description', 'full_description',
            'price', 'sale_price', 'category_id',
            'stock', 'low_stock_threshold', 'featured', 'is_active', 'status', 'product_type',
            'size_guide_set_id',
        ]);

        try {
            $product = $this->service->update($id, $data);
            $this->success($product, 'محصول بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // DELETE /api/v1/admin/products/{id}
    public function destroy(Request $request, int $id): void
    {
        try {
            $this->service->delete($id);
            $this->noContent();
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PATCH /api/v1/admin/products/{id}/toggle
    public function toggle(Request $request, int $id): void
    {
        try {
            $product = $this->service->toggleActive($id);
            $status  = $product['is_active'] ? 'فعال' : 'غیرفعال';
            $this->success($product, "محصول {$status} شد");
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // POST /api/v1/admin/products/{id}/images
    public function addImage(Request $request, int $id): void
    {
        $file = $_FILES['image'] ?? null;

        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->error('تصویر ارسال نشده', 422);
        }

        try {
            $variants = UploadHelper::storeOptimizedImage($file, 'products');
            $image = $this->service->addImage($id, ImageVariants::imageFields($variants) + [
                'alt_text'   => $request->input('alt_text', ''),
                'is_main'    => (int) $request->input('is_main', 0),
                'sort_order' => (int) $request->input('sort_order', 0),
            ]);
            $this->created(ImageVariants::enrichRow($image), 'تصویر اضافه شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PATCH /api/v1/admin/products/{id}/images/{imageId}
    public function setMainImage(Request $request, int $id, int $imageId): void
    {
        try {
            $this->service->setMainImage($id, $imageId);
            $this->success(null, 'تصویر اصلی تنظیم شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // DELETE /api/v1/admin/products/{id}/images/{imageId}
    public function deleteImage(Request $request, int $id, int $imageId): void
    {
        try {
            $this->service->deleteImage($id, $imageId);
            $this->noContent();
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}