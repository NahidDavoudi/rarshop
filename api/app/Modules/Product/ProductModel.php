<?php

namespace App\Modules\Product;

use App\Core\Database\Model;

class ProductModel extends Model
{
    protected string $table = 'products';
    protected array $fillable = [
        'name',
        'slug',
        'description',
        'short_description',
        'price',
        'sale_price',
        'category_id',
        'stock',
        'low_stock_threshold',
        'featured',
        'is_active',
        'status',
        'product_type',
    ];
    protected bool $timestamps = true;

    // لیست محصولات با فیلتر، مرتب‌سازی، صفحه‌بندی و فست‌ها
    public function paginateWithFilters(array $filters): array
    {
        [$baseWhere, $baseParams] = $this->buildBaseWhere($filters);

        $where  = $baseWhere;
        $params = $baseParams;

        $this->applyAttributeFilters($filters['attrs'] ?? [], $where, $params);
        $this->applyPriceFilters($filters, $where, $params);

        $sortMap = [
            'price_asc'  => 'p.price ASC',
            'price_desc' => 'p.price DESC',
            'newest'     => 'p.created_at DESC',
            'popular'    => 'p.views DESC',
        ];
        $orderBy = $sortMap[$filters['sort'] ?? ''] ?? 'p.id DESC';

        $limit  = min((int)($filters['limit'] ?? 12), 100);
        $page   = max((int)($filters['page'] ?? 1), 1);
        $offset = ($page - 1) * $limit;

        $whereStr = implode(' AND ', $where);

        $sql = "
            SELECT p.*,
                   (SELECT COALESCE(NULLIF(pi.image_medium_url, ''), pi.image_url) FROM product_images pi
                    WHERE pi.product_id = p.id AND pi.is_main = 1
                    LIMIT 1) AS main_image,
                   c.name AS category_name,
                   (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id) AS variant_count,
                   (SELECT MIN(COALESCE(pv.price, p.price)) FROM product_variants pv WHERE pv.product_id = p.id) AS price_min,
                   (SELECT MAX(COALESCE(pv.price, p.price)) FROM product_variants pv WHERE pv.product_id = p.id) AS price_max
            FROM {$this->table} p
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE {$whereStr}
            ORDER BY {$orderBy}
            LIMIT {$limit} OFFSET {$offset}
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll();

        $countSql  = "SELECT COUNT(*) FROM {$this->table} p LEFT JOIN categories c ON c.id = p.category_id WHERE {$whereStr}";
        $countStmt = $this->pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $facets = $this->computeFacets($baseWhere, $baseParams);

        return [
            'data'        => $items,
            'total'       => $total,
            'page'        => $page,
            'limit'       => $limit,
            'last_page'   => (int) ceil($total / max($limit, 1)),
            'facets'      => $facets['attributes'],
            'price_range' => $facets['price_range'],
        ];
    }

    private function buildBaseWhere(array $filters): array
    {
        $where  = ['1=1'];
        $params = [];

        if (!empty($filters['category_id'])) {
            $where[]  = 'p.category_id = ?';
            $params[] = (int) $filters['category_id'];
        } elseif (!empty($filters['category'])) {
            $where[]  = 'c.slug = ?';
            $params[] = $filters['category'];
        }
        if (isset($filters['featured']) && $filters['featured'] !== null && $filters['featured'] !== '') {
            $where[]  = 'p.featured = ?';
            $params[] = (int) $filters['featured'];
        }
        if (!empty($filters['q'])) {
            $where[]  = '(p.name LIKE ? OR p.description LIKE ?)';
            $params[] = "%{$filters['q']}%";
            $params[] = "%{$filters['q']}%";
        }

        return [$where, $params];
    }

