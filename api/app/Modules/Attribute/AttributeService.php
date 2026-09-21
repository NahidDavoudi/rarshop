<?php

namespace App\Modules\Attribute;

use App\Utils\SlugHelper;

class AttributeService
{
    public function __construct(
        private AttributeTypeModel  $typeModel,
        private AttributeValueModel $valueModel,
    ) {}

    public function listTypes(): array
    {
        return $this->typeModel->getAllWithValues();
    }

    public function createType(array $data): array
    {
        $name = trim($data['name'] ?? '');
        if ($name === '') {
            throw new \RuntimeException('نام ویژگی الزامی است.', 422);
        }

        $slug = trim($data['slug'] ?? '') ?: SlugHelper::make($name);
        if ($this->typeModel->slugExists($slug)) {
            throw new \RuntimeException('شناسه ویژگی تکراری است.', 422);
        }

        $id = $this->typeModel->create([
            'name'            => $name,
            'slug'            => $slug,
            'input_type'      => $data['input_type'] ?? 'select',
            'is_variant_axis' => (int) ($data['is_variant_axis'] ?? 0),
            'is_filterable'   => (int) ($data['is_filterable'] ?? 1),
            'is_required'     => (int) ($data['is_required'] ?? 0),
            'sort_order'      => (int) ($data['sort_order'] ?? 0),
        ]);

        $values = $data['values'] ?? [];
        foreach ($values as $i => $val) {
            $this->createValue($id, $val, $i);
        }

        return $this->getType($id);
    }

    public function getType(int $id): array
    {
        $type = $this->typeModel->find($id);
        if (!$type) {
            throw new \RuntimeException('ویژگی یافت نشد.', 404);
        }
        $type['values'] = $this->valueModel->getByTypeId($id);
        return $type;
    }

    public function createValue(int $typeId, array $data, int $sortOrder = 0): array
    {
        $this->typeModel->find($typeId) or throw new \RuntimeException('ویژگی یافت نشد.', 404);

        $value = trim($data['value'] ?? '');
        if ($value === '') {
            throw new \RuntimeException('مقدار ویژگی الزامی است.', 422);
        }

        $slug = trim($data['slug'] ?? '') ?: SlugHelper::make($value);

        $id = $this->valueModel->create([
            'attribute_type_id' => $typeId,
            'value'             => $value,
            'slug'              => $slug,
            'swatch_hex'        => $data['swatch_hex'] ?? null,
            'sort_order'        => (int) ($data['sort_order'] ?? $sortOrder),
        ]);

        return $this->valueModel->find($id);
    }
}
