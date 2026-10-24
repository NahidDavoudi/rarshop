<?php

namespace App\Modules\Variant;

use App\Core\Database\Database;
use App\Utils\SlugHelper;

/**
 * ذخیره‌ی یکجای گرید واریانت‌ها.
 * در VariantService با `use VariantGridSync;` اضافه شود.
 *
 * ورودی:
 *  axes: [{id?, name, input_type: text|swatch}]            (ترتیب = ترتیب ستون‌ها)
 *  rows: [{id?, values: [{value, hex?}], sku, price, quantity}]
 *
 * قوانین:
 *  - محور/مقدار جدید خودکار ساخته می‌شود، مقدار غیرفعال دوباره فعال می‌شود.
 *  - سطر حذف‌شده فقط غیرفعال می‌شود (سفارش‌ها و سبدها سالم می‌مانند).
 *  - همه‌چیز در یک تراکنش.
 */
trait VariantGridSync
{
    public function syncGrid(int $productId, array $axesIn, array $rowsIn): array
    {
        $axesIn = array_values($axesIn);
        $rowsIn = array_values($rowsIn);
        $nAxes  = count($axesIn);

        if ($nAxes > 3)                           throw new \RuntimeException('حداکثر ۳ ستون پارامتر مجاز است.', 422);
        if (empty($rowsIn))                       throw new \RuntimeException('حداقل یک سطر لازم است.', 422);
        if (count($rowsIn) > 300)                 throw new \RuntimeException('حداکثر ۳۰۰ سطر مجاز است.', 422);
        if ($nAxes === 0 && count($rowsIn) > 1)   throw new \RuntimeException('محصول بدون پارامتر فقط یک سطر دارد.', 422);

        // ── اعتبارسنجی محورها ──
        $seenNames = [];
        foreach ($axesIn as $i => $ax) {
            $name = trim((string)($ax['name'] ?? ''));
            if ($name === '' || mb_strlen($name) > 100) {
                throw new \RuntimeException('نام ستون ' . ($i + 1) . ' نامعتبر است.', 422);
            }
            $k = mb_strtolower($name);
            if (isset($seenNames[$k])) throw new \RuntimeException('نام ستون‌ها نباید تکراری باشد.', 422);
            $seenNames[$k] = true;
            $type = $ax['input_type'] ?? 'text';
            if (!in_array($type, ['text', 'swatch'], true)) throw new \RuntimeException('نوع ستون نامعتبر است.', 422);
            $axesIn[$i]['name'] = $name;
            $axesIn[$i]['input_type'] = $type;
        }

        // ── اعتبارسنجی سطرها ──
        $seenRows = [];
        foreach ($rowsIn as $r => $row) {
            $n = $r + 1;
            $values = array_values((array)($row['values'] ?? []));
            if (count($values) !== $nAxes) throw new \RuntimeException("سطر $n: تعداد مقادیر با ستون‌ها یکسان نیست.", 422);

            $cells = [];
            foreach ($values as $c => $cell) {
                if (is_array($cell)) { $val = trim((string)($cell['value'] ?? '')); $hex = $cell['hex'] ?? null; }
                else                 { $val = trim((string)$cell); $hex = null; }
                if ($val === '' || mb_strlen($val) > 100) {
                    throw new \RuntimeException("سطر $n: خانه‌ی «{$axesIn[$c]['name']}» خالی یا نامعتبر است.", 422);
                }
                $cells[] = ['value' => $val, 'hex' => $hex];
            }

            $key = mb_strtolower(implode("\x1f", array_column($cells, 'value')));
            if (isset($seenRows[$key])) throw new \RuntimeException("سطر $n: این ترکیب تکراری است.", 422);
            $seenRows[$key] = true;

            $price = $row['price'] ?? null;
            if ($price === null || $price === '' || !is_numeric($price) || $price < 0) {
                throw new \RuntimeException("سطر $n: قیمت نامعتبر است.", 422);
            }

            $rowsIn[$r] = [
                'id'       => (int)($row['id'] ?? 0),
                'cells'    => $cells,
                'sku'      => trim((string)($row['sku'] ?? '')),
                'price'    => (int)round((float)$price),
                'quantity' => max(0, (int)($row['quantity'] ?? 0)),
            ];
        }

        $pdo = Database::getInstance()->getConnection();
        $pdo->beginTransaction();
        try {
            $product = $this->productModel->lockForUpdate($productId);
            if (!$product) throw new \RuntimeException('محصول یافت نشد.', 404);

            // ── 1) محورها ──
            $existingAxes = $this->axisModel->getByProductId($productId, false);
            $axisById = [];
            foreach ($existingAxes as $ea) $axisById[(int)$ea['id']] = $ea;

            $kept = [];
            $resolved = []; // idx => ['id', 'type']
            foreach ($axesIn as $idx => $ax) {
                $aid = (int)($ax['id'] ?? 0);
                $row = ($aid && isset($axisById[$aid]) && !isset($kept[$aid])) ? $axisById[$aid] : null;

                if (!$row && !$aid) {
                    foreach ($existingAxes as $ea) {
                        if (!isset($kept[(int)$ea['id']]) && mb_strtolower($ea['name']) === mb_strtolower($ax['name'])) {
                            $row = $ea;
                            break;
                        }
                    }
                }

                if ($row) {
                    $axisId = (int)$row['id'];
                    $upd = ['name' => $ax['name'], 'input_type' => $ax['input_type'], 'sort_order' => $idx, 'is_active' => 1];
                    if ($row['name'] !== $ax['name']) {
                        $slug = SlugHelper::axisSlug($ax['name'], 'axis');
                        $upd['slug'] = SlugHelper::axisUnique($slug, fn($s) => $this->axisModel->slugExistsInProduct($s, $productId, $axisId));
                    }
                    $this->axisModel->update($axisId, $upd);
                } else {
                    $slug = SlugHelper::axisSlug($ax['name'], 'axis');
                    $slug = SlugHelper::axisUnique($slug, fn($s) => $this->axisModel->slugExistsInProduct($s, $productId));
                    $axisId = (int)$this->axisModel->create([
                        'product_id' => $productId,
                        'name'       => $ax['name'],
                        'slug'       => $slug,
                        'input_type' => $ax['input_type'],
                        'sort_order' => $idx,
                        'is_active'  => 1,
                    ]);
                }
                $kept[$axisId] = true;
                $resolved[$idx] = ['id' => $axisId, 'type' => $ax['input_type']];
            }
            foreach ($existingAxes as $ea) {
                if (!isset($kept[(int)$ea['id']]) && (int)($ea['is_active'] ?? 1) === 1) {
                    $this->axisModel->update((int)$ea['id'], ['is_active' => 0]);
                }
            }

            // ── 2) مقدارها (کش بر اساس متن، حساس‌نبودن به حروف) ──
            $cache = [];
            foreach ($resolved as $ax) {
                $cache[$ax['id']] = [];
                $stmt = $pdo->prepare('SELECT * FROM product_axis_values WHERE axis_id = ?');
                $stmt->execute([$ax['id']]);
                foreach ($stmt->fetchAll() as $v) {
                    $cache[$ax['id']][mb_strtolower(trim($v['value']))] = $v;
                }
            }

            // ── 3) برنامه‌ی هر سطر ──
            $existingVariants = $this->variantModel->getByProductId($productId);
            $varById = [];
            $varByKey = [];
            foreach ($existingVariants as $v) {
                $varById[(int)$v['id']] = $v;
                $varByKey[$v['combo_key']] = $v;
            }

            $plans = [];
            $keys = [];
            foreach ($rowsIn as $r => $row) {
                $pairs = [];
                foreach ($row['cells'] as $c => $cell) {
                    $ax = $resolved[$c];
                    $valId = $this->resolveGridValue($cache, $ax['id'], $ax['type'], $cell['value'], $cell['hex']);
                    $pairs[] = [$ax['id'], $valId];
                }
                $key = $this->comboKey($pairs);
                if (isset($keys[$key])) throw new \RuntimeException('سطر ' . ($r + 1) . ': این ترکیب تکراری است.', 422);
                $keys[$key] = true;
                $plans[$r] = ['row' => $row, 'pairs' => $pairs, 'key' => $key, 'vid' => 0];
            }

            $claimed = [];
            foreach (array_keys($plans) as $r) { // اول بر اساس id
                $id = $plans[$r]['row']['id'];
                if ($id && isset($varById[$id]) && !isset($claimed[$id])) {
                    $plans[$r]['vid'] = $id;
                    $claimed[$id] = true;
                }
            }
            foreach (array_keys($plans) as $r) { // بعد بر اساس combo_key (فعال‌سازی مجدد)
                if ($plans[$r]['vid']) continue;
                $hit = $varByKey[$plans[$r]['key']] ?? null;
                if ($hit && !isset($claimed[(int)$hit['id']])) {
                    $plans[$r]['vid'] = (int)$hit['id'];
                    $claimed[(int)$hit['id']] = true;
                }
            }

            // آزادکردن combo_key واریانت‌های درگیر (برای جابه‌جایی امن بدون خطای unique)
            if ($claimed) {
                $ids = array_keys($claimed);
                $ph = implode(',', array_fill(0, count($ids), '?'));
                $pdo->prepare("UPDATE product_variants SET combo_key = CONCAT('__tmp_', id) WHERE id IN ($ph)")->execute($ids);
            }

            // واریانت‌های خارج از جدول: غیرفعال
            foreach ($existingVariants as $v) {
                $id = (int)$v['id'];
                if (isset($claimed[$id])) continue;
                $upd = [];
                if ((int)($v['is_active'] ?? 1) === 1) $upd['is_active'] = 0;
                if ((int)($v['is_default'] ?? 0) === 1) $upd['is_default'] = 0;
                if (isset($keys[$v['combo_key']])) $upd['combo_key'] = '__off_' . $id;
                if ($upd) $this->variantModel->update($id, $upd);
            }

            // ── 4) اعمال سطرها ──
            $productSlug = $product['slug'] ?: SlugHelper::make($product['name'], 'product-' . $productId);
            $position = 0;
            $firstVid = null;

            foreach ($plans as $p) {
                $row = $p['row'];
                $parts = array_column($row['cells'], 'value');
                $data = [
                    'combo_key' => $p['key'],
                    'title'     => $parts ? implode(' / ', $parts) : 'Default',
                    'price'     => $row['price'],
                    'is_active' => 1,
                    'position'  => $position,
                ];

                $comboForSku = [];
                foreach ($p['pairs'] as [, $valId]) {
                    $vr = $this->axisValueModel->find($valId);
                    $comboForSku[] = ['slug' => $vr['slug'] ?? $vr['value']];
                }

                if ($p['vid']) {
                    $vid = $p['vid'];
                    $curSku = (string)($varById[$vid]['sku'] ?? '');
                    if ($row['sku'] !== '' && $row['sku'] !== $curSku) {
                        if ($this->variantModel->skuExists($row['sku'], $vid)) {
                            throw new \RuntimeException("SKU «{$row['sku']}» تکراری است.", 422);
                        }
                        $data['sku'] = $row['sku'];
                    } elseif ($curSku === '') {
                        $data['sku'] = $this->generateSku($productSlug, $comboForSku, $productId);
                    }
                    $this->variantModel->update($vid, $data);
                } else {
                    if ($row['sku'] !== '') {
                        if ($this->variantModel->skuExists($row['sku'])) {
                            throw new \RuntimeException("SKU «{$row['sku']}» تکراری است.", 422);
                        }
                        $sku = $row['sku'];
                    } else {
                        $sku = $this->generateSku($productSlug, $comboForSku, $productId);
                    }
                    $vid = (int)$this->variantModel->create($data + [
                        'product_id' => $productId,
                        'sku'        => $sku,
                        'is_default' => 0,
                    ]);
                }

                $this->linkModel->setLinks($vid, $p['pairs']);

                $inv = $this->inventoryModel->getByVariantId($vid);
                $this->inventoryModel->upsert($vid, [
                    'quantity'            => $row['quantity'],
                    'low_stock_threshold' => $inv['low_stock_threshold'] ?? 5,
                    'track_inventory'     => $inv['track_inventory'] ?? 1,
                ]);

                if ($firstVid === null) $firstVid = $vid;
                $position++;
            }

            // حداقل یک واریانت پیش‌فرضِ فعال
            $stmt = $pdo->prepare('SELECT COUNT(*) FROM product_variants WHERE product_id = ? AND is_active = 1 AND is_default = 1');
            $stmt->execute([$productId]);
            if (!(int)$stmt->fetchColumn() && $firstVid) {
                $this->variantModel->unsetDefault($productId);
                $this->variantModel->update($firstVid, ['is_default' => 1]);
            }

            // مقدارهای بلااستفاده‌ی محورهای فعال غیرفعال شوند
            $axisIds = array_column($resolved, 'id');
            if ($axisIds) {
                $ph = implode(',', array_fill(0, count($axisIds), '?'));
                $pdo->prepare("
                    UPDATE product_axis_values SET is_active = 0
                    WHERE axis_id IN ($ph)
                      AND id NOT IN (
                        SELECT pvl.axis_value_id FROM product_variant_links pvl
                        JOIN product_variants pv ON pv.id = pvl.variant_id
                        WHERE pv.product_id = ? AND pv.is_active = 1
                      )
                ")->execute(array_merge($axisIds, [$productId]));
            }

            $pdo->prepare('UPDATE products SET product_type = ? WHERE id = ?')
                ->execute([$nAxes > 0 ? 'variable' : 'simple', $productId]);

            $this->syncProductAggregates($productId);
            $pdo->commit();

            return [
                'axes'     => $this->getProductAxes($productId),
                'variants' => $this->getActiveVariants($productId),
            ];
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
    }

    /** پیدا کردن/ساختن/فعال‌سازی مقدار یک محور بر اساس متن. */
    private function resolveGridValue(array &$cache, int $axisId, string $inputType, string $value, ?string $hex): int
    {
        $k   = mb_strtolower($value);
        $hex = $inputType === 'swatch' ? $this->validateHexForSwatch($hex, 'swatch') : null;

        if (isset($cache[$axisId][$k])) {
            $row = $cache[$axisId][$k];
            $upd = [];
            if ((int)($row['is_active'] ?? 1) !== 1) $upd['is_active'] = 1;
            if ($inputType === 'swatch') {
                if ($hex !== null && $hex !== ($row['swatch_hex'] ?? null)) $upd['swatch_hex'] = $hex;
            } elseif (!empty($row['swatch_hex'])) {
                $upd['swatch_hex'] = null;
            }
            if ($upd) {
                $this->axisValueModel->update((int)$row['id'], $upd);
                $cache[$axisId][$k] = array_merge($row, $upd);
            }
            return (int)$row['id'];
        }

        $slug = SlugHelper::axisSlug($value, 'value');
        $slug = SlugHelper::axisUnique($slug, fn($s) => $this->axisValueModel->slugExistsInAxis($s, $axisId));
        $id = (int)$this->axisValueModel->create([
            'axis_id'    => $axisId,
            'value'      => $value,
            'slug'       => $slug,
            'swatch_hex' => $hex,
            'sort_order' => count($cache[$axisId] ?? []),
            'is_active'  => 1,
        ]);
        $cache[$axisId][$k] = ['id' => $id, 'value' => $value, 'swatch_hex' => $hex, 'is_active' => 1];
        return $id;
    }
}
