<?php

namespace App\Modules\Variant;

use App\Core\Database\Database;
use App\Modules\Attribute\AttributeValueModel;
use App\Modules\Product\ProductModel;
use App\Utils\SlugHelper;
use PDO;

class VariantService
{
    private ProductVariantAxisModel $axisModel;
    private ProductAxisValueModel $axisValueModel;
    private ProductVariantLinkModel $linkModel;

    public function __construct(
        private ProductVariantModel $variantModel,
        private InventoryModel      $inventoryModel,
        private ProductModel        $productModel,
        private AttributeValueModel $valueModel,
    ) {
        $this->axisModel = new ProductVariantAxisModel();
        $this->axisValueModel = new ProductAxisValueModel();
        $this->linkModel = new ProductVariantLinkModel();
    }

    private function comboKey(array $pairs): string
    {
        if (empty($pairs)) return '';
        usort($pairs, fn($a, $b) => $a[0] <=> $b[0]);
        return implode('|', array_map(fn($p) => $p[0] . ':' . $p[1], $pairs));
    }

    private function validateHexForSwatch(?string $hex, string $inputType): ?string
    {
        if ($inputType !== 'swatch') {
            if ($hex !== null && $hex !== '') throw new \RuntimeException('swatch_hex فقط برای محور رنگ مجاز است.', 422);
            return null;
        }
        if ($hex === null || $hex === '') return null;
        $hex = trim($hex);
        if (!str_starts_with($hex, '#')) $hex = '#' . $hex;
        if (!preg_match('/^#[0-9a-fA-F]{6}$/', $hex)) throw new \RuntimeException('فرمت رنگ باید #RRGGBB باشد.', 422);
        return strtoupper($hex);
    }

    // ── Public getters ──
    public function getProductVariants(int $productId, bool $withDetails = true): array
    {
        $variants = $this->variantModel->getByProductId($productId);
        if (!$withDetails) return $variants;
        return array_map(fn(array $v) => $this->variantModel->getWithDetails((int)$v['id']), $variants);
    }

    public function getActiveVariants(int $productId): array
    {
        $variants = $this->variantModel->getByProductId($productId, true);
        return array_map(fn(array $v) => $this->variantModel->getWithDetails((int)$v['id']), $variants);
    }

    public function getProductAxes(int $productId, bool $activeOnly = true): array
    {
        return $this->axisModel->getWithValues($productId, $activeOnly);
    }

    public function getDefaultVariant(int $productId): ?array
    {
        $variant = $this->variantModel->getDefault($productId);
        return $variant ? $this->variantModel->getWithDetails((int)$variant['id']) : null;
    }

    public function resolveVariantId(int $productId, ?int $variantId = null): int
    {
        if ($variantId) {
            $variant = $this->variantModel->find($variantId);
            if (!$variant || (int)$variant['product_id'] !== $productId) throw new \RuntimeException('واریانت یافت نشد.', 404);
            if ((int)($variant['is_active'] ?? 1) !== 1) throw new \RuntimeException('این ترکیب غیرفعال است.', 422);
            return $variantId;
        }
        $default = $this->variantModel->getDefault($productId);
        if (!$default) throw new \RuntimeException('واریانت پیش‌فرض یافت نشد.', 404);
        return (int)$default['id'];
    }

    public function requiresExplicitVariant(int $productId): bool
    {
        $product = $this->productModel->find($productId);
        if (!$product) return false;
        // If any active axis exists, require explicit
        $axes = $this->axisModel->getByProductId($productId, true);
        if (!empty($axes)) return true;
        return count($this->variantModel->getByProductId($productId, true)) > 1;
    }

