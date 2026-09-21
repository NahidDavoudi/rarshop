<?php

namespace App\Modules\Auth;

use App\Core\Auth\Auth as JwtAuth;
use App\Core\Auth\AuthCookie;
use App\Modules\Users\UsersModel;

class AuthService
{
    private UsersModel $userModel;

    public function __construct()
    {
        $this->userModel = new UsersModel();
    }

    public function issueTokenPair(array $user): array
    {
        $role = $user['role'] ?? 'user';
        $payload = ['user_id' => (int) $user['id'], 'role' => (string) $role];

        $accessTtl = $role === 'admin' ? 3600 : 900;
        $refreshTtl = 2592000;

        $accessToken = JwtAuth::generateToken($payload, $accessTtl);
        $refresh = JwtAuth::generateRefreshToken((int) $user['id'], $payload);

        AuthCookie::setPair($accessToken, $accessTtl, $refresh['token'], $refreshTtl);

        return [
            'token'         => $accessToken,
            'access_token'  => $accessToken,
            'refresh_token' => $refresh['token'],
            'token_type'    => 'Bearer',
            'expires_in'    => $accessTtl,
            'user'          => $user,
        ];
    }

    public function logout(?string $refreshToken, ?string $accessToken = null): void
    {
        $refresh = $refreshToken ?: AuthCookie::getRefreshToken();
        $access  = $accessToken ?: AuthCookie::getAccessToken();

        if ($refresh) {
            JwtAuth::revokeRefreshToken($refresh);
        }
        if ($access) {
            JwtAuth::revokeAccessToken($access);
        }
        AuthCookie::clearAll();
    }

    public function register(array $data): array
    {
        if (empty($data['name']) || empty($data['phone']) || empty($data['password'])) {
            throw new \Exception('نام، تلفن و رمز عبور الزامی است.');
        }

        $this->validatePhone($data['phone']);
        $this->validatePassword($data['password']);

        if ($this->userModel->exists('phone', $data['phone'])) {
            throw new \Exception('شماره تلفن قبلاً ثبت شده است.', 409);
        }

        $userId = $this->userModel->create([
            'name'          => trim((string) $data['name']),
            'phone'         => (string) $data['phone'],
            'password'      => $data['password'],
            'role'          => 'user',
            'is_active'     => 1,
        ]);

        $user = $this->userModel->find($userId);
        unset($user['password_hash']);

        return $this->issueTokenPair($user);
    }

    public function login(string $phone, string $password): array
    {
        $this->validatePhone($phone);

        $user = $this->userModel->findBy('phone', $phone);

        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new \Exception('شماره تلفن یا رمز عبور اشتباه است.', 401);
        }

        if (!$user['is_active']) {
            throw new \Exception('حساب کاربری شما غیرفعال شده است.', 403);
        }

        unset($user['password_hash']);

        return $this->issueTokenPair($user);
    }

    public function adminLogin(string $phone, string $password): array
    {
        $this->validatePhone($phone);

        $user = $this->userModel->findBy('phone', $phone);

        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new \Exception('اطلاعات ورود نادرست است.', 401);
        }

        if ($user['role'] !== 'admin') {
            throw new \Exception('دسترسی مجاز نیست.', 403);
        }

        if (!$user['is_active']) {
            throw new \Exception('حساب کاربری غیرفعال است.', 403);
        }

        unset($user['password_hash']);

        return $this->issueTokenPair($user);
    }

    public function me(int $userId): array
    {
        $user = $this->userModel->find($userId);

        if (!$user) {
            throw new \Exception('کاربر یافت نشد.', 404);
        }

        if (!$user['is_active']) {
            throw new \Exception('حساب کاربری غیرفعال است.', 403);
        }

        unset($user['password_hash']);
        return $user;
    }

    public function refreshToken(?string $refreshToken = null): array
    {
        $token = $refreshToken ?: AuthCookie::getRefreshToken();
        if (!$token) {
            throw new \Exception('توکن رفرش یافت نشد.', 401);
        }

        $result = JwtAuth::rotateRefreshToken($token);
        if (!$result) {
            AuthCookie::clearAll();
            throw new \Exception('توکن رفرش نامعتبر است.', 401);
        }

        AuthCookie::setPair(
            $result['token'],
            (int) $result['expires_in'],
            $result['refresh_token'],
            2592000
        );

        $decoded = JwtAuth::verifyToken($result['token']);
        $userId = (int) ($decoded->data->user_id ?? 0);
        $user = $this->userModel->find($userId);
        if (!$user || !$user['is_active']) {
            throw new \Exception('کاربر یافت نشد یا غیرفعال است.', 401);
        }
        unset($user['password_hash']);

        return [
            'token'         => $result['token'],
            'access_token'  => $result['token'],
            'refresh_token' => $result['refresh_token'],
            'token_type'    => 'Bearer',
            'expires_in'    => $result['expires_in'],
            'user'          => $user,
        ];
    }

    protected function validatePhone(string $phone): void
    {
        if (!preg_match('/^(?:\+98|0)?9\d{9}$/', $phone)) {
            throw new \Exception('شماره تلفن وارد شده نامعتبر است.');
        }
    }

    protected function validatePassword(string $password): void
    {
        if (strlen($password) < 8) {
            throw new \Exception('رمز عبور باید حداقل ۸ کاراکتر باشد.');
        }
    }
}
