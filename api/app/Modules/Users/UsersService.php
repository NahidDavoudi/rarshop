<?php
namespace App\Modules\Users;

use App\Core\Logger;

class UsersService
{
    public const MAX_ADDRESSES = 3;

    protected UsersModel $usersModel;
    protected UsersAddressModel $usersAddressModel;

    public function __construct()
    {
        $this->usersModel        = new UsersModel();
        $this->usersAddressModel = new UsersAddressModel();
    }

    // ─── Profile ────────────────────────────────────────────────

    public function getProfile(int $userId): array
    {
        $user = $this->usersModel->find($userId);
        if (!$user) {
            throw new \RuntimeException('کاربر یافت نشد.', 404);
        }
        unset($user['password']);
        $user['addresses'] = $this->usersAddressModel->getByUserId($userId);
        return $user;
    }

    public function updateProfile(int $userId, array $data): array
    {
        $user = $this->usersModel->find($userId);
        if (!$user) {
            throw new \RuntimeException('کاربر یافت نشد.', 404);
        }

        $allowed = ['name', 'phone'];
        $payload = array_intersect_key($data, array_flip($allowed));

        if (isset($payload['phone']) && $payload['phone'] !== $user['phone']) {
            if ($this->usersModel->phoneExists($payload['phone'], $userId)) {
                throw new \RuntimeException('این شماره قبلاً ثبت شده است.', 422);
            }
        }

        if (empty($payload)) {
            throw new \RuntimeException('هیچ فیلد معتبری برای بروزرسانی ارسال نشد.', 422);
        }

        $this->usersModel->update($userId, $payload);

        Logger::info('profile_updated', ['user_id' => $userId]);

        return $this->getProfile($userId);
    }

    public function changePassword(int $userId, string $currentPassword, string $newPassword): void
    {
        $user = $this->usersModel->find($userId);
        if (!$user) {
            throw new \RuntimeException('کاربر یافت نشد.', 404);
        }

        if (!password_verify($currentPassword, $user['password'])) {
            Logger::auth()->warning('wrong_current_password', ['user_id' => $userId]);
            throw new \RuntimeException('رمز عبور فعلی اشتباه است.', 422);
        }

        if (strlen($newPassword) < 8) {
            throw new \RuntimeException('رمز عبور جدید باید حداقل ۸ کاراکتر باشد.', 422);
        }

        $this->usersModel->update($userId, [
            'password' => password_hash($newPassword, PASSWORD_BCRYPT),
        ]);

        Logger::auth()->info('password_changed', ['user_id' => $userId]);
    }

    // ─── Addresses ──────────────────────────────────────────────

    public function getAddresses(int $userId): array
    {
        return $this->usersAddressModel->getByUserId($userId);
    }

    public function addAddress(int $userId, array $data): array
    {
        $count = $this->usersAddressModel->countByUserId($userId);
        if ($count >= self::MAX_ADDRESSES) {
            throw new \RuntimeException('حداکثر ۳ آدرس می‌توانید ذخیره کنید.', 422);
        }

        $province = trim($data['province'] ?? $data['state'] ?? '');
        $city = trim($data['city'] ?? '');
        $address = trim($data['address'] ?? '');

        if ($province === '' || $city === '' || $address === '') {
            throw new \RuntimeException('استان، شهر و آدرس الزامی است.', 422);
        }

        $isDefault = !empty($data['is_default']) ? 1 : ($count === 0 ? 1 : 0);
        if ($isDefault) {
            $this->usersAddressModel->clearDefaultForUser($userId);
        }

        $id = $this->usersAddressModel->create([
            'user_id'     => $userId,
            'title'       => trim($data['title']       ?? ''),
            'province'    => $province,
            'city'        => $city,
            'address'     => $address,
            'postal_code' => trim($data['postal_code'] ?? $data['zip_code'] ?? ''),
            'receiver'    => trim($data['receiver']    ?? ''),
            'phone'       => trim($data['phone']       ?? ''),
            'is_default'  => $isDefault,
        ]);

        return $this->usersAddressModel->find($id);
    }

    public function updateAddress(int $userId, int $addressId, array $data): array
    {
        if (!$this->usersAddressModel->belongsToUser($addressId, $userId)) {
            throw new \RuntimeException('آدرس یافت نشد.', 404);
        }

        $allowed = ['title', 'province', 'city', 'address', 'postal_code', 'receiver', 'phone', 'is_default'];
        $payload = array_filter(
            array_intersect_key($data, array_flip($allowed)),
            fn($v) => $v !== null && $v !== ''
        );

        if (isset($payload['province']) && $payload['province'] === '') {
            unset($payload['province']);
        }
        if (isset($payload['city']) && $payload['city'] === '') {
            unset($payload['city']);
        }
        if (isset($payload['address']) && $payload['address'] === '') {
            unset($payload['address']);
        }

        if (empty($payload)) {
            throw new \RuntimeException('هیچ فیلد معتبری ارسال نشد.', 422);
        }

        if (!empty($payload['is_default'])) {
            $this->usersAddressModel->clearDefaultForUser($userId, $addressId);
            $payload['is_default'] = 1;
        } elseif (array_key_exists('is_default', $payload)) {
            $payload['is_default'] = 0;
        }

        $this->usersAddressModel->update($addressId, $payload);

        return $this->usersAddressModel->find($addressId);
    }

    public function deleteAddress(int $userId, int $addressId): void
    {
        if (!$this->usersAddressModel->belongsToUser($addressId, $userId)) {
            throw new \RuntimeException('آدرس یافت نشد.', 404);
        }

        $this->usersAddressModel->deleteAddress($addressId , $userId);
    }

    // ─── Admin ──────────────────────────────────────────────────

    public function getAllUsers(): array
    {
        return array_map(function ($user) {
            unset($user['password']);
            return $user;
        }, $this->usersModel->getActiveUsers());
    }

    public function deactivateUser(int $userId): void
    {
        $user = $this->usersModel->find($userId);
        if (!$user) {
            throw new \RuntimeException('کاربر یافت نشد.', 404);
        }
        $this->usersModel->deactivate($userId);
        Logger::info('user_deactivated', ['user_id' => $userId]);
    }

    public function activateUser(int $userId): void
    {
        $user = $this->usersModel->find($userId);
        if (!$user) {
            throw new \RuntimeException('کاربر یافت نشد.', 404);
        }
        $this->usersModel->activate($userId);
        Logger::info('user_activated', ['user_id' => $userId]);
    }

    public function updateRole(int $userId, string $role): void
    {
        if (!in_array($role, ['admin', 'user'], true)) {
            throw new \RuntimeException('نقش نامعتبر است.', 422);
        }

        $user = $this->usersModel->find($userId);
        if (!$user) {
            throw new \RuntimeException('کاربر یافت نشد.', 404);
        }

        $this->usersModel->update($userId, ['role' => $role]);
        Logger::info('user_role_updated', ['user_id' => $userId, 'role' => $role]);
    }
}