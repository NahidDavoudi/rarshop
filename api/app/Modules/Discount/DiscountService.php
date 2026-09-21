<?php

namespace App\Modules\Discount;

class DiscountService
{
    public function __construct(
        private DiscountModel $discountModel,
    ) {}

    // ─── Public ──────────────────────────────────────────────────

    public function validate(string $code, int $cartTotal): array
    {
        if (empty(trim($code))) {
            throw new \RuntimeException('کد تخفیف وارد نشده.', 422);
        }

        $discount = $this->discountModel->findValidCode($code);
        if (!$discount) {
            throw new \RuntimeException('کد تخفیف معتبر نیست یا منقضی شده است.', 422);
        }

        $discountAmount = $this->discountModel->calculateDiscount($discount, $cartTotal);

        return [
            'discount'        => $discount,
            'discount_amount' => $discountAmount,
            'final_total'     => max(0, $cartTotal - $discountAmount),
        ];
    }

    // ─── Admin CRUD ───────────────────────────────────────────────

    public function getAll(): array
    {
        return $this->discountModel->all(['created_at' => 'DESC']);
    }

    public function getActive(): array
    {
        return $this->discountModel->getActive();
    }

    public function getById(int $id): array
    {
        $discount = $this->discountModel->find($id);
        if (!$discount) {
            throw new \RuntimeException('کد تخفیف یافت نشد.', 404);
        }
        return $discount;
    }

    public function create(array $data): array
    {
        $this->validateDiscountData($data);

        if ($this->discountModel->findByCode($data['code'])) {
            throw new \RuntimeException('این کد قبلاً ثبت شده است.', 422);
        }

        $id = $this->discountModel->create([
            'code'       => strtoupper(trim($data['code'])),
            'type'       => $data['type'],
            'value'      => (float) $data['value'],
            'valid_from' => $data['valid_from'],
            'valid_to'   => $data['valid_to'],
            'is_active'  => (int) ($data['is_active'] ?? 1),
        ]);

        return $this->getById($id);
    }

    public function update(int $id, array $data): array
    {
        $discount = $this->discountModel->find($id);
        if (!$discount) {
            throw new \RuntimeException('کد تخفیف یافت نشد.', 404);
        }

        $payload = [];

        if (isset($data['code'])) {
            $newCode = strtoupper(trim($data['code']));
            $existing = $this->discountModel->findByCode($newCode);
            if ($existing && $existing['id'] !== $id) {
                throw new \RuntimeException('این کد قبلاً توسط تخفیف دیگری استفاده شده.', 422);
            }
            $payload['code'] = $newCode;
        }
        if (isset($data['type'])) {
            if (!in_array($data['type'], ['percent', 'fixed'])) {
                throw new \RuntimeException('نوع تخفیف باید percent یا fixed باشد.', 422);
            }
            $payload['type'] = $data['type'];
        }
        if (isset($data['value'])) {
            $payload['value'] = (float) $data['value'];
        }
        if (isset($data['valid_from'])) {
            $payload['valid_from'] = $data['valid_from'];
        }
        if (isset($data['valid_to'])) {
            $payload['valid_to'] = $data['valid_to'];
        }
        if (isset($data['is_active'])) {
            $payload['is_active'] = (int) $data['is_active'];
        }

        if (empty($payload)) {
            throw new \RuntimeException('هیچ فیلدی برای بروزرسانی ارسال نشد.', 422);
        }

        $this->discountModel->update($id, $payload);

        return $this->getById($id);
    }

    public function deactivate(int $id): void
    {
        $this->discountModel->find($id) or throw new \RuntimeException('کد تخفیف یافت نشد.', 404);
        $this->discountModel->deactivate($id);
    }

    public function delete(int $id): void
    {
        $this->discountModel->find($id) or throw new \RuntimeException('کد تخفیف یافت نشد.', 404);
        $this->discountModel->delete($id);
    }

    // ─── Helpers ─────────────────────────────────────────────────

    private function validateDiscountData(array $data): void
    {
        if (empty($data['code'])) {
            throw new \RuntimeException('کد تخفیف الزامی است.', 422);
        }
        if (!in_array($data['type'] ?? '', ['percent', 'fixed'])) {
            throw new \RuntimeException('نوع تخفیف باید percent یا fixed باشد.', 422);
        }
        if (!isset($data['value']) || (float) $data['value'] <= 0) {
            throw new \RuntimeException('مقدار تخفیف باید بیشتر از صفر باشد.', 422);
        }
        if ($data['type'] === 'percent' && (float) $data['value'] > 100) {
            throw new \RuntimeException('درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد.', 422);
        }
        if (empty($data['valid_from']) || empty($data['valid_to'])) {
            throw new \RuntimeException('تاریخ شروع و پایان الزامی است.', 422);
        }
        if (strtotime($data['valid_from']) >= strtotime($data['valid_to'])) {
            throw new \RuntimeException('تاریخ پایان باید بعد از تاریخ شروع باشد.', 422);
        }
    }
}