    // ── Axis CRUD ──
    public function createAxis(int $productId, array $data): array
    {
        $product = $this->productModel->find($productId);
        if (!$product) throw new \RuntimeException('محصول یافت نشد.', 404);
        $name = trim($data['name'] ?? '');
        if ($name === '' || mb_strlen($name) > 100) throw new \RuntimeException('نام محور الزامی است (حداکثر ۱۰۰ کاراکتر).', 422);
        $inputType = $data['input_type'] ?? 'text';
        if (!in_array($inputType, ['text','swatch'])) throw new \RuntimeException('نوع محور نامعتبر است.', 422);
        if ($this->axisModel->countActiveByProduct($productId) >= 3) throw new \RuntimeException('حداکثر ۳ محور مجاز است.', 422);
        $slug = SlugHelper::axisSlug($data['slug'] ?? $name, 'axis');
        $slug = SlugHelper::axisUnique($slug, fn($s) => $this->axisModel->slugExistsInProduct($s, $productId));
        // Reactivate if exists inactive with same slug
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare('SELECT id FROM product_variant_axes WHERE product_id=? AND slug=? LIMIT 1');
        $stmt->execute([$productId, $slug]);
        $existingId = $stmt->fetchColumn();
        if ($existingId) {
            $existing = $this->axisModel->find((int)$existingId);
            if ((int)($existing['is_active'] ?? 1) === 0) {
                $this->axisModel->update((int)$existingId, ['name'=>$name,'input_type'=>$inputType,'is_active'=>1,'sort_order'=>(int)($data['sort_order'] ?? $existing['sort_order'] ?? 0)]);
                return $this->axisModel->find((int)$existingId);
            }
            throw new \RuntimeException('نام محور تکراری است.', 422);
        }
        $id = $this->axisModel->create(['product_id'=>$productId,'name'=>$name,'slug'=>$slug,'input_type'=>$inputType,'sort_order'=>(int)($data['sort_order'] ?? 0),'is_active'=>1]);
        return $this->axisModel->find($id);
    }

    public function updateAxis(int $axisId, array $data): array
    {
        $axis = $this->axisModel->find($axisId);
        if (!$axis) throw new \RuntimeException('محور یافت نشد.', 404);
        $payload = [];
        if (isset($data['name'])) {
            $name = trim($data['name']);
            if ($name === '' || mb_strlen($name) > 100) throw new \RuntimeException('نام محور نامعتبر است.', 422);
            $payload['name'] = $name;
            $slug = SlugHelper::axisSlug($data['slug'] ?? $name);
            if ($slug !== $axis['slug']) {
                $slug = SlugHelper::axisUnique($slug, fn($s) => $this->axisModel->slugExistsInProduct($s, (int)$axis['product_id'], $axisId));
                $payload['slug'] = $slug;
            }
        }
        if (isset($data['input_type'])) {
            $it = $data['input_type'];
            if (!in_array($it, ['text','swatch'])) throw new \RuntimeException('نوع محور نامعتبر است.', 422);
            $payload['input_type'] = $it;
        }
        if (isset($data['sort_order'])) $payload['sort_order'] = (int)$data['sort_order'];
        if (!empty($payload)) $this->axisModel->update($axisId, $payload);
        return $this->axisModel->find($axisId);
    }

    public function deactivateAxis(int $axisId): array
    {
        $axis = $this->axisModel->find($axisId);
        if (!$axis) throw new \RuntimeException('محور یافت نشد.', 404);
        $productId = (int)$axis['product_id'];
        $pdo = Database::getInstance()->getConnection();
        $pdo->beginTransaction();
        try {
            $product = $this->productModel->lockForUpdate($productId);
            if (!$product) throw new \RuntimeException('محصول یافت نشد.', 404);
            $this->axisModel->update($axisId, ['is_active'=>0]);
            $pdo->prepare('UPDATE product_axis_values SET is_active=0 WHERE axis_id=?')->execute([$axisId]);
            // Rebuild variants that contained this axis
            $variants = $this->variantModel->getByProductId($productId);
            $newComboMap = []; // new combo_key => keeper variant_id
            foreach ($variants as $v) {
                $vid = (int)$v['id'];
                $links = $this->linkModel->getByVariantId($vid);
                $hasAxis = false;
                $remaining = [];
                foreach ($links as $l) {
                    if ((int)$l['axis_id'] === $axisId) $hasAxis = true;
                    else $remaining[] = [(int)$l['axis_id'], (int)$l['axis_value_id']];
                }
                if (!$hasAxis) continue;
                // Remove axis from links
                $pdo->prepare('DELETE FROM product_variant_links WHERE variant_id=? AND axis_id=?')->execute([$vid, $axisId]);
                $newKey = $this->comboKey($remaining);
                if (empty($remaining)) {
                    // Becomes Default: if another Default exists, this one becomes inactive duplicate
                    if (isset($newComboMap[$newKey])) {
                        $this->variantModel->update($vid, ['is_active'=>0,'combo_key'=>$newKey]);
                    } else {
                        $this->variantModel->update($vid, ['combo_key'=>$newKey]);
                        // Set links for remaining (none -> no links)
                        $newComboMap[$newKey] = $vid;
                    }
                    continue;
                }
                if (isset($newComboMap[$newKey])) {
                    // Duplicate after removal -> deactivate with most stock keeper wins
                    $keeperId = $newComboMap[$newKey];
                    $keeperInv = $this->inventoryModel->getByVariantId($keeperId);
                    $currInv = $this->inventoryModel->getByVariantId($vid);
                    $keeperQty = (int)($keeperInv['quantity'] ?? 0);
                    $currQty = (int)($currInv['quantity'] ?? 0);
                    if ($currQty > $keeperQty) {
                        // swap keeper
                        $this->variantModel->update($keeperId, ['is_active'=>0]);
                        $this->variantModel->update($vid, ['combo_key'=>$newKey]);
                        $newComboMap[$newKey] = $vid;
                    } else {
                        $this->variantModel->update($vid, ['is_active'=>0,'combo_key'=>$newKey]);
                    }
                } else {
                    $this->variantModel->update($vid, ['combo_key'=>$newKey]);
                    // Update remaining links already trimmed
                    $newComboMap[$newKey] = $vid;
                }
            }
            $this->syncProductAggregates($productId);
            $pdo->commit();
            return $this->axisModel->find($axisId);
        } catch (\Throwable $e) { $pdo->rollBack(); throw $e; }
    }

