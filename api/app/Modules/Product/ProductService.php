<?php

namespace App\Modules\Product;

use App\Core\ImageVariants;
use App\Modules\Attribute\AttributeTypeModel;
use App\Modules\Variant\VariantService;
use App\Utils\SlugHelper;

class ProductService
{
    public function __construct(
        private ProductModel      $productModel,
        private ProductImageModel $imageModel,
        private VariantService    $variantService,
        private AttributeTypeModel $attributeTypeModel,
    ) {}

    // ─── Public Listing ─────────────────────────────────────────

    public function list(array $filters = []): array
    {
        $filters = $this->normalizeFilters($filters);
        return $this->productModel->paginateWithFilters($filters);
    }

    public function getFeatured(int $limit = 8): array
    {
        return $this->productModel->getFeatured($limit);
    }

    public function getById(int $id): array
    {
        $product = $this->productModel->find($id);
        if (!$product) {
            throw new \RuntimeException('محصول یافت نشد.', 404);
        }

        return $this->enrichProduct($product);
    }

    // ─── Admin CRUD ─────────────────────────────────────────────

    public function create(array $data): array
    {
        $this->validateProductData($data);

        $slug = $this->resolveSlug($data['name'], $data['slug'] ?? null);
        $status = $data['status'] ?? 'active';
        $isActive = $status === 'active' ? 1 : 0;

        $id = $this->productModel->create([
            'name'                => trim($data['name']),
            'slug'                => $slug,
            'description'         => trim($data['description'] ?? $data['full_description'] ?? ''),
            'short_description'   => trim($data['short_description'] ?? ''),
            'price'               => (int) $data['price'],
            'sale_price'          => isset($data['sale_price']) ? (int) $data['sale_price'] : null,
            'category_id'         => (int) ($data['category_id'] ?? 0) ?: null,
            'stock'               => (int) ($data['stock'] ?? 0),
            'low_stock_threshold' => (int) ($data['low_stock_threshold'] ?? 5),
            'featured'            => (int) ($data['featured'] ?? 0),
            'is_active'           => $isActive,
            'status'              => $status,
            'product_type'        => $data['product_type'] ?? 'simple',
            'size_guide_set_id'   => (int) ($data['size_guide_set_id'] ?? 0) ?: null,
        ]);

        $this->variantService->createDefaultVariant($id, $data);

        return $this->getById($id);
    }

    public function update(int $id, array $data): array
    {
        $product = $this->productModel->find($id);
        if (!$product) {
            throw new \RuntimeException('محصول یافت نشد.', 404);
        }

        $payload = [];

        if (isset($data['name'])) {
            $payload['name'] = trim($data['name']);
        }
        if (isset($data['slug'])) {
            $payload['slug'] = $this->resolveSlug($data['name'] ?? $product['name'], $data['slug'], $id);
        } elseif (isset($data['name']) && empty($product['slug'])) {
            $payload['slug'] = $this->resolveSlug($data['name'], null, $id);
        }
        if (isset($data['description']) || isset($data['full_description'])) {
            $payload['description'] = trim($data['description'] ?? $data['full_description'] ?? '');
        }
        if (isset($data['short_description'])) {
            $payload['short_description'] = trim($data['short_description']);
        }
        if (isset($data['price'])) {
            if ((int) $data['price'] < 0) {
                throw new \RuntimeException('قیمت نمی‌تواند منفی باشد.', 422);
            }
            $payload['price'] = (int) $data['price'];
        }
        if (isset($data['sale_price'])) {
            $payload['sale_price'] = $data['sale_price'] !== '' && $data['sale_price'] !== null
                ? (int) $data['sale_price'] : null;
        }
        if (isset($data['stock'])) {
            if ((int) $data['stock'] < 0) {
                throw new \RuntimeException('موجودی نمی‌تواند منفی باشد.', 422);
            }
            $payload['stock'] = (int) $data['stock'];
        }
        if (isset($data['status'])) {
            $payload['status']    = $data['status'];
            $payload['is_active'] = $data['status'] === 'active' ? 1 : 0;
        }
        if (isset($data['product_type'])) {
            $payload['product_type'] = $data['product_type'];
        }
        if (isset($data['low_stock_threshold'])) {
            $payload['low_stock_threshold'] = (int) $data['low_stock_threshold'];
        }

        $simpleFields = ['category_id', 'featured', 'is_active', 'size_guide_set_id'];
        foreach ($simpleFields as $field) {
            if (isset($data[$field])) {
                $payload[$field] = $data[$field];
            }
        }

        if (!empty($payload)) {
            $this->productModel->update($id, $payload);
        }

        if (isset($data['price']) || isset($data['stock']) || isset($data['sale_price'])) {
            $default = $this->variantService->getDefaultVariant($id);
            if ($default) {
                $variantPayload = [];
                if (isset($data['price'])) {
                    $variantPayload['price'] = (int) $data['price'];
                }
                if (isset($data['sale_price'])) {
                    $variantPayload['sale_price'] = $data['sale_price'] !== '' && $data['sale_price'] !== null
                        ? (int) $data['sale_price'] : null;
                }
                if (isset($data['stock'])) {
                    $variantPayload['quantity'] = (int) $data['stock'];
                }
                if (!empty($variantPayload)) {
                    $this->variantService->updateVariant((int) $default['id'], $variantPayload);
                }
            }
        }

        if (empty($payload) && !isset($data['price']) && !isset($data['stock']) && !isset($data['sale_price'])) {
            throw new \RuntimeException('هیچ فیلدی برای بروزرسانی ارسال نشد.', 422);
        }

        return $this->getById($id);
    }

