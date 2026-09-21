<?php

namespace App\Modules\Category;

use App\Core\Controller;
use App\Core\Http\Request;
use App\Core\ImageVariants;
use App\Core\UploadHelper;

class CategoryController extends Controller
{
    private CategoryService      $service;
    private CategoryImageService $imageService;

    public function __construct()
    {
        $this->service = new CategoryService(
            new CategoryModel(),
            new CategoryImageModel(),
        );

        $this->imageService = new CategoryImageService(
            new CategoryImageModel(),
            new CategoryModel(),
        );
    }

    // ─── Category CRUD ────────────────────────────────────────────

    // GET /api/v1/categories
    public function index(): void
    {
        $this->success($this->service->getAll());
    }

    // GET /api/v1/categories/{id}
    public function show(Request $request, int $id): void
    {
        try {
            $this->success($this->service->getById($id));
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 404);
        }
    }

    // GET /api/v1/categories/slug/{slug}
    public function slug(Request $request, string $slug): void
    {
        try {
            $this->success($this->service->getBySlug($slug));
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 404);
        }
    }

    // POST /api/v1/admin/categories
    public function store(Request $request): void
    {
        $data = $request->only(['name', 'slug', 'description', 'poster_image']);

        try {
            $this->created($this->service->create($data));
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /api/v1/admin/categories/{id}
    public function update(Request $request, int $id): void
    {
        $data = $request->only(['name', 'slug', 'description', 'poster_image']);

        try {
            $this->success($this->service->update($id, $data), 'دسته‌بندی بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // DELETE /api/v1/admin/categories/{id}
    public function destroy(Request $request, int $id): void
    {
        try {
            $this->service->delete($id);
            $this->noContent();
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // POST /api/v1/admin/categories/{id}/poster
    public function uploadPoster(Request $request, int $id): void
    {
        $file = $_FILES['poster'] ?? null;

        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->error('فایل پوستر ارسال نشده یا خطا داشته', 422);
        }

        try {
            $variants = UploadHelper::storeOptimizedImage($file, 'categories');
            $category = $this->service->update($id, ImageVariants::posterFields($variants));
            $this->success([
                'urls'     => $variants,
                'category' => $category,
            ], 'پوستر آپلود شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ─── Category Images ──────────────────────────────────────────

    // GET /api/v1/admin/categories/{id}/images
    public function images(Request $request, int $id): void
    {
        try {
            $this->success($this->imageService->getImages($id));
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // POST /api/v1/admin/categories/{id}/images
    public function addImage(Request $request, int $id): void
    {
        $file = $_FILES['image'] ?? null;

        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->error('فایل تصویر ارسال نشده', 422);
        }

        try {
            $variants = UploadHelper::storeOptimizedImage($file, 'categories');
            $image = $this->imageService->addImage($id, ImageVariants::imageFields($variants) + [
                'alt_text'   => $request->input('alt_text', ''),
                'is_main'    => (int) $request->input('is_main', 0),
                'sort_order' => (int) $request->input('sort_order', 0),
            ]);
            $this->created(ImageVariants::enrichRow($image), 'تصویر اضافه شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PATCH /api/v1/admin/categories/{id}/images/{imageId}
    public function setMainImage(Request $request, int $id, int $imageId): void
    {
        try {
            $this->imageService->setMain($id, $imageId);
            $this->success(null, 'تصویر اصلی تنظیم شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // DELETE /api/v1/admin/categories/{id}/images/{imageId}
    public function destroyImage(Request $request, int $id, int $imageId): void
    {
        try {
            $this->imageService->delete($id, $imageId);
            $this->noContent();
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}