    public function createAxisValue(int $axisId, array $data): array
    {
        $axis = $this->axisModel->find($axisId);
        if (!$axis) throw new \RuntimeException('محور یافت نشد.', 404);
        if ((int)($axis['is_active'] ?? 1) !== 1) throw new \RuntimeException('محور غیرفعال است.', 422);
        $value = trim($data['value'] ?? '');
        if ($value === '' || mb_strlen($value) > 100) throw new \RuntimeException('مقدار محور الزامی است.', 422);
        $slug = SlugHelper::axisSlug($data['slug'] ?? $value, 'value');
        $slug = SlugHelper::axisUnique($slug, fn($s) => $this->axisValueModel->slugExistsInAxis($s, $axisId));
        $hex = $this->validateHexForSwatch($data['swatch_hex'] ?? null, $axis['input_type']);
        $pdo = Database::getInstance()->getConnection();
        // Reactivate if exists inactive
        $stmt = $pdo->prepare('SELECT id, is_active FROM product_axis_values WHERE axis_id=? AND slug=? LIMIT 1');
        $stmt->execute([$axisId, $slug]);
        $row = $stmt->fetch();
        if ($row) {
            if ((int)$row['is_active'] === 0) {
                $this->axisValueModel->update((int)$row['id'], ['value'=>$value,'swatch_hex'=>$hex,'is_active'=>1]);
                return $this->axisValueModel->find((int)$row['id']);
            }
            throw new \RuntimeException('مقدار تکراری است.', 422);
        }
        $id = $this->axisValueModel->create(['axis_id'=>$axisId,'value'=>$value,'slug'=>$slug,'swatch_hex'=>$hex,'sort_order'=>(int)($data['sort_order'] ?? 0),'is_active'=>1]);
        return $this->axisValueModel->find($id);
    }

    public function updateAxisValue(int $valueId, array $data): array
    {
        $val = $this->axisValueModel->find($valueId);
        if (!$val) throw new \RuntimeException('مقدار یافت نشد.', 404);
        $payload = [];
        if (isset($data['value'])) {
            $v = trim($data['value']);
            if ($v === '' || mb_strlen($v) > 100) throw new \RuntimeException('مقدار نامعتبر است.', 422);
            $payload['value'] = $v;
            $slug = SlugHelper::axisSlug($data['slug'] ?? $v);
            if ($slug !== $val['slug']) {
                $slug = SlugHelper::axisUnique($slug, fn($s) => $this->axisValueModel->slugExistsInAxis($s, (int)$val['axis_id'], $valueId));
                $payload['slug'] = $slug;
            }
        }
        if (array_key_exists('swatch_hex', $data)) {
            $axis = $this->axisModel->find((int)$val['axis_id']);
            $payload['swatch_hex'] = $this->validateHexForSwatch($data['swatch_hex'], $axis['input_type'] ?? 'text');
        }
        if (isset($data['sort_order'])) $payload['sort_order'] = (int)$data['sort_order'];
        if (!empty($payload)) $this->axisValueModel->update($valueId, $payload);
        return $this->axisValueModel->find($valueId);
    }

