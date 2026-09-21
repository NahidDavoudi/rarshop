<?php

namespace App\Modules\Auth;

use App\Core\Env;
use App\Core\Sms\SmsService;
use App\Modules\Users\UsersModel;

class OtpService
{
    private const OTP_LENGTH = 5;
    private const OTP_TTL_SECONDS = 120;
    private const MAX_REQUESTS_PER_WINDOW = 5;
    private const REQUEST_WINDOW_MINUTES = 15;
    private const VALID_PURPOSES = ['login', 'register', 'reset_password'];

    public function __construct(
        private OtpModel $otpModel,
        private AuthService $authService,
        private SmsService $smsService,
        private UsersModel $usersModel,
    ) {}

    public function request(string $phone, string $purpose = 'login'): array
    {
        $phone   = $this->normalizePhone($phone);
        $purpose = $this->normalizePurpose($purpose);

        if ($purpose === 'register' && $this->usersModel->exists('phone', $phone)) {
            throw new \RuntimeException('این شماره قبلاً ثبت شده است.', 409);
        }

        if ($purpose === 'login' && !$this->usersModel->findBy('phone', $phone)) {
            throw new \RuntimeException('حسابی با این شماره یافت نشد. ابتدا ثبت‌نام کنید.', 404);
        }

        if ($this->otpModel->countRecentRequests($phone, self::REQUEST_WINDOW_MINUTES) >= self::MAX_REQUESTS_PER_WINDOW) {
            throw new \RuntimeException('تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.', 429);
        }

        $this->otpModel->invalidatePending($phone, $purpose);

        $code = $this->generateCode();
        $this->otpModel->createOtp($phone, $code, $purpose, self::OTP_TTL_SECONDS);

        $this->smsService->sendOtp($phone, $code);

        $response = [
            'phone'      => $this->maskPhone($phone),
            'purpose'    => $purpose,
            'expires_in' => self::OTP_TTL_SECONDS,
            'driver'     => $this->smsService->driverName(),
        ];

        if ($this->shouldExposeDebugCode()) {
            $response['debug_code'] = $code;
        }

        return $response;
    }

    public function verify(string $phone, string $code, string $purpose = 'login', ?string $name = null, ?string $password = null): array
    {
        $phone   = $this->normalizePhone($phone);
        $purpose = $this->normalizePurpose($purpose);
        $code    = trim($code);

        if (!preg_match('/^\d{' . self::OTP_LENGTH . '}$/', $code)) {
            throw new \RuntimeException('فرمت کد تایید نامعتبر است.', 422);
        }

        $otp = $this->otpModel->findActiveOtp($phone, $purpose);
        if (!$otp) {
            throw new \RuntimeException('کد تایید منقضی شده یا یافت نشد. دوباره درخواست دهید.', 422);
        }

        if ((int) $otp['attempts'] >= (int) $otp['max_attempts']) {
            throw new \RuntimeException('تعداد تلاش‌های شما تمام شده. کد جدید درخواست دهید.', 422);
        }

        if (!hash_equals($otp['code'], $code)) {
            $this->otpModel->incrementAttempts((int) $otp['id']);
            throw new \RuntimeException('کد تایید اشتباه است.', 422);
        }

        $this->otpModel->markVerified((int) $otp['id']);

        $user = $purpose === 'register'
            ? $this->createRegisteredUser($phone, $name, $password)
            : $this->resolveLoginUser($phone);

        return $this->authService->issueTokenPair($user);
    }

    private function createRegisteredUser(string $phone, ?string $name, ?string $password): array
    {
        if ($this->usersModel->exists('phone', $phone)) {
            throw new \RuntimeException('این شماره قبلاً ثبت شده است.', 409);
        }

        $name = $name ? trim($name) : '';
        if ($name === '') {
            throw new \RuntimeException('نام الزامی است.', 422);
        }

        if ($password === null || strlen($password) < 8) {
            throw new \RuntimeException('رمز عبور باید حداقل ۸ کاراکتر باشد.', 422);
        }

        $userId = $this->usersModel->create([
            'name'      => $name,
            'phone'     => $phone,
            'password'  => $password,
            'role'      => 'user',
            'is_active' => 1,
        ]);

        $user = $this->usersModel->find($userId);
        unset($user['password_hash']);

        return $user;
    }

    private function resolveLoginUser(string $phone): array
    {
        $user = $this->usersModel->findBy('phone', $phone);

        if (!$user) {
            throw new \RuntimeException('حسابی با این شماره یافت نشد.', 404);
        }

        if (!(int) $user['is_active']) {
            throw new \RuntimeException('حساب کاربری شما غیرفعال شده است.', 403);
        }

        unset($user['password_hash']);
        return $user;
    }

    private function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/\s+/', '', $phone);

        if (str_starts_with($phone, '+98')) {
            $phone = '0' . substr($phone, 3);
        } elseif (str_starts_with($phone, '98') && strlen($phone) === 12) {
            $phone = '0' . substr($phone, 2);
        }

        if (!preg_match('/^09\d{9}$/', $phone)) {
            throw new \RuntimeException('شماره موبایل باید به فرمت 09xxxxxxxxx باشد.', 422);
        }

        return $phone;
    }

    private function normalizePurpose(string $purpose): string
    {
        $purpose = strtolower(trim($purpose));

        if (!in_array($purpose, self::VALID_PURPOSES, true)) {
            throw new \RuntimeException('نوع درخواست OTP نامعتبر است.', 422);
        }

        return $purpose;
    }

    private function generateCode(): string
    {
        return str_pad((string) random_int(0, 99999), self::OTP_LENGTH, '0', STR_PAD_LEFT);
    }

    private function maskPhone(string $phone): string
    {
        return substr($phone, 0, 4) . '***' . substr($phone, -4);
    }

    private function shouldExposeDebugCode(): bool
    {
        return Env::get('APP_ENV', 'production') === 'development';
    }
}
