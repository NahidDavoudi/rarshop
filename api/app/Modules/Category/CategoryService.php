<?php

namespace App\Modules\Category;

class CategoryService
{
    public function __construct(
        private CategoryModel      $categoryModel,
        private CategoryImageModel $imageModel,
    ) {}

    // ─── Listing ─────────────────────────────────────────────────

    public function getAll(): array
    {
        return $this->categoryModel->getAllWithImageCount();
    }

    public function getBySlug(string $slug): array
    {
        $category = $this->categoryModel->findBySlug($slug);
        if (!$category) {
            throw new \RuntimeException('دسته‌بندی یافت نشد.', 404);
        }

        $category['images'] = $this->imageModel->getByCategoryId($category['id']);

        return $category;
    }

    public function getById(int $id): array
    {
        $category = $this->categoryModel->find($id);
        if (!$category) {
            throw new \RuntimeException('دسته‌بندی یافت نشد.', 404);
        }

        $category['images'] = $this->imageModel->getByCategoryId($id);

        return $category;
    }

    // ─── Admin CRUD ───────────────────────────────────────────────

    public function create(array $data): array
    {
        if (empty($data['name'])) {
            throw new \RuntimeException('نام دسته‌بندی الزامی است.', 422);
        }

        $slug = $this->resolveSlug($data['slug'] ?? '', $data['name']);

        $id = $this->categoryModel->create([
            'name'         => trim($data['name']),
            'slug'         => $slug,
            'description'  => trim($data['description'] ?? ''),
            'poster_image' => trim($data['poster_image'] ?? ''),
        ]);

        return $this->getById($id);
    }

    public function update(int $id, array $data): array
    {
        $category = $this->categoryModel->find($id);
        if (!$category) {
            throw new \RuntimeException('دسته‌بندی یافت نشد.', 404);
        }

        $payload = [];

        if (isset($data['name'])) {
            $payload['name'] = trim($data['name']);
        }
        if (isset($data['slug'])) {
            $payload['slug'] = $this->resolveSlug($data['slug'], $data['name'] ?? $category['name'], $id);
        }
        if (isset($data['description'])) {
            $payload['description'] = trim($data['description']);
        }
        if (isset($data['poster_image']) || isset($data['poster_image_medium']) || isset($data['poster_image_thumb'])) {
            foreach (['poster_image', 'poster_image_medium', 'poster_image_thumb'] as $field) {
                if (array_key_exists($field, $data)) {
                    $payload[$field] = trim((string) $data[$field]);
                }
            }
        }

        if (empty($payload)) {
            throw new \RuntimeException('هیچ فیلدی برای بروزرسانی ارسال نشد.', 422);
        }

        $this->categoryModel->update($id, $payload);

        return $this->getById($id);
    }

    public function delete(int $id): void
    {
        $category = $this->categoryModel->find($id);
        if (!$category) {
            throw new \RuntimeException('دسته‌بندی یافت نشد.', 404);
        }

        $this->imageModel->deleteAllForCategory($id);
        $this->categoryModel->delete($id);
    }

    // ─── Image Management ────────────────────────────────────────

    public function addImage(int $categoryId, array $imageData): array
    {
        $this->categoryModel->find($categoryId) or throw new \RuntimeException('دسته‌بندی یافت نشد.', 404);

        if (empty($imageData['image_url'])) {
            throw new \RuntimeException('آدرس تصویر الزامی است.', 422);
        }

        $existing = $this->imageModel->getByCategoryId($categoryId);
        $isMain   = empty($existing) ? 1 : (int) ($imageData['is_main'] ?? 0);

        if ($isMain) {
            $this->imageModel->unsetMain($categoryId);
        }

        $id = $this->imageModel->create([
            'category_id' => $categoryId,
            'image_url'   => trim($imageData['image_url']),
            'alt_text'    => trim($imageData['alt_text'] ?? ''),
            'is_main'     => $isMain,
            'sort_order'  => (int) ($imageData['sort_order'] ?? count($existing)),
        ]);

        return $this->imageModel->find($id);
    }

    public function setMainImage(int $categoryId, int $imageId): void
    {
        $this->categoryModel->find($categoryId) or throw new \RuntimeException('دسته‌بندی یافت نشد.', 404);
        $this->imageModel->setMain($imageId, $categoryId);
    }

    public function deleteImage(int $categoryId, int $imageId): void
    {
        $this->categoryModel->find($categoryId) or throw new \RuntimeException('دسته‌بندی یافت نشد.', 404);

        $image = $this->imageModel->find($imageId);
        if (!$image || $image['category_id'] !== $categoryId) {
            throw new \RuntimeException('تصویر یافت نشد.', 404);
        }

        $this->imageModel->delete($imageId);

        if ($image['is_main']) {
            $remaining = $this->imageModel->getByCategoryId($categoryId);
            if (!empty($remaining)) {
                $this->imageModel->setMain($remaining[0]['id'], $categoryId);
            }
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────

    private function resolveSlug(string $rawSlug, string $fallbackName, ?int $excludeId = null): string
    {
        $slug = $rawSlug ?: $this->slugify($fallbackName);

        if ($this->categoryModel->slugExists($slug, $excludeId)) {
            $slug = $slug . '-' . time();
        }

        return $slug;
    }

    private function slugify(string $text): string
    {
        $text = mb_strtolower(trim($text));
        $text = preg_replace('/\s+/', '-', $text);
        $text = preg_replace('/[^\p{L}\p{N}\-]/u', '', $text);
        return $text ?: 'category-' . time();
    }
}