    public function deactivateAxisValue(int $valueId): array
    {
        $val = $this->axisValueModel->find($valueId);
        if (!$val) throw new \RuntimeException('مقدار یافت نشد.', 404);
        $this->axisValueModel->update($valueId, ['is_active'=>0]);
        $axisId = (int)$val['axis_id'];
        $productId = (int)$this->axisModel->find($axisId)['product_id'];
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare('SELECT variant_id FROM product_variant_links WHERE axis_value_id=?');
        $stmt->execute([$valueId]);
        $vids = $stmt->fetchAll(PDO::FETCH_COLUMN);
        foreach ($vids as $vid) {
            $this->variantModel->update((int)$vid, ['is_active'=>0]);
        }
        $this->syncProductAggregates($productId);
        return $this->axisValueModel->find($valueId);
    }

    public function mergeAxisValues(int $axisId, int $keepValueId, int $loseValueId): array
    {
        if ($keepValueId === $loseValueId) throw new \RuntimeException('مقادیر یکسان هستند.', 422);
        $axis = $this->axisModel->find($axisId);
        if (!$axis) throw new \RuntimeException('محور یافت نشد.', 404);
        $keep = $this->axisValueModel->find($keepValueId);
        $lose = $this->axisValueModel->find($loseValueId);
        if (!$keep || !$lose || (int)$keep['axis_id'] !== $axisId || (int)$lose['axis_id'] !== $axisId) throw new \RuntimeException('مقادیر متعلق به این محور نیستند.', 422);
        $pdo = Database::getInstance()->getConnection();
        $pdo->beginTransaction();
        try {
            $productId = (int)$axis['product_id'];
            $this->productModel->lockForUpdate($productId);
            // Free combo_key of losing variants to avoid unique conflict
            $loseVariants = $pdo->prepare('SELECT variant_id FROM product_variant_links WHERE axis_value_id=?');
            $loseVariants->execute([$loseValueId]);
            $loseVids = $loseVariants->fetchAll(PDO::FETCH_COLUMN);
            foreach ($loseVids as $vid) {
                $pdo->prepare('UPDATE product_variants SET combo_key = CONCAT(combo_key, "_tmp_merge") WHERE id=?')->execute([$vid]);
            }
            // Update links
            $pdo->prepare('UPDATE product_variant_links SET axis_value_id=? WHERE axis_value_id=?')->execute([$keepValueId, $loseValueId]);
            // Rebuild combo_keys
            foreach ($loseVids as $vid) {
                $links = $this->linkModel->getByVariantId((int)$vid);
                $pairs = array_map(fn($r) => [(int)$r['axis_id'], (int)$r['axis_value_id']], $links);
                $newKey = $this->comboKey($pairs);
                // Check duplicate active
                $dupStmt = $pdo->prepare('SELECT id, is_active FROM product_variants WHERE product_id=? AND combo_key=? AND id!=? LIMIT 1');
                $dupStmt->execute([$productId, $newKey, $vid]);
                $dup = $dupStmt->fetch();
                if ($dup && (int)$dup['is_active'] === 1) {
                    // Merge inventory into keeper
                    $keepInv = $this->inventoryModel->getByVariantId((int)$dup['id']);
                    $loseInv = $this->inventoryModel->getByVariantId((int)$vid);
                    $sum = (int)($keepInv['quantity'] ?? 0) + (int)($loseInv['quantity'] ?? 0);
                    $this->inventoryModel->upsert((int)$dup['id'], ['quantity'=>$sum]);
                    $pdo->prepare('UPDATE product_variants SET is_active=0, combo_key=? WHERE id=?')->execute([$newKey, $vid]);
                } else {
                    // Remove _tmp_merge suffix
                    $clean = str_replace('_tmp_merge','', $newKey);
                    // Actually recompute cleanly
                    $clean = $this->comboKey($pairs);
                    $pdo->prepare('UPDATE product_variants SET combo_key=? WHERE id=?')->execute([$clean, $vid]);
                }
            }
            // Deactivate losing value
            $this->axisValueModel->update($loseValueId, ['is_active'=>0]);
            $this->syncProductAggregates($productId);
            $pdo->commit();
            // Log merge
            error_log("[mergeValues] axis $axisId keep $keepValueId lose $loseValueId product $productId");
            return $this->axisValueModel->find($keepValueId);
        } catch (\Throwable $e) { $pdo->rollBack(); throw $e; }
    }

