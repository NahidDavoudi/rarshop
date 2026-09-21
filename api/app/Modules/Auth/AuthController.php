<?php

namespace App\Modules\Auth;

use App\Core\Controller;
use App\Core\Http\Request;
use App\Core\Auth\AuthCookie;
use App\Core\Sms\SmsService;
use App\Modules\Users\UsersModel;

class AuthController extends Controller
{
    private LoginRateLimiter $loginRateLimiter;

    public function __construct()
    {
        $this->service = new AuthService();
        $this->otpService = new OtpService(
            new OtpModel(),
            $this->service,
            new SmsService(),
            new UsersModel(),
        );
        $this->loginRateLimiter = new LoginRateLimiter();
    }

    private AuthService $service;
    private OtpService $otpService;

    public function otpRequest(Request $request): void
    {
        $phone   = $request->input('phone');
        $purpose = $request->input('purpose', 'login');

        if (!$phone) {
            $this->error('شماره موبایل الزامی است', 422);
        }

        try {
            if ($this->loginRateLimiter->tooManyAttempts('otp-request', (string) $phone)) {
                $this->tooManyRequests('تعداد درخواست‌های OTP بیش از حد مجاز است. ۱۵ دقیقه دیگر تلاش کنید.');
            }

            $result = $this->otpService->request($phone, $purpose);
            $this->success($this->publicAuthPayload($result), 'کد تایید ارسال شد');
        } catch (\RuntimeException $e) {
            $code = $e->getCode() ?: 400;
            if ($code === 429) {
                $this->tooManyRequests($e->getMessage());
            }
            $this->error($e->getMessage(), $code);
        }
    }

    public function otpVerify(Request $request): void
    {
        $phone    = $request->input('phone');
        $code     = $request->input('code');
        $purpose  = $request->input('purpose', 'login');
        $name     = $request->input('name');
        $password = $request->input('password');

        if (!$phone || !$code) {
            $this->error('شماره موبایل و کد تایید الزامی است', 422);
        }

        try {
            if ($this->loginRateLimiter->tooManyAttempts('otp-verify', (string) $phone)) {
                $this->tooManyRequests('تعداد تلاش‌های OTP بیش از حد مجاز است. ۱۵ دقیقه دیگر تلاش کنید.');
            }

            $result = $this->otpService->verify($phone, $code, $purpose, $name, $password);
            $this->loginRateLimiter->clear('otp-verify', (string) $phone);
            $this->success($this->publicAuthPayload($result), 'ورود موفق');
        } catch (\RuntimeException $e) {
            $this->loginRateLimiter->hit('otp-verify', (string) $phone);
            $this->error($e->getMessage(), $e->getCode() ?: 422);
        }
    }

    public function register(Request $request): void
    {
        $data = $request->only(['name', 'phone', 'password']);

        try {
            $result = $this->service->register($data);
            $this->created($this->publicAuthPayload($result), 'ثبت‌نام با موفقیت انجام شد');
        } catch (\Exception $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    public function login(Request $request): void
    {
        $phone    = $request->input('phone');
        $password = $request->input('password');

        if (!$phone || !$password) {
            $this->error('شماره تلفن و رمز عبور الزامی است', 422);
        }

        try {
            if ($this->loginRateLimiter->tooManyAttempts('login', (string) $phone)) {
                $this->tooManyRequests('تعداد تلاش‌های ورود بیش از حد مجاز است. ۱۵ دقیقه دیگر تلاش کنید.');
            }

            $result = $this->service->login((string) $phone, (string) $password);
            $this->loginRateLimiter->clear('login', (string) $phone);
            $this->success($this->publicAuthPayload($result), 'ورود موفق');
        } catch (\PDOException $e) {
            $this->error('خطا در سرویس ورود. لطفاً با پشتیبانی تماس بگیرید.', 503);
        } catch (\Exception $e) {
            try {
                $this->loginRateLimiter->hit('login', (string) $phone);
            } catch (\PDOException) {
                /* rate limit storage unavailable */
            }
            $this->error($e->getMessage(), $e->getCode() ?: 401);
        }
    }

    public function adminLogin(Request $request): void
    {
        $phone    = $request->input('phone');
        $password = $request->input('password');

        if (!$phone || !$password) {
            $this->error('شماره تلفن و رمز عبور الزامی است', 422);
        }

        if ($this->loginRateLimiter->tooManyAttempts('admin-login', (string) $phone)) {
            $this->tooManyRequests('تعداد تلاش‌های ورود بیش از حد مجاز است. ۱۵ دقیقه دیگر تلاش کنید.');
        }

        try {
            $result = $this->service->adminLogin((string) $phone, (string) $password);
            $this->loginRateLimiter->clear('admin-login', (string) $phone);
            $this->success($this->publicAuthPayload($result), 'ورود ادمین موفق');
        } catch (\Exception $e) {
            $this->loginRateLimiter->hit('admin-login', (string) $phone);
            $this->error($e->getMessage(), $e->getCode() ?: 401);
        }
    }

    public function logout(Request $request): void
    {
        $refreshToken = $request->input('refresh_token') ?: AuthCookie::getRefreshToken();
        $accessToken  = AuthCookie::getAccessToken();

        try {
            $this->service->logout($refreshToken, $accessToken);
            $this->success(null, 'خروج موفق');
        } catch (\Exception $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    public function me(Request $request): void
    {
        try {
            $user = $this->service->me($request->userId());
            $this->success($user);
        } catch (\Exception $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    public function refresh(Request $request): void
    {
        try {
            $refresh = $request->input('refresh_token') ?: AuthCookie::getRefreshToken();
            $result = $this->service->refreshToken($refresh);
            $this->success($this->publicAuthPayload($result), 'توکن تمدید شد');
        } catch (\Exception $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 401);
        }
    }

    /** Strip tokens from JSON body — they live in HttpOnly cookies. */
    private function publicAuthPayload(array $result): array
    {
        unset($result['token'], $result['access_token'], $result['refresh_token']);
        return $result;
    }
}
