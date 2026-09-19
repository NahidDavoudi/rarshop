<?php

namespace App\Modules\Attribute;

use App\Core\Controller;
use App\Core\Http\Request;

class AttributeController extends Controller
{
    private AttributeService $service;

    public function __construct()
    {
        $this->service = new AttributeService(
            new AttributeTypeModel(),
            new AttributeValueModel(),
        );
    }

    // GET /api/v1/admin/attribute-types
    public function index(): void
    {
        $this->success($this->service->listTypes());
    }

    // POST /api/v1/admin/attribute-types
    public function store(Request $request): void
    {
        try {
            $type = $this->service->createType($request->all());
            $this->created($type);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // POST /api/v1/admin/attribute-types/{id}/values
    public function addValue(Request $request, int $id): void
    {
        try {
            $value = $this->service->createValue($id, $request->all());
            $this->created($value);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}
