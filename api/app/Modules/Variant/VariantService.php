<?php

namespace App\Modules\Variant;

use App\Core\Database\Database;
use App\Modules\Attribute\AttributeValueModel;
use App\Modules\Product\ProductModel;
use App\Utils\SlugHelper;

class VariantService
{
    public function __construct(
        private ProductVariantModel $variantModel,
        private InventoryModel      $inventoryModel,
        private ProductModel        $productModel,
        private AttributeValueModel $valueModel,
    ) {}

    public function getProductVariants(int $productId, bool $withDetails = true): array
    {
        $variants = $this->variantModel->getByProductId($productId);
        if (!$withDetails) {
            return $variants;
        }

        return array_map(function (array $v) {
            return $this->variantModel->getWithDetails((int) $v['id']);
        }, $variants);
    }

    public function getDefaultVariant(int $productId): ?array
    {
        $variant = $this->variantModel->getDefault($productId);
        return $variant ? $this->variantModel->getWithDetails((int) $variant['id']) : null;
    }

    public function resolveVariantId(int $productId, ?int $variantId = null): int
    {
        if ($variantId) {
            $variant = $this->variantModel->find($variantId);
            if (!$variant || (int) $variant['product_id'] !== $productId) {
                throw new \RuntimeException('واریانت یافت نشد.', 404);
            }
            return $variantId;
        }

        $default = $this->variantModel->getDefault($productId);
        if (!$default) {
            throw new \RuntimeException('واریانت پیش‌فرض یافت نشد.', 404);
        }
        return (int) $default['id'];
    }

    public function requiresExplicitVariant(int $productId): bool
    {
        $product = $this->productModel->find($productId);
        if (!$product) {
            return false;
        }

        if (($product['product_type'] ?? 'simple') === 'variable') {
            return true;
        }

        return count($this->variantModel->getByProductId($productId)) > 1;
    }

    public function createDefaultVariant(int $productId, array $productData): int
    {
        $product = $this->productModel->find($productId);
        if (!$product) {
            throw new \RuntimeException('محصول یافت نشد.', 404);
        }

        $slug = $product['slug'] ?: SlugHelper::make($product['name'], 'product-' . $productId);
        $sku  = $this->generateSku($slug, [], $productId);

        $variantId = $this->variantModel->create([
            'product_id'  => $productId,
            'sku'         => $sku,
            'title'       => 'Default',
            'price'       => isset($productData['price']) ? (int) $productData['price'] : (int) $product['price'],
            'sale_price'  => $productData['sale_price'] ?? $product['sale_price'] ?? null,
            'is_default'  => 1,
            'is_active'   => 1,
            'position'    => 0,
        ]);

        $this->inventoryModel->upsert($variantId, [
            'quantity'            => (int) ($productData['stock'] ?? $product['stock'] ?? 0),
            'low_stock_threshold' => (int) ($productData['low_stock_threshold'] ?? $product['low_stock_threshold'] ?? 5),
        ]);

        return $variantId;
    }

