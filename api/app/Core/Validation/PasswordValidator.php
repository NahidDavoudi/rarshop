<?php
namespace App\Core\Validation;

class PasswordValidator
{
    /**
     * @return array لیست خطاها (خالی یعنی معتبر)
     */
    public function validate(string $password): array
    {
        $errors = [];

        if (mb_strlen($password) < 8) {
            $errors[] = 'رمز عبور باید حداقل 8  کاراکتر باشد.';
        }
        if (!preg_match('/[a-z]/', $password)) {
            $errors[] = 'رمز عبور باید حداقل یک حرف کوچک داشته باشد.';
        }
        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'رمز عبور باید حداقل یک حرف بزرگ داشته باشد.';
        }
        if (!preg_match('/\d/', $password)) {
            $errors[] = 'رمز عبور باید حداقل یک عدد داشته باشد.';
        }
        if (!preg_match('/[^a-zA-Z0-9]/', $password)) {
            $errors[] = 'رمز عبور باید حداقل یک کاراکتر خاص داشته باشد.';
        }

        // (اختیاری در آینده: بررسی pwned)

        return $errors;
    }
}