    public function addAxisToProductWithAssignment(int $productId, array $data): array
    {
        $name = trim($data['name'] ?? '');
        if ($name === '') throw new \RuntimeException('نام محور الزامی است.', 422);
        $inputType = $data['input_type'] ?? 'text';
        $values = $data['values'] ?? []; // array of {value, slug?, swatch_hex?}
        if (count($values) < 1) throw new \RuntimeException('حداقل یک مقدار لازم است.', 422);
        $assignExistingToValue = $data['assign_existing_to_value'] ?? null; // value string or id
        $pdo = Database::getInstance()->getConnection();
        $pdo->beginTransaction();
        try {
            $product = $this->productModel->lockForUpdate($productId);
            if (!$product) throw new \RuntimeException('محصول یافت نشد.', 404);
            $axis = $this->createAxis($productId, ['name'=>$name,'input_type'=>$inputType,'sort_order'=> $this->axisModel->countActiveByProduct($productId)]);
            $createdValues = [];
            foreach ($values as $v) {
                $createdValues[] = $this->createAxisValue((int)$axis['id'], $v);
            }
            // Determine which value existing variants map to
            $assignValueId = null;
            if ($assignExistingToValue !== null) {
                foreach ($createdValues as $cv) {
                    if ((string)$cv['id'] === (string)$assignExistingToValue || $cv['value'] === $assignExistingToValue || $cv['slug'] === $assignExistingToValue) {
                        $assignValueId = (int)$cv['id'];
                        break;
                    }
                }
                if (!$assignValueId) throw new \RuntimeException('مقدار نگاشت برای واریانت‌های موجود یافت نشد.', 422);
            } else {
                $assignValueId = (int)$createdValues[0]['id'];
            }
            $variants = $this->variantModel->getByProductId($productId);
            foreach ($variants as $v) {
                $vid = (int)$v['id'];
                // Only active variants get assignment; inactive remain
                if ((int)($v['is_active'] ?? 1) !== 1) continue;
                $links = $this->linkModel->getByVariantId($vid);
                $pairs = array_map(fn($r) => [(int)$r['axis_id'], (int)$r['axis_value_id']], $links);
                $pairs[] = [(int)$axis['id'], $assignValueId];
                $newKey = $this->comboKey($pairs);
                // Reactivate check not needed; just update
                $this->variantModel->update($vid, ['combo_key'=>$newKey]);
                $pdo->prepare('INSERT INTO product_variant_links (variant_id, axis_id, axis_value_id) VALUES (?,?,?)')->execute([$vid, (int)$axis['id'], $assignValueId]);
            }
            // Set product_type variable
            $pdo->prepare('UPDATE products SET product_type="variable" WHERE id=?')->execute([$productId]);
            $this->syncProductAggregates($productId);
            $pdo->commit();
            return $this->axisModel->find((int)$axis['id']);
        } catch (\Throwable $e) { $pdo->rollBack(); throw $e; }
    }

    public function createDefaultVariant(int $productId, array $productData): int
    {
        $product = $this->productModel->find($productId);
        if (!$product) throw new \RuntimeException('محصول یافت نشد.', 404);
        $slug = $product['slug'] ?: SlugHelper::make($product['name'], 'product-' . $productId);
        $sku = $this->generateSku($slug, [], $productId);
        $variantId = $this->variantModel->create([
            'product_id'  => $productId,
            'sku'         => $sku,
            'title'       => 'Default',
            'combo_key'   => '',
            'price'       => isset($productData['price']) ? (int)$productData['price'] : (int)$product['price'],
            'sale_price'  => $productData['sale_price'] ?? $product['sale_price'] ?? null,
            'is_default'  => 1,
            'is_active'   => 1,
            'position'    => 0,
        ]);
        $this->inventoryModel->upsert($variantId, [
            'quantity'            => (int)($productData['stock'] ?? $product['stock'] ?? 0),
            'low_stock_threshold' => (int)($productData['low_stock_threshold'] ?? $product['low_stock_threshold'] ?? 5),
        ]);
        return $variantId;
    }