    public function delete(int $id): void
    {
        $product = $this->productModel->find($id);
        if (!$product) {
            throw new \RuntimeException('محصول یافت نشد.', 404);
        }

        $this->imageModel->deleteAllForProduct($id);
        $this->productModel->delete($id);
    }

    public function toggleActive(int $id): array
    {
        $product = $this->productModel->find($id);
        if (!$product) {
            throw new \RuntimeException('محصول یافت نشد.', 404);
        }

        $newStatus = ($product['status'] ?? 'active') === 'active' ? 'archived' : 'active';
        $this->productModel->update($id, [
            'status'    => $newStatus
        ]);

        return $this->getById($id);
    }

    // ─── Image Management ────────────────────────────────────────

    public function addImage(int $productId, array $imageData): array
    {
        $this->productModel->find($productId) or throw new \RuntimeException('محصول یافت نشد.', 404);

        if (empty($imageData['image_url']) && empty($imageData['image_large_url'])) {
            throw new \RuntimeException('آدرس تصویر الزامی است.', 422);
        }

        $existing = $this->imageModel->getByProductId($productId);
        $isMain   = empty($existing) ? 1 : (int) ($imageData['is_main'] ?? 0);

        if ($isMain) {
            $this->imageModel->unsetMain($productId);
        }

        $fields = ImageVariants::imageFields([
            'large'  => trim($imageData['image_large_url'] ?? $imageData['image_url'] ?? ''),
            'medium' => trim($imageData['image_medium_url'] ?? $imageData['image_url'] ?? ''),
            'thumb'  => trim($imageData['image_thumb_url'] ?? $imageData['image_url'] ?? ''),
        ]);

        $id = $this->imageModel->create([
            'product_id' => $productId,
            'alt_text'   => trim($imageData['alt_text'] ?? ''),
            'is_main'    => $isMain,
            'sort_order' => (int) ($imageData['sort_order'] ?? count($existing)),
        ] + $fields);

        return ImageVariants::enrichRow($this->imageModel->find($id));
    }

    public function setMainImage(int $productId, int $imageId): void
    {
        $this->productModel->find($productId) or throw new \RuntimeException('محصول یافت نشد.', 404);
        $this->imageModel->setMain($imageId, $productId);
    }

    public function deleteImage(int $productId, int $imageId): void
    {
        $this->productModel->find($productId) or throw new \RuntimeException('محصول یافت نشد.', 404);

        $image = $this->imageModel->find($imageId);
        if (!$image || $image['product_id'] !== $productId) {
            throw new \RuntimeException('تصویر یافت نشد.', 404);
        }

        $this->imageModel->delete($imageId);

        if ($image['is_main']) {
            $remaining = $this->imageModel->getByProductId($productId);
            if (!empty($remaining)) {
                $this->imageModel->setMain($remaining[0]['id'], $productId);
            }
        }
    }

