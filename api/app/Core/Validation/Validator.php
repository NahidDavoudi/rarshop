<?php
namespace App\Core\Validation;

use Respect\Validation\Validator as v;
use Respect\Validation\Exceptions\NestedValidationException;

class Validator
{
    private array $errors = [];
    private array $data;
    private array $rules;

    public function __construct(array $data, array $rules)
    {
        $this->data  = $data;
        $this->rules = $rules;
    }

    public function validate(): bool
    {
        foreach ($this->rules as $field => $rule) {
            $value = $this->data[$field] ?? null;

            try {
                $rule->setName($field)->assert($value);
            } catch (NestedValidationException $e) {
                $this->errors[$field] = $this->translate(
                    $e->getMessages()
                );
            }
        }

        return empty($this->errors);
    }

    public function errors(): array
    {
        return $this->errors;
    }

    // ─── ترجمه پیام‌های خطا به فارسی ────────────────────────────────────

    private function translate(array $messages): array
    {
        $map = [
            'notEmpty'    => 'این فیلد الزامی است',
            'notOptional' => 'این فیلد الزامی است',
            'email'       => 'ایمیل معتبر نیست',
            'length'      => 'طول مقدار وارد شده نامعتبر است',
            'min'         => 'مقدار وارد شده کمتر از حد مجاز است',
            'max'         => 'مقدار وارد شده بیشتر از حد مجاز است',
            'numeric'     => 'مقدار باید عددی باشد',
            'intVal'      => 'مقدار باید عدد صحیح باشد',
            'positive'    => 'مقدار باید مثبت باشد',
            'url'         => 'آدرس URL معتبر نیست',
            'date'        => 'تاریخ معتبر نیست',
            'in'          => 'مقدار انتخاب شده معتبر نیست',
            'regex'       => 'فرمت وارد شده نامعتبر است',
            'phone'       => 'شماره تلفن معتبر نیست',
        ];

        return array_map(function (string $message) use ($map): string {
            foreach ($map as $key => $translation) {
                if (stripos($message, $key) !== false) {
                    return $translation;
                }
            }
            return $message;
        }, array_values($messages));
    }
}