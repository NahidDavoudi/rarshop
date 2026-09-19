<?php

namespace App\Modules\PromoBanner;

use App\Core\Controller;
use App\Core\Http\Request;
use App\Core\UploadHelper;

class PromoBannerController extends Controller
{
    private PromoBannerService $service;

    public function __construct()
    {
        $this->service = new PromoBannerService(new PromoBannerModel());
    }

    // GET /api/v1/promo-banners
    public function index(): void
    {
        $this->success($this->service->getActive());
    }

    // GET /api/v1/admin/promo-banners
    public function adminIndex(): void
    {
        $this->success($this->service->getAll());
    }

    // POST /api/v1/admin/promo-banners
    public function store(Request $request): void
    {
        $file = $_FILES['image'] ?? null;

        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->error('فایل تصویر ارسال نشده یا خطا داشته', 422);
        }

        try {
            $variants = UploadHelper::storeOptimizedImage($file, 'promo-banners');
            $title = trim((string) $request->input('title', ''));
            $banner = $this->service->create($variants, $title);
            $this->created($banner, 'پوستر اضافه شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /api/v1/admin/promo-banners/{id}
    public function update(Request $request, int $id): void
    {
        $data = $request->only(['title', 'is_active', 'sort_order']);

        try {
            $banner = $this->service->update($id, $data);
            $this->success($banner, 'پوستر بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PATCH /api/v1/admin/promo-banners/reorder
    public function reorder(Request $request): void
    {
        $ids = $request->input('ids', []);

        try {
            $this->success($this->service->reorder($ids), 'ترتیب پوسترها بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // DELETE /api/v1/admin/promo-banners/{id}
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