    // ─── Stock (delegates to variant layer) ──────────────────────

    public function decrementStock(int $productId, int $qty, ?int $variantId = null): void
    {
        $resolvedId = $this->variantService->resolveVariantId($productId, $variantId);
        $this->variantService->decrementStock($resolvedId, $qty);
    }

    public function incrementStock(int $productId, int $qty, ?int $variantId = null): void
    {
        $resolvedId = $this->variantService->resolveVariantId($productId, $variantId);
        $this->variantService->incrementStock($resolvedId, $qty);
    }

    // ─── Helpers ────────────────────────────────────────────────

    private function enrichProduct(array $product): array
    {
        $id = (int) $product['id'];

        $product['images'] = array_map(
            fn(array $img) => ImageVariants::enrichRow($img),
            $this->imageModel->getByProductId($id)
        );
        $product['options']     = $this->productModel->getOptions($id);
        $product['attributes']  = $this->productModel->getDescriptiveAttributes($id);
        $product['variants']    = $this->variantService->getProductVariants($id);
        if (!empty($product['size_guide_set_id'])) {
            $product['size_guide'] = (new \App\Modules\Size\SizeModel())->find($product['size_guide_set_id']);
        }
        $default = $this->variantService->getDefaultVariant($id);
        if ($default) {
            $product['default_variant_id'] = (int) $default['id'];
            $product['price']  = $this->variantService->getEffectivePrice($default, $product);
            $product['stock']  = (int) ($default['inventory']['quantity'] ?? 0);
        }

        $product['variant_count'] = count($product['variants']);
        $product['variant_axes']  = $this->buildVariantAxes($product['variants']);

        if (($product['product_type'] ?? 'simple') === 'variable' && count($product['variants']) > 1) {
            $prices = array_map(fn($v) => $this->variantService->getEffectivePrice($v, $product), $product['variants']);
            $product['price_min'] = min($prices);
            $product['price_max'] = max($prices);
        }

        return $product;
    }

    private function buildVariantAxes(array $variants): array
    {
        $axes = [];
        foreach ($variants as $variant) {
            foreach ($variant['attribute_values'] ?? [] as $av) {
                $slug = $av['type_slug'];
                if (!isset($axes[$slug])) {
                    $axes[$slug] = [
                        'type_id'    => (int) $av['attribute_type_id'],
                        'type_name'  => $av['type_name'],
                        'type_slug'  => $slug,
                        'input_type' => $av['input_type'],
                        'values'     => [],
                    ];
                }
                $axes[$slug]['values'][$av['id']] = [
                    'id'         => (int) $av['id'],
                    'value'      => $av['value'],
                    'slug'       => $av['slug'],
                    'swatch_hex' => $av['swatch_hex'] ?? null,
                ];
            }
        }

        foreach ($axes as &$axis) {
            $axis['values'] = array_values($axis['values']);
        }

        return array_values($axes);
    }

    private function resolveSlug(string $name, ?string $slug = null, ?int $excludeId = null): string
    {
        $base = $slug ? SlugHelper::make($slug) : SlugHelper::make($name);
        return SlugHelper::unique($base, fn($s) => $this->productModel->slugExists($s, $excludeId));
    }

    private function validateProductData(array $data): void
    {
        if (empty($data['name'])) {
            throw new \RuntimeException('نام محصول الزامی است.', 422);
        }
        if (!isset($data['price']) || (int) $data['price'] < 0) {
            throw new \RuntimeException('قیمت معتبر الزامی است.', 422);
        }
    }

    private function normalizeFilters(array $filters): array
    {
        $normalized = array_merge([
            'page'        => 1,
            'limit'       => 12,
            'sort'        => 'newest',
            'category_id' => null,
            'category'    => null,
            'featured'    => null,
            'q'           => null,
            'price_min'   => null,
            'price_max'   => null,
            'attrs'       => [],
        ], $filters);

        if (!is_array($normalized['attrs'])) {
            $normalized['attrs'] = [];
        }

        return $normalized;
    }
}