    public function generateVariants(int $productId, array $axes): array
    {
        $product = $this->productModel->find($productId);
        if (!$product) {
            throw new \RuntimeException('محصول یافت نشد.', 404);
        }

        if (empty($axes)) {
            throw new \RuntimeException('حداقل یک محور واریانت الزامی است.', 422);
        }

        if (count($axes) > 3) {
            throw new \RuntimeException('حداکثر ۳ محور واریانت مجاز است.', 422);
        }

        $slug = $product['slug'] ?: SlugHelper::make($product['name'], 'product-' . $productId);

        $axisValues = [];
        foreach ($axes as $axis) {
            $typeId   = (int) ($axis['type_id'] ?? 0);
            $valueIds = array_map('intval', $axis['value_ids'] ?? []);
            if (!$typeId || empty($valueIds)) {
                throw new \RuntimeException('محور واریانت نامعتبر است.', 422);
            }
            $values = $this->valueModel->getByIds($valueIds);
            if (count($values) !== count($valueIds)) {
                throw new \RuntimeException('مقادیر ویژگی نامعتبر است.', 422);
            }
            $axisValues[] = $values;
        }

        $combinations = $this->cartesianProduct($axisValues);
        $pdo          = Database::getInstance()->getConnection();

        try {
            $pdo->beginTransaction();

            $this->variantModel->deleteByProductId($productId);
            $this->productModel->update($productId, ['product_type' => 'variable']);

            $position = 0;
            $created  = [];

            foreach ($combinations as $combo) {
                $titleParts = array_map(fn($v) => $v['value'], $combo);
                $title      = implode(' / ', $titleParts);
                $sku        = $this->generateSku($slug, $combo, $productId);
                $valueIds   = array_map(fn($v) => (int) $v['id'], $combo);

                $variantId = $this->variantModel->create([
                    'product_id' => $productId,
                    'sku'        => $sku,
                    'title'      => $title,
                    'price'      => null,
                    'is_default' => $position === 0 ? 1 : 0,
                    'is_active'  => 1,
                    'position'   => $position,
                ]);

                $this->variantModel->setAttributeValues($variantId, $valueIds);
                $this->inventoryModel->upsert($variantId, [
                    'quantity'            => 0,
                    'low_stock_threshold' => (int) ($product['low_stock_threshold'] ?? 5),
                ]);

                $created[] = $this->variantModel->getWithDetails($variantId);
                $position++;
            }

            $this->syncProductAggregates($productId);
            $pdo->commit();

            return $created;
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public function updateVariant(int $variantId, array $data): array
    {
        $variant = $this->variantModel->find($variantId);
        if (!$variant) {
            throw new \RuntimeException('واریانت یافت نشد.', 404);
        }

        $payload = [];
        foreach (['sku', 'title', 'price', 'sale_price', 'cost_price', 'image_id', 'is_active', 'position'] as $field) {
            if (array_key_exists($field, $data)) {
                $payload[$field] = $data[$field];
            }
        }

        if (isset($payload['sku']) && $this->variantModel->skuExists($payload['sku'], $variantId)) {
            throw new \RuntimeException('SKU تکراری است.', 422);
        }

        if (!empty($payload)) {
            $this->variantModel->update($variantId, $payload);
        }

        if (isset($data['quantity']) || isset($data['low_stock_threshold'])) {
            $this->inventoryModel->upsert($variantId, [
                'quantity'            => (int) ($data['quantity'] ?? 0),
                'low_stock_threshold' => $data['low_stock_threshold'] ?? null,
            ]);
        }

        $this->syncProductAggregates((int) $variant['product_id']);

        return $this->variantModel->getWithDetails($variantId);
    }

    public function bulkUpdate(int $productId, array $variants): array
    {
        $product = $this->productModel->find($productId);
        if (!$product) {
            throw new \RuntimeException('محصول یافت نشد.', 404);
        }

        $updated = [];
        foreach ($variants as $row) {
            $id = (int) ($row['id'] ?? 0);
            if (!$id) {
                continue;
            }
            $variant = $this->variantModel->find($id);
            if (!$variant || (int) $variant['product_id'] !== $productId) {
                continue;
            }
            $updated[] = $this->updateVariant($id, $row);
        }

        return $updated;
    }

    public function syncProductAggregates(int $productId): void
    {
        $default = $this->variantModel->getDefault($productId);
        if (!$default) {
            return;
        }

        $inv = $this->inventoryModel->getByVariantId((int) $default['id']);
        $totalStock = 0;
        $variants   = $this->variantModel->getByProductId($productId);

        foreach ($variants as $v) {
            $vInv = $this->inventoryModel->getByVariantId((int) $v['id']);
            $totalStock += (int) ($vInv['quantity'] ?? 0);
        }

        $price = $default['price'] ?? $this->productModel->find($productId)['price'] ?? 0;

        $this->productModel->update($productId, [
            'price' => (int) $price,
            'stock' => $totalStock,
        ]);
    }

    public function decrementStock(int $variantId, int $qty): void
    {
        $ok = $this->inventoryModel->decrementStock($variantId, $qty);
        if (!$ok) {
            throw new \RuntimeException('موجودی کافی نیست.', 422);
        }
        $variant = $this->variantModel->find($variantId);
        if ($variant) {
            $this->syncProductAggregates((int) $variant['product_id']);
        }
    }

    public function incrementStock(int $variantId, int $qty): void
    {
        $this->inventoryModel->incrementStock($variantId, $qty);
        $variant = $this->variantModel->find($variantId);
        if ($variant) {
            $this->syncProductAggregates((int) $variant['product_id']);
        }
    }

    public function getEffectivePrice(array $variant, array $product): int
    {
        if (isset($variant['sale_price']) && $variant['sale_price'] !== null && $variant['sale_price'] !== '') {
            return (int) $variant['sale_price'];
        }
        if (isset($variant['price']) && $variant['price'] !== null && $variant['price'] !== '') {
            return (int) $variant['price'];
        }
        if (isset($product['sale_price']) && $product['sale_price']) {
            return (int) $product['sale_price'];
        }
        return (int) ($product['price'] ?? 0);
    }

    private function cartesianProduct(array $arrays): array
    {
        $result = [[]];
        foreach ($arrays as $propertyValues) {
            $tmp = [];
            foreach ($result as $resultItem) {
                foreach ($propertyValues as $propertyValue) {
                    $tmp[] = array_merge($resultItem, [$propertyValue]);
                }
            }
            $result = $tmp;
        }
        return $result;
    }

    private function generateSku(string $productSlug, array $combo, int $productId): string
    {
        $parts = [strtoupper(preg_replace('/[^A-Z0-9]/', '', strtoupper($productSlug)) ?: 'P' . $productId)];
        foreach ($combo as $val) {
            $parts[] = strtoupper(preg_replace('/[^A-Z0-9]/', '', $val['slug'] ?? $val['value']));
        }
        $base = implode('-', array_filter($parts)) ?: 'SKU-P' . $productId;

        if (!$this->variantModel->skuExists($base)) {
            return $base;
        }

        $i = 2;
        while ($this->variantModel->skuExists("{$base}-{$i}")) {
            $i++;
        }
        return "{$base}-{$i}";
    }
}
