<?php

namespace App\Modules\HeroSlide;

use App\Core\Controller;
use App\Core\Http\Request;
use App\Core\UploadHelper;

class HeroSlideController extends Controller
{
    private HeroSlideService $service;

    public function __construct()
    {
        $this->service = new HeroSlideService(new HeroSlideModel());
    }

    // GET /api/v1/hero-slides
    public function index(): void
    {
        $this->success($this->service->getActive());
    }

    // GET /api/v1/admin/hero-slides
    public function adminIndex(): void
    {
        $this->success($this->service->getAll());
    }

    // POST /api/v1/admin/hero-slides
    public function store(Request $request): void
    {
        $file = $_FILES['image'] ?? null;

        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->error('فایل تصویر ارسال نشده یا خطا داشته', 422);
        }

        try {
            $variants = UploadHelper::storeOptimizedImage($file, 'hero-slides');
            $slide = $this->service->create($variants);
            $this->created($slide, 'اسلاید Hero اضافه شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /api/v1/admin/hero-slides/{id}
    public function update(Request $request, int $id): void
    {
        $data = $request->only(['is_active', 'sort_order']);

        try {
            $slide = $this->service->update($id, $data);
            $this->success($slide, 'اسلاید Hero بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PATCH /api/v1/admin/hero-slides/reorder
    public function reorder(Request $request): void
    {
        $ids = $request->input('ids', []);

        try {
            $this->success($this->service->reorder($ids), 'ترتیب اسلایدها بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // DELETE /api/v1/admin/hero-slides/{id}
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
