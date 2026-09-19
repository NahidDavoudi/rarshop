<?php

namespace App\Modules\PromoBanner;

use App\Core\ImageVariants;

class PromoBannerService
{
    public function __construct(
        private PromoBannerModel $model,
    ) {}

    public function getActive(): array
    {
        return array_map(
            fn(array $row) => ImageVariants::enrichRow($row),
            $this->model->getActive()
        );
    }

    public function getAll(): array
    {
        return array_map(
            fn(array $row) => ImageVariants::enrichRow($row),
            $this->model->getAllOrdered()
        );
    }

    public function getById(int $id): array
    {
        $banner = $this->model->find($id);
        if (!$banner) {
            throw new \RuntimeException('پوستر یافت نشد.', 404);
        }
        return ImageVariants::enrichRow($banner);
    }

    public function create(array $variants, string $title = ''): array
    {
        if (empty($variants['large'])) {
            throw new \RuntimeException('آدرس تصویر الزامی است.', 422);
        }

        $id = $this->model->create([
            'title'      => trim($title),
            'sort_order' => $this->model->getNextSortOrder(),
            'is_active'  => 1,
        ] + ImageVariants::imageFields($variants));

        return $this->getById($id);
    }

    public function update(int $id, array $data): array
    {
        $this->getById($id);
        $payload = [];

        if (array_key_exists('title', $data)) {
            $payload['title'] = trim((string) $data['title']);
        }
        if (array_key_exists('is_active', $data)) {
            $payload['is_active'] = (int) $data['is_active'] ? 1 : 0;
        }
        if (array_key_exists('sort_order', $data)) {
            $payload['sort_order'] = max(0, (int) $data['sort_order']);
        }
        if (!empty($data['image_url']) || !empty($data['image_large_url'])) {
            $payload = array_merge($payload, ImageVariants::imageFields([
                'large'  => trim((string) ($data['image_large_url'] ?? $data['image_url'] ?? '')),
                'medium' => trim((string) ($data['image_medium_url'] ?? $data['image_url'] ?? '')),
                'thumb'  => trim((string) ($data['image_thumb_url'] ?? $data['image_url'] ?? '')),
            ]));
        }

        if (empty($payload)) {
            throw new \RuntimeException('هیچ فیلدی برای بروزرسانی ارسال نشد.', 422);
        }

        $this->model->update($id, $payload);
        return $this->getById($id);
    }

    public function reorder(array $ids): array
    {
        if (empty($ids) || !is_array($ids)) {
            throw new \RuntimeException('لیست شناسه‌ها معتبر نیست.', 422);
        }

        $normalized = array_values(array_unique(array_map('intval', $ids)));
        $all = $this->model->getAllOrdered();
        $existingIds = array_map(fn ($row) => (int) $row['id'], $all);

        if (count($normalized) !== count($existingIds)) {
            throw new \RuntimeException('ترتیب باید شامل همه پوسترها باشد.', 422);
        }

        sort($normalized);
        sort($existingIds);
        if ($normalized !== $existingIds) {
            throw new \RuntimeException('شناسه‌های نامعتبر در لیست ترتیب.', 422);
        }

        $this->model->reorder($ids);
        return $this->getAll();
    }

    public function delete(int $id): void
    {
        $this->getById($id);
        $this->model->delete($id);
    }
}