    public function previewGenerate(int $productId, array $axes): array
    {
        // $axes = [{axis_id, value_ids: []}]
        $product = $this->productModel->find($productId);
        if (!$product) throw new \RuntimeException('محصول یافت نشد.', 404);
        if (empty($axes)) return ['new'=>0,'keep'=>0,'deactivate'=>0,'deactivatingWithOrders'=>[],'deactivatingWithCart'=>[]];
        $axisValues = [];
        $desiredKeys = [];
        foreach ($axes as $axis) {
            $axisId = (int)($axis['axis_id'] ?? $axis['type_id'] ?? 0);
            $valueIds = array_map('intval', $axis['value_ids'] ?? []);
            if (!$axisId || empty($valueIds)) throw new \RuntimeException('محور نامعتبر است.', 422);
            $vals = $this->axisValueModel->getByIds($valueIds);
            // filter by axisId
            $vals = array_filter($vals, fn($v) => (int)$v['axis_id'] === $axisId);
            if (count($vals) !== count($valueIds)) throw new \RuntimeException('مقادیر نامعتبر است.', 422);
            $axisValues[] = $vals;
        }
        $combos = $this->cartesianProduct($axisValues);
        foreach ($combos as $combo) {
            $pairs = array_map(fn($v) => [(int)$v['axis_id'], (int)$v['id']], $combo);
            $desiredKeys[] = $this->comboKey($pairs);
        }
        $existing = Database::getInstance()->getConnection()->query("SELECT id, combo_key, is_active FROM product_variants WHERE product_id=".(int)$productId)->fetchAll();
        $existingMap = [];
        foreach ($existing as $row) $existingMap[$row['combo_key']] = $row;
        $new = 0; $keep = 0; $deactivate = 0;
        $deactivatingIds = [];
        foreach ($desiredKeys as $k) {
            if (isset($existingMap[$k])) $keep++;
            else $new++;
        }
        foreach ($existingMap as $k => $row) {
            if (!in_array($k, $desiredKeys, true) && (int)$row['is_active'] === 1) { $deactivate++; $deactivatingIds[] = (int)$row['id']; }
        }
        $withOrders = []; $withCart = [];
        if (!empty($deactivatingIds)) {
            $ph = implode(',', array_fill(0, count($deactivatingIds), '?'));
            $pdo = Database::getInstance()->getConnection();
            $stmt = $pdo->prepare("SELECT DISTINCT variant_id FROM order_items WHERE variant_id IN ($ph)");
            $stmt->execute($deactivatingIds);
            $withOrders = $stmt->fetchAll(PDO::FETCH_COLUMN);
            $stmt = $pdo->prepare("SELECT DISTINCT variant_id FROM cart_items WHERE variant_id IN ($ph)");
            $stmt->execute($deactivatingIds);
            $withCart = $stmt->fetchAll(PDO::FETCH_COLUMN);
        }
        return ['new'=>$new,'keep'=>$keep,'deactivate'=>$deactivate,'deactivatingWithOrders'=>$withOrders,'deactivatingWithCart'=>$withCart,'totalDesired'=>count($desiredKeys)];
    }

