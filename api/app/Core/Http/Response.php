<?php
namespace App\Core\Http;

class Response {

    public static function json(array $data, int $code = 200): never {
        SecurityHeaders::apply();
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function success(mixed $data = null, string $message = 'عملیات با موفقیت انجام شد', int $code = 200): never {
        self::json([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], $code);
    }

    public static function created(mixed $data = null, string $message = 'با موفقیت ایجاد شد'): never {
        self::success($data, $message, 201);
    }

    public static function error(string $message, int $code = 400, mixed $errors = null): never {
        $response = [
            'success' => false,
            'message' => $message
        ];

        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        self::json($response, $code);
    }

    public static function notFound(string $message = 'موردی یافت نشد'): never {
        self::error($message, 404);
    }

    public static function unauthorized(string $message = 'دسترسی غیرمجاز'): never {
        self::error($message, 401);
    }

    public static function forbidden(string $message = 'شما اجازه دسترسی ندارید'): never {
        self::error($message, 403);
    }

    public static function tooManyRequests(string $message = 'تعداد درخواست‌ها بیش از حد مجاز است'): never {
        self::error($message, 429);
    }

    public static function validation(array $errors, string $message = 'خطای اعتبارسنجی'): never {
        self::error($message, 422, $errors);
    }

    public static function noContent(string $message = 'با موفقیت حذف شد'): never {
        http_response_code(204);
        exit;
    }
}