    private function applyAttributeFilters(array $attrs, array &$where, array &$params): void
    {
        foreach ($attrs as $typeSlug => $valueSlugs) {
            if (!is_string($typeSlug) || $typeSlug === '') {
                continue;
            }

            $slugs = array_values(array_filter(array_map(
                fn($s) => trim((string) $s),
                is_array($valueSlugs) ? $valueSlugs : explode(',', (string) $valueSlugs)
            )));

            if (empty($slugs)) {
                continue;
            }

            $variantPlaceholders = implode(',', array_fill(0, count($slugs), '?'));
            $descPlaceholders    = implode(',', array_fill(0, count($slugs), '?'));

            $where[] = "(
                EXISTS (
                    SELECT 1
                    FROM product_variants pv
                    JOIN variant_attribute_values vav ON vav.variant_id = pv.id
                    JOIN attribute_values av ON av.id = vav.attribute_value_id
                    JOIN attribute_types at ON at.id = av.attribute_type_id
                    WHERE pv.product_id = p.id
                      AND at.slug = ?
                      AND at.is_filterable = 1
                      AND av.slug IN ({$variantPlaceholders})
                )
                OR EXISTS (
                    SELECT 1
                    FROM product_attributes pa
                    JOIN attribute_types at ON at.id = pa.attribute_type_id
                    LEFT JOIN attribute_values av ON av.id = pa.attribute_value_id
                    WHERE pa.product_id = p.id
                      AND at.slug = ?
                      AND at.is_filterable = 1
                      AND (
                          av.slug IN ({$descPlaceholders})
                          OR pa.custom_value IN ({$descPlaceholders})
                      )
                )
            )";

            $params[] = $typeSlug;
            foreach ($slugs as $slug) {
                $params[] = $slug;
            }
            $params[] = $typeSlug;
            foreach ($slugs as $slug) {
                $params[] = $slug;
            }
            foreach ($slugs as $slug) {
                $params[] = $slug;
            }
        }
    }

    private function applyPriceFilters(array $filters, array &$where, array &$params): void
    {
        $priceMin = isset($filters['price_min']) && $filters['price_min'] !== '' && $filters['price_min'] !== null
            ? (int) $filters['price_min'] : null;
        $priceMax = isset($filters['price_max']) && $filters['price_max'] !== '' && $filters['price_max'] !== null
            ? (int) $filters['price_max'] : null;

        if ($priceMin !== null) {
            $where[] = "(
                SELECT MAX(COALESCE(pv.price, p.price))
                FROM product_variants pv
                WHERE pv.product_id = p.id
            ) >= ?";
            $params[] = $priceMin;
        }

        if ($priceMax !== null) {
            $where[] = "(
                SELECT MIN(COALESCE(pv.price, p.price))
                FROM product_variants pv
                WHERE pv.product_id = p.id
            ) <= ?";
            $params[] = $priceMax;
        }
    }

    private function computeFacets(array $baseWhere, array $baseParams): array
    {
        $whereStr = implode(' AND ', $baseWhere);

        $variantFacetSql = "
            SELECT at.slug AS type_slug,
                   at.name AS type_name,
                   at.input_type,
                   at.is_variant_axis,
                   at.sort_order AS type_sort,
                   av.id AS value_id,
                   av.value,
                   av.slug AS value_slug,
                   av.swatch_hex,
                   av.sort_order AS value_sort,
                   COUNT(DISTINCT p.id) AS product_count
            FROM {$this->table} p
            LEFT JOIN categories c ON c.id = p.category_id
            JOIN product_variants pv ON pv.product_id = p.id
            JOIN variant_attribute_values vav ON vav.variant_id = pv.id
            JOIN attribute_values av ON av.id = vav.attribute_value_id
            JOIN attribute_types at ON at.id = av.attribute_type_id AND at.is_filterable = 1
            WHERE {$whereStr}
            GROUP BY at.id, av.id
            ORDER BY at.sort_order ASC, av.sort_order ASC
        ";

        $descFacetSql = "
            SELECT at.slug AS type_slug,
                   at.name AS type_name,
                   at.input_type,
                   at.is_variant_axis,
                   at.sort_order AS type_sort,
                   av.id AS value_id,
                   av.value,
                   av.slug AS value_slug,
                   av.swatch_hex,
                   av.sort_order AS value_sort,
                   COUNT(DISTINCT p.id) AS product_count
            FROM {$this->table} p
            LEFT JOIN categories c ON c.id = p.category_id
            JOIN product_attributes pa ON pa.product_id = p.id
            JOIN attribute_types at ON at.id = pa.attribute_type_id AND at.is_filterable = 1
            LEFT JOIN attribute_values av ON av.id = pa.attribute_value_id
            WHERE {$whereStr}
              AND av.id IS NOT NULL
            GROUP BY at.id, av.id
            ORDER BY at.sort_order ASC, av.sort_order ASC
        ";

        $variantStmt = $this->pdo->prepare($variantFacetSql);
        $variantStmt->execute($baseParams);
        $variantRows = $variantStmt->fetchAll();

        $descStmt = $this->pdo->prepare($descFacetSql);
        $descStmt->execute($baseParams);
        $descRows = $descStmt->fetchAll();

        $attributes = [];
        foreach (array_merge($variantRows, $descRows) as $row) {
            $slug = $row['type_slug'];
            if (!isset($attributes[$slug])) {
                $attributes[$slug] = [
                    'type_slug'       => $slug,
                    'type_name'       => $row['type_name'],
                    'input_type'      => $row['input_type'],
                    'is_variant_axis' => (int) $row['is_variant_axis'],
                    'values'          => [],
                ];
            }

            $valueSlug = $row['value_slug'];
            if (!isset($attributes[$slug]['values'][$valueSlug])) {
                $attributes[$slug]['values'][$valueSlug] = [
                    'id'            => (int) $row['value_id'],
                    'value'         => $row['value'],
                    'slug'          => $valueSlug,
                    'swatch_hex'    => $row['swatch_hex'],
                    'product_count' => (int) $row['product_count'],
                ];
            } else {
                $attributes[$slug]['values'][$valueSlug]['product_count'] += (int) $row['product_count'];
            }
        }

        foreach ($attributes as &$attr) {
            $attr['values'] = array_values($attr['values']);
        }
        unset($attr);

        $priceSql = "
            SELECT
                MIN(
                    COALESCE(
                        (SELECT MIN(COALESCE(pv.price, p.price)) FROM product_variants pv WHERE pv.product_id = p.id),
                        p.price
                    )
                ) AS min_price,
                MAX(
                    COALESCE(
                        (SELECT MAX(COALESCE(pv.price, p.price)) FROM product_variants pv WHERE pv.product_id = p.id),
                        p.price
                    )
                ) AS max_price
            FROM {$this->table} p
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE {$whereStr}
        ";

        $priceStmt = $this->pdo->prepare($priceSql);
        $priceStmt->execute($baseParams);
        $priceRow = $priceStmt->fetch() ?: [];

        $minPrice = isset($priceRow['min_price']) ? (int) $priceRow['min_price'] : 0;
        $maxPrice = isset($priceRow['max_price']) ? (int) $priceRow['max_price'] : 0;

        return [
            'attributes'  => array_values($attributes),
            'price_range' => [
                'min'  => $minPrice,
                'max'  => $maxPrice,
                'step' => $this->computePriceStep($minPrice, $maxPrice),
            ],
        ];
    }

    private function computePriceStep(int $min, int $max): int
    {
        $span = max($max - $min, 0);
        if ($span <= 0) {
            return 1;
        }
        if ($span <= 100000) {
            return 10000;
        }
        if ($span <= 1000000) {
            return 50000;
        }
        return 100000;
    }

    // محصول کامل با تصاویر و آپشن‌ها
    public function getFullProduct(int $id): ?array
    {
        $product = $this->find($id);
        if (!$product) return null;

        $product['images']  = $this->getImages($id);
        $product['options'] = $this->getOptions($id);

        return $product;
    }

    public function getImages(int $productId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM product_images
            WHERE product_id = ?
            ORDER BY is_main DESC, sort_order ASC
        ");
        $stmt->execute([$productId]);
        return $stmt->fetchAll();
    }

    public function getOptions(int $productId): array
    {
        return [];
    }

    public function getDescriptiveAttributes(int $productId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT at.slug AS type_slug, at.name AS type_name,
                   av.value AS value_value, pa.custom_value
            FROM product_attributes pa
            JOIN attribute_types at ON at.id = pa.attribute_type_id
            LEFT JOIN attribute_values av ON av.id = pa.attribute_value_id
            WHERE pa.product_id = ?
            ORDER BY at.sort_order ASC
        ");
        $stmt->execute([$productId]);
        return $stmt->fetchAll();
    }

    public function getRelated(int $productId, int $limit = 4): array
    {
        $product = $this->find($productId);
        if (!$product || !$product['category_id']) return [];

        $stmt = $this->pdo->prepare("
            SELECT p.*,
                   (SELECT COALESCE(NULLIF(pi.image_medium_url, ''), pi.image_url) FROM product_images pi
                    WHERE pi.product_id = p.id AND pi.is_main = 1
                    LIMIT 1) AS main_image
            FROM {$this->table} p
            WHERE p.category_id = ?
              AND p.id != ?
              AND p.stock > 0
              AND p.is_active = 1
            ORDER BY p.featured DESC, p.views DESC
            LIMIT ?
        ");
        $stmt->execute([$product['category_id'], $productId, $limit]);
        return $stmt->fetchAll();
    }

    public function getFeatured(int $limit = 8): array
    {
        $stmt = $this->pdo->prepare("
            SELECT p.*,
                   (SELECT COALESCE(NULLIF(pi.image_medium_url, ''), pi.image_url) FROM product_images pi
                    WHERE pi.product_id = p.id AND pi.is_main = 1
                    LIMIT 1) AS main_image
            FROM {$this->table} p
            WHERE p.featured = 1 AND p.is_active = 1 AND p.stock > 0
            ORDER BY p.created_at DESC
            LIMIT ?
        ");
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    }

    public function incrementViews(int $id): void
    {
        $this->pdo->prepare(
            "UPDATE {$this->table} SET views = views + 1 WHERE id = ?"
        )->execute([$id]);
    }

    public function decrementStock(int $id, int $qty = 1): bool
    {
        $stmt = $this->pdo->prepare("
            UPDATE {$this->table}
            SET stock = stock - ?
            WHERE id = ? AND stock >= ?
        ");
        $stmt->execute([$qty, $id, $qty]);
        return $stmt->rowCount() > 0;
    }

    public function incrementStock(int $id, int $qty = 1): void
    {
        $this->pdo->prepare("
            UPDATE {$this->table} SET stock = stock + ? WHERE id = ?
        ")->execute([$qty, $id]);
    }

    public function slugExists(string $slug, ?int $excludeId = null): bool
    {
        return $this->exists('slug', $slug, $excludeId);
    }
}