    public function generateVariants(int $productId, array $axes): array
    {
        $product = $this->productModel->lockForUpdate($productId);
        if (!$product) throw new \RuntimeException('محصول یافت نشد.', 404);
        if (empty($axes)) throw new \RuntimeException('حداقل یک محور واریانت الزامی است.', 422);
        if (count($axes) > 3) throw new \RuntimeException('حداکثر ۳ محور واریانت مجاز است.', 422);

        $slug = $product['slug'] ?: SlugHelper::make($product['name'], 'product-' . $productId);

        $axisValues = [];
        foreach ($axes as $axis) {
            $axisId = (int)($axis['axis_id'] ?? $axis['type_id'] ?? 0);
            $valueIds = array_map('intval', $axis['value_ids'] ?? []);
            if (!$axisId || empty($valueIds)) throw new \RuntimeException('محور واریانت نامعتبر است.', 422);
            $vals = $this->axisValueModel->getByIds($valueIds);
            $filtered = array_filter($vals, fn($v) => (int)$v['axis_id'] === $axisId && (int)$v['is_active'] === 1);
            if (count($filtered) !== count($valueIds)) throw new \RuntimeException('مقادیر ویژگی نامعتبر است.', 422);
            $axisValues[] = array_values($filtered);
        }

        $combinations = $this->cartesianProduct($axisValues);
        if (count($combinations) > 100) {
            // Warn but allow — caller should have warned
        }
        $pdo = Database::getInstance()->getConnection();
        $pdo->beginTransaction();
        try {
            // Lock product row already
            $desiredMap = []; // combo_key => pairs
            foreach ($combinations as $combo) {
                $pairs = array_map(fn($v) => [(int)$v['axis_id'], (int)$v['id']], $combo);
                $key = $this->comboKey($pairs);
                $desiredMap[$key] = $pairs;
            }
            $existingRows = $pdo->prepare('SELECT id, combo_key, is_active, price, sale_price, sku FROM product_variants WHERE product_id=?');
            $existingRows->execute([$productId]);
            $existing = $existingRows->fetchAll();
            $existingMap = [];
            foreach ($existing as $row) $existingMap[$row['combo_key']] = $row;

            // Reference variant for price copying (first active)
            $refPrice = null; $refSale = null;
            foreach ($existing as $row) { if ((int)$row['is_active']===1) { $refPrice = $row['price']; $refSale = $row['sale_price']; break; } }

            $position = 0;
            foreach ($desiredMap as $key => $pairs) {
                if (isset($existingMap[$key])) {
                    $row = $existingMap[$key];
                    if ((int)$row['is_active'] === 0) {
                        // Reactivate: pick newest inactive if duplicates
                        $pdo->prepare('UPDATE product_variants SET is_active=1, position=? WHERE id=?')->execute([$position, $row['id']]);
                    }
                    $position++;
                    continue;
                }
                // New variant: price copied from ref, SKU generated, qty 0
                $titleParts = [];
                foreach ($pairs as [$axisId, $valId]) {
                    $v = $this->axisValueModel->find($valId);
                    $titleParts[] = $v['value'] ?? '';
                }
                $title = implode(' / ', array_filter($titleParts));
                // Generate SKU: avoid copying, generate fresh
                $comboForSku = [];
                foreach ($pairs as [$axisId, $valId]) {
                    $v = $this->axisValueModel->find($valId);
                    $comboForSku[] = ['slug'=>$v['slug'] ?? $v['value']];
                }
                $sku = $this->generateSku($slug, $comboForSku, $productId);
                $variantId = $this->variantModel->create([
                    'product_id' => $productId,
                    'sku'        => $sku,
                    'title'      => $title,
                    'combo_key'  => $key,
                    'price'      => $refPrice,
                    'sale_price' => $refSale,
                    'is_default' => 0,
                    'is_active'  => 1,
                    'position'   => $position,
                ]);
                // Links
                foreach ($pairs as [$axisId, $valId]) {
                    $pdo->prepare('INSERT INTO product_variant_links (variant_id, axis_id, axis_value_id) VALUES (?,?,?)')->execute([$variantId, $axisId, $valId]);
                }
                $this->inventoryModel->upsert($variantId, ['quantity'=>0,'low_stock_threshold'=>5]);
                $position++;
            }
            // Deactivate stale
            foreach ($existing as $row) {
                $key = $row['combo_key'];
                if (!isset($desiredMap[$key]) && (int)$row['is_active'] === 1) {
                    // Don't deactivate Default '' if it's the only one? But desired always has keys, so ok
                    $pdo->prepare('UPDATE product_variants SET is_active=0 WHERE id=?')->execute([$row['id']]);
                }
            }
            // Ensure product_type
            $pdo->prepare('UPDATE products SET product_type="variable" WHERE id=?')->execute([$productId]);
            $this->syncProductAggregates($productId);
            $pdo->commit();
            return $this->getActiveVariants($productId);
        } catch (\Throwable $e) { $pdo->rollBack(); throw $e; }
    }

    public function updateVariant(int $variantId, array $data): array
    {
        $variant = $this->variantModel->find($variantId);
        if (!$variant) throw new \RuntimeException('واریانت یافت نشد.', 404);
        if ((int)($variant['is_active'] ?? 1) !== 1 && isset($data['is_active']) && (int)$data['is_active'] === 0) {
            // allow deactivating already inactive
        } elseif ((int)($variant['is_active'] ?? 1) !== 1) {
            throw new \RuntimeException('واریانت غیرفعال است.', 422);
        }
        $payload = [];
        foreach (['sku', 'title', 'price', 'sale_price', 'cost_price', 'image_id', 'is_active', 'position', 'combo_key'] as $field) {
            if (array_key_exists($field, $data)) $payload[$field] = $data[$field];
        }
        if (isset($payload['sku']) && $this->variantModel->skuExists($payload['sku'], $variantId)) throw new \RuntimeException('SKU تکراری است.', 422);
        if (!empty($payload)) $this->variantModel->update($variantId, $payload);
        if (isset($data['quantity']) || isset($data['low_stock_threshold'])) {
            $this->inventoryModel->upsert($variantId, [
                'quantity'            => (int)($data['quantity'] ?? 0),
                'low_stock_threshold' => $data['low_stock_threshold'] ?? null,
            ]);
        }
        $this->syncProductAggregates((int)$variant['product_id']);
        return $this->variantModel->getWithDetails($variantId);
    }

