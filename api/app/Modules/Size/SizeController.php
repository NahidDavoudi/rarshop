<?php

namespace App\Modules\Size;

use App\Core\Controller;
use App\Core\Http\Request;
use App\Modules\Size\SizeService;

class SizeController extends Controller
{
    private SizeService $service;

    public function __construct()
    {
        $this->service = new SizeService();
    }

    // GET /admin/size
    public function index(): void
    {
        $this->success($this->service->getAll());

    }

    // GET /admin/size/{id}
    public function show(int $id): void
    {
        try {
            $this->success($this->service->getOne($id));
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // POST /admin/size
    public function store(Request $request): void
    {
        $data = $request->only(['name', 'category', 'columns', 'rows']);

        try {
            $set = $this->service->create($data);
            $this->created($set, 'راهنمای سایز ایجاد شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /admin/size/{id}
    public function update(Request $request, int $id): void
    {
        $data = $request->only(['name', 'category', 'columns', 'rows']);

        try {
            $set = $this->service->update($id, $data);
            $this->success($set, 'راهنمای سایز بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // DELETE /admin/size/{id}
    public function destroy(int $id): void
    {
        try {
            $this->service->delete($id);
            $this->noContent();
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}