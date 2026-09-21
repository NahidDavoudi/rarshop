<?php 
namespace App\Modules\Size;
use App\Core\Logger;
use App\Modules\Size\SizeModel;

class SizeService {
    protected SizeModel $model;
    public function __construct(){
        $this->model = new SizeModel();
    }
    public function getAll(): array
    {
        $size = $this->model->all();
        return $size;
    }

    public function getOne(int $id): array
    {
        $set = $this->model->find($id);
        if (!$set) {
            throw new \RuntimeException('راهنمای سایز یافت نشد.', 404);
        }
        return $set;
    }

    public function create(array $data): array
    {
        $this->validate($data);

        $id = $this->model->create([
            'name'     => trim($data['name']),
            'category' => trim($data['category'] ?? '') ?: null,
            'columns'  => array_values(array_filter(array_map('trim', $data['columns']))),
            'rows'     => $data['rows'],
        ]);

        Logger::info('size_guide_created', ['id' => $id]);

        return $this->getOne($id);
    }

    public function update(int $id, array $data): array
    {
        $this->getOne($id); // اطمینان از وجود
        $this->validate($data);

        $this->model->update($id, [
            'name'     => trim($data['name']),
            'category' => trim($data['category'] ?? '') ?: null,
            'columns'  => array_values(array_filter(array_map('trim', $data['columns']))),
            'rows'     => $data['rows'],
        ]);

        Logger::info('size_guide_updated', ['id' => $id]);

        return $this->getOne($id);
    }

    public function delete(int $id): void
    {
        $this->getOne($id);

        if ($this->model->isInUse($id)) {
            throw new \RuntimeException('این راهنمای سایز به یک یا چند محصول متصل است و قابل حذف نیست.', 422);
        }

        $this->model->delete($id);
        Logger::info('size_guide_deleted', ['id' => $id]);
    }

    private function validate(array $data): void
    {
        if (empty(trim($data['name'] ?? ''))) {
            throw new \RuntimeException('نام راهنمای سایز الزامی است.', 422);
        }
        if (empty($data['columns']) || !is_array($data['columns'])) {
            throw new \RuntimeException('حداقل یک ستون الزامی است.', 422);
        }
        if (empty($data['rows']) || !is_array($data['rows'])) {
            throw new \RuntimeException('حداقل یک ردیف داده الزامی است.', 422);
        }
        foreach ($data['rows'] as $row) {
            if (!is_array($row) || count($row) !== count($data['columns'])) {
                throw new \RuntimeException('تعداد مقادیر هر ردیف باید با تعداد ستون‌ها برابر باشد.', 422);
            }
        }
    }
}