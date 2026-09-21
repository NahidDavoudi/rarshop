<?php

namespace App\Modules\Category;

use App\Core\ImageVariants;

class CategoryImageService
{
    public function __construct(
        private CategoryImageModel $imageModel,
        private CategoryModel      $categoryModel,
    ) {}

    public function getImages(int $categoryId): array
    {
        $this->assertCategoryExists($categoryId);
        return array_map(
            fn(array $img) => ImageVariants::enrichRow($img),
            $this->imageModel->getByCategoryId($categoryId)
        );
    }

    public function getMainImage(int $categoryId): ?array
    {
        $this->assertCategoryExists($categoryId);
        return $this->imageModel->getMainImage($categoryId);
    }

    public function addImage(int $categoryId, array $data): array
    {
        $this->assertCategoryExists($categoryId);

        if (empty($data['image_url']) && empty($data['image_large_url'])) {
            throw new \RuntimeException('آدرس تصویر الزامی است.', 422);
        }

        $existing = $this->imageModel->getByCategoryId($categoryId);
        $isMain   = empty($existing) ? 1 : (int) ($data['is_main'] ?? 0);

        if ($isMain) {
            $this->imageModel->unsetMain($categoryId);
        }

        $fields = ImageVariants::imageFields([
            'large'  => trim($data['image_large_url'] ?? $data['image_url'] ?? ''),
            'medium' => trim($data['image_medium_url'] ?? $data['image_url'] ?? ''),
            'thumb'  => trim($data['image_thumb_url'] ?? $data['image_url'] ?? ''),
        ]);

        $id = $this->imageModel->create([
            'category_id' => $categoryId,
            'alt_text'    => trim($data['alt_text'] ?? ''),
            'is_main'     => $isMain,
            'sort_order'  => (int) ($data['sort_order'] ?? count($existing)),
        ] + $fields);

        return ImageVariants::enrichRow($this->imageModel->find($id));
    }

    public function setMain(int $categoryId, int $imageId): void
    {
        $this->assertCategoryExists($categoryId);

        $image = $this->imageModel->find($imageId);
        if (!$image || (int) $image['category_id'] !== $categoryId) {
            throw new \RuntimeException('تصویر یافت نشد.', 404);
        }

        $this->imageModel->setMain($imageId, $categoryId);
    }

    public function delete(int $categoryId, int $imageId): void
    {
        $this->assertCategoryExists($categoryId);

        $image = $this->imageModel->find($imageId);
        if (!$image || (int) $image['category_id'] !== $categoryId) {
            throw new \RuntimeException('تصویر یافت نشد.', 404);
        }

        $this->imageModel->delete($imageId);

        // اگه تصویر اصلی بود، اولین باقیمانده رو اصلی کن
        if ($image['is_main']) {
            $remaining = $this->imageModel->getByCategoryId($categoryId);
            if (!empty($remaining)) {
                $this->imageModel->setMain($remaining[0]['id'], $categoryId);
            }
        }
    }

    public function deleteAll(int $categoryId): void
    {
        $this->assertCategoryExists($categoryId);
        $this->imageModel->deleteAllForCategory($categoryId);
    }

    // ─── Private ─────────────────────────────────────────────────

    private function assertCategoryExists(int $categoryId): void
    {
        if (!$this->categoryModel->find($categoryId)) {
            throw new \RuntimeException('دسته‌بندی یافت نشد.', 404);
        }
    }
}