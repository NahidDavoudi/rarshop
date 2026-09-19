<?php

namespace App\Modules\Users;

use App\Core\Controller;
use App\Core\Http\Request;
use App\Core\Logger;

class UsersController extends Controller
{
    private UsersService $service;

    public function __construct()
    {
        $this->service = new UsersService();
    }

    // ─── Profile ─────────────────────────────────────────────────

    // GET /user/profile
    public function profile(): void
    {
        try {
            $this->success($this->service->getProfile($this->userId()));
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /user/update
    public function update(Request $request): void
    {
        $data = $request->only(['name', 'phone']);

        try {
            $user = $this->service->updateProfile($this->userId(), $data);
            $this->success($user, 'پروفایل بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /users/me/password
    public function changePassword(Request $request): void
    {
        $current = $request->input('current_password');
        $new     = $request->input('new_password');

        if (!$current || !$new) {
            $this->error('رمز عبور فعلی و جدید الزامی است', 422);
        }

        try {
            $this->service->changePassword($this->userId(), $current, $new);
            $this->success(null, 'رمز عبور تغییر کرد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ─── Addresses ────────────────────────────────────────────────

    // GET /user/addresses
    public function addresses(): void
    {
        $this->success($this->service->getAddresses($this->userId()));
    }

    // POST /users/me/addresses
    public function addAddress(Request $request): void
    {
        $data = $this->normalizeAddressInput($request->only([
            'title', 'province', 'city', 'address', 'postal_code',
            'receiver', 'phone', 'is_default', 'state', 'zip_code',
        ]));

        try {
            $address = $this->service->addAddress($this->userId(), $data);
            $this->created($address, 'آدرس اضافه شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PATCH /users/me/addresses/{id}
    // UsersController.php
public function updateAddress(Request $request, int $id): void  // changed $addressId to $id
{
    $addressId = $id;  // برای  بیشتر
    
    Logger::debug('updateAddress_called', [
        'address_id' => $addressId,
        'user_id' => $this->userId()
    ]);
    
    $data = $this->normalizeAddressInput($request->only([
        'title', 'province', 'city', 'address', 'postal_code',
        'receiver', 'phone', 'is_default', 'state', 'zip_code',
    ]));

    try {
        $address = $this->service->updateAddress($this->userId(), $addressId, $data);
        $this->success($address, 'آدرس بروزرسانی شد');
    } catch (\RuntimeException $e) {
        $this->error($e->getMessage(), $e->getCode() ?: 400);
    }
}

public function deleteAddress(int $id): void  // changed $addressId to $id
{
    $addressId = $id;
    
    Logger::debug('deleteAddress_called', [
        'address_id' => $addressId,
        'user_id' => $this->userId()
    ]);
    
    try {
        $this->service->deleteAddress($this->userId(), $addressId);
        $this->noContent();
    } catch (\RuntimeException $e) {
        $this->error($e->getMessage(), $e->getCode() ?: 400);
    }
}

    // ─── Admin ────────────────────────────────────────────────────

    // GET /user/index  (ادمین)
    public function index(): void
    {
        $this->success($this->service->getAllUsers());
    }

    // PUT /user/deactivate/123  (ادمین)
    public function deactivate(int $userId): void
    {
        try {
            $this->service->deactivateUser($userId);
            $this->success(null, 'کاربر غیرفعال شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /user/activate/123  (ادمین)
    public function activate(int $userId): void
    {
        try {
            $this->service->activateUser($userId);
            $this->success(null, 'کاربر فعال شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    private function normalizeAddressInput(array $data): array
    {
        if (empty($data['province']) && !empty($data['state'])) {
            $data['province'] = $data['state'];
        }
        if (empty($data['postal_code']) && !empty($data['zip_code'])) {
            $data['postal_code'] = $data['zip_code'];
        }

        unset($data['state'], $data['zip_code']);

        return $data;
    }

    // PATCH /admin/users/{id}/role  (ادمین)
    public function updateRole(Request $request, int $userId): void
    {
        $role = $request->input('role');

        if (!$role) {
            $this->error('نقش الزامی است', 422);
        }

        try {
            $this->service->updateRole($userId, $role);
            $this->success(null, 'نقش کاربر تغییر کرد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}