    public function bulkUpdate(int $productId, array $variants): array
    {
        $product = $this->productModel->find($productId);
        if (!$product) throw new \RuntimeException('محصول یافت نشد.', 404);
        $updated = [];
        foreach ($variants as $row) {
            $id = (int)($row['id'] ?? 0);
            if (!$id) continue;
            $variant = $this->variantModel->find($id);
            if (!$variant || (int)$variant['product_id'] !== $productId) continue;
            $updated[] = $this->updateVariant($id, $row);
        }
        return $updated;
    }

    public function bulkInventory(int $productId, array $payload): array
    {
        // payload: {mode: 'all'|'filter', price?, quantity?, filter_axis_id?, filter_value_id?}
        $pdo = Database::getInstance()->getConnection();
        $activeVariants = $this->variantModel->getByProductId($productId, true);
        $ids = array_map(fn($v)=>(int)$v['id'], $activeVariants);
        if (empty($ids)) return [];
        if (($payload['mode'] ?? 'all') === 'filter' && isset($payload['filter_value_id'])) {
            $fid = (int)$payload['filter_value_id'];
            $stmt = $pdo->prepare('SELECT variant_id FROM product_variant_links WHERE axis_value_id=?');
            $stmt->execute([$fid]);
            $filtered = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
            $ids = array_values(array_intersect($ids, $filtered));
        }
        $out = [];
        foreach ($ids as $vid) {
            $data = [];
            if (isset($payload['price'])) $data['price'] = (int)$payload['price'];
            if (isset($payload['quantity'])) $data['quantity'] = (int)$payload['quantity'];
            if (!empty($data)) $out[] = $this->updateVariant($vid, $data);
        }
        return $out;
    }

    public function syncProductAggregates(int $productId): void
    {
        $default = $this->variantModel->getDefault($productId);
        if (!$default) return;
        $totalStock = 0;
        $variants = $this->variantModel->getByProductId($productId, true);
        foreach ($variants as $v) {
            $vInv = $this->inventoryModel->getByVariantId((int)$v['id']);
            $totalStock += (int)($vInv['quantity'] ?? 0);
        }
        $price = $default['price'] ?? $this->productModel->find($productId)['price'] ?? 0;
        $this->productModel->update($productId, ['price'=>(int)$price,'stock'=>$totalStock]);
    }

    public function decrementStock(int $variantId, int $qty): void
    {
        $variant = $this->variantModel->find($variantId);
        if (!$variant || (int)($variant['is_active'] ?? 1) !== 1) throw new \RuntimeException('واریانت غیرفعال است.', 422);
        $ok = $this->inventoryModel->decrementStock($variantId, $qty);
        if (!$ok) throw new \RuntimeException('موجودی کافی نیست.', 422);
        $this->syncProductAggregates((int)$variant['product_id']);
    }

    public function incrementStock(int $variantId, int $qty): void
    {
        $this->inventoryModel->incrementStock($variantId, $qty);
        $variant = $this->variantModel->find($variantId);
        if ($variant) $this->syncProductAggregates((int)$variant['product_id']);
    }

    public function getEffectivePrice(array $variant, array $product): int
    {
        if (isset($variant['sale_price']) && $variant['sale_price'] !== null && $variant['sale_price'] !== '') return (int)$variant['sale_price'];
        if (isset($variant['price']) && $variant['price'] !== null && $variant['price'] !== '') return (int)$variant['price'];
        if (isset($product['sale_price']) && $product['sale_price']) return (int)$product['sale_price'];
        return (int)($product['price'] ?? 0);
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
        if (!$this->variantModel->skuExists($base)) return $base;
        $i = 2;
        while ($this->variantModel->skuExists("{$base}-{$i}")) $i++;
        return "{$base}-{$i}";
    }
}
