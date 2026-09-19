<?php

namespace App\Modules\Settings;

use App\Core\ImageVariants;
use Intervention\Image\Exception\NotFoundException;

class SettingsService
{
    private const PAYMENT_METHODS = ['card_to_card', 'zarinpal', 'both'];
    private const SMS_PROVIDERS = ['kavenegar', 'melipayamak', 'smsir'];

    private const LEGAL_PAGE_KEYS = ['about', 'contact', 'terms', 'privacy', 'refund', 'faq'];

    private const UPLOAD_FIELD_MAP = [
        'logo'    => 'shop_logo',
        'hero'    => 'shop_hero_image',
        'poster'  => 'shop_poster',
        'favicon' => 'shop_favicon',
    ];

    private const ALLOWED_FIELDS = [
        'shop_name',
        'shop_slogan',
        'shop_description',
        'shop_logo',
        'shop_hero_image',
        'shop_poster',
        'shop_favicon',
        'bank_card',
        'bank_owner',
        'payment_method',
        'zarinpal_merchant_id',
        'contact_phone',
        'contact_email',
        'contact_address',
        'social_instagram',
        'social_telegram',
        'social_whatsapp',
        'shipping_standard_cost',
        'shipping_free_from',
        'min_order_amount',
        'product_shipping_text',
        'sms_enabled',
        'sms_provider',
        'sms_api_key',
        'meta_title',
        'meta_description',
        'notification_enabled',
        'notification_text',
        'notification_bg_color',
        'notification_text_color',
        'enamad_html',
    ];

    private const INT_FIELDS = [
        'shipping_standard_cost',
        'shipping_free_from',
        'min_order_amount',
        'sms_enabled',
        'notification_enabled',
    ];

    private const NULLABLE_TEXT_FIELDS = [
        'shop_description',
        'contact_address',
        'zarinpal_merchant_id',
        'sms_api_key',
        'enamad_html',
        'notification_text',
        'product_shipping_text',
    ];

    public function __construct(
        private SettingsModel $settingsModel,
    ) {}

    private const SENSITIVE_FIELDS = [
        'sms_api_key',
        'zarinpal_merchant_id',
    ];

    public function getSettings(): array
    {
        $settings = $this->settingsModel->getSingleton();
        if (!$settings) {
            throw new \RuntimeException('تنظیمات فروشگاه یافت نشد.', 404);
        }

        return $this->formatSettings($settings);
    }

    public function getPublicSettings(): array
    {
        $settings = $this->getSettings();

        foreach (self::SENSITIVE_FIELDS as $field) {
            unset($settings[$field]);
        }

        unset($settings['enamad_html']);

        return $settings;
    }

    public function updateSettings(array $data): array
    {
        $current = $this->getSettings();
        $payload = [];

        if (array_key_exists('legal_content', $data)) {
            $validated = $this->validateLegalContent($data['legal_content']);
            $payload['legal_content'] = json_encode(
                $validated,
                JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
            );
        }

        foreach (self::ALLOWED_FIELDS as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }

            if ($field === 'payment_method') {
                if (!in_array($data['payment_method'], self::PAYMENT_METHODS, true)) {
                    throw new \RuntimeException('روش پرداخت باید card_to_card، zarinpal یا both باشد.', 422);
                }
                $payload['payment_method'] = $data['payment_method'];
                continue;
            }

            if ($field === 'sms_provider') {
                $provider = trim((string) $data['sms_provider']);
                if ($provider !== '' && !in_array($provider, self::SMS_PROVIDERS, true)) {
                    throw new \RuntimeException('سرویس پیامک معتبر نیست.', 422);
                }
                $payload['sms_provider'] = $provider ?: 'kavenegar';
                continue;
            }

            if (in_array($field, self::INT_FIELDS, true)) {
                $payload[$field] = max(0, (int) $data[$field]);
                continue;
            }

            if (in_array($field, self::NULLABLE_TEXT_FIELDS, true)) {
                $value = $data[$field];
                if ($field === 'enamad_html') {
                    $trimmed = $value === null ? '' : trim((string) $value);
                    if ($trimmed === '') {
                        $payload[$field] = null;
                    } else {
                        $this->parseEnamadHtml($trimmed);
                        $payload[$field] = $trimmed;
                    }
                    continue;
                }
                $payload[$field] = $value === null || $value === ''
                    ? null
                    : trim((string) $value);
                continue;
            }

            if ($field === 'contact_email' && trim((string) $data[$field]) !== '') {
                $email = trim((string) $data[$field]);
                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    throw new \RuntimeException('ایمیل تماس معتبر نیست.', 422);
                }
                $payload[$field] = $email;
                continue;
            }

            if (in_array($field, ['notification_bg_color', 'notification_text_color'], true)) {
                $color = trim((string) $data[$field]);
                if ($color !== '' && !preg_match('/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/', $color)) {
                    throw new \RuntimeException('رنگ نوار اطلاع‌رسانی باید به فرمت hex باشد.', 422);
                }
                $payload[$field] = $color;
                continue;
            }

            $payload[$field] = trim((string) $data[$field]);
        }

        if (empty($payload)) {
            throw new \RuntimeException('هیچ فیلدی برای بروزرسانی ارسال نشد.', 422);
        }

        $paymentMethod = $payload['payment_method'] ?? $current['payment_method'];
        $merchantId = array_key_exists('zarinpal_merchant_id', $payload)
            ? $payload['zarinpal_merchant_id']
            : $current['zarinpal_merchant_id'];

        if (in_array($paymentMethod, ['zarinpal', 'both'], true) && empty($merchantId)) {
            throw new \RuntimeException('شناسه پذیرنده زرین‌پال الزامی است.', 422);
        }

        $smsEnabled = (int) ($payload['sms_enabled'] ?? $current['sms_enabled'] ?? 0);
        $smsApiKey = array_key_exists('sms_api_key', $payload)
            ? $payload['sms_api_key']
            : ($current['sms_api_key'] ?? null);

        if ($smsEnabled && empty($smsApiKey)) {
            throw new \RuntimeException('کلید API پیامک الزامی است.', 422);
        }

        $this->settingsModel->updateSingleton($payload);

        return $this->getSettings();
    }

    public function uploadImage(string $type, array $variants): array
    {
        $field = self::UPLOAD_FIELD_MAP[$type] ?? null;
        if (!$field) {
            throw new \RuntimeException('نوع تصویر معتبر نیست.', 422);
        }

        if (empty($variants['large'])) {
            throw new \RuntimeException('آدرس تصویر الزامی است.', 422);
        }

        $this->settingsModel->updateSingleton(
            ImageVariants::settingsFields($field, $variants)
        );

        return $this->getSettings();
    }

    public static function uploadFieldForType(string $type): ?string
    {
        return self::UPLOAD_FIELD_MAP[$type] ?? null;
    }

    public static function allowedUploadTypes(): array
    {
        return array_keys(self::UPLOAD_FIELD_MAP);
    }

    private function formatSettings(array $settings): array
    {
        if (isset($settings['legal_content']) && is_string($settings['legal_content'])) {
            $decoded = json_decode($settings['legal_content'], true);
            $settings['legal_content'] = is_array($decoded) ? $decoded : null;
        }

        $settings['enamad'] = $this->parseEnamadHtmlSafe($settings['enamad_html'] ?? null);

        return $settings;
    }

    private function parseEnamadHtmlSafe(?string $html): ?array
    {
        if ($html === null || trim($html) === '') {
            return null;
        }

        try {
            return $this->parseEnamadHtml(trim($html));
        } catch (\RuntimeException) {
            return null;
        }
    }

    private function parseEnamadHtml(string $html): array
    {
        if (!preg_match("/href=['\"]([^'\"]+)['\"]/i", $html, $hrefMatch)) {
            throw new \RuntimeException('کد نماد اعتماد معتبر نیست. لینک href یافت نشد.', 422);
        }

        $href = html_entity_decode($hrefMatch[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        if (!preg_match('#^https://trustseal\.enamad\.ir/#i', $href)) {
            throw new \RuntimeException('لینک نماد اعتماد باید از enamad.ir باشد.', 422);
        }

        if (!preg_match("/src=['\"]([^'\"]+)['\"]/i", $html, $srcMatch)) {
            throw new \RuntimeException('کد نماد اعتماد معتبر نیست. آدرس تصویر یافت نشد.', 422);
        }

        $logoUrl = html_entity_decode($srcMatch[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        if (!preg_match('#^https://trustseal\.enamad\.ir/#i', $logoUrl)) {
            throw new \RuntimeException('آدرس تصویر نماد اعتماد معتبر نیست.', 422);
        }

        $code = null;
        if (preg_match("/\bcode=['\"]([^'\"]+)['\"]/i", $html, $codeMatch)) {
            $code = html_entity_decode($codeMatch[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        return [
            'href'    => $href,
            'logoUrl' => $logoUrl,
            'code'    => $code,
        ];
    }

    private function validateLegalContent(mixed $content): array
    {
        if (!is_array($content)) {
            throw new \RuntimeException('فرمت محتوای صفحات معتبر نیست.', 422);
        }

        $validated = [];

        if (array_key_exists('lastUpdated', $content)) {
            $validated['lastUpdated'] = trim((string) $content['lastUpdated']);
        }

        foreach (self::LEGAL_PAGE_KEYS as $key) {
            if (!isset($content[$key]) || !is_array($content[$key])) {
                continue;
            }
            $validated[$key] = $this->validateLegalPage($key, $content[$key]);
        }

        if (empty($validated)) {
            throw new \RuntimeException('حداقل یک صفحه باید در محتوا وجود داشته باشد.', 422);
        }

        return $validated;
    }

    private function validateLegalPage(string $key, array $page): array
    {
        return match ($key) {
            'about'    => $this->validateAboutPage($page),
            'contact'  => $this->validateContactPage($page),
            'faq'      => $this->validateFaqPage($page),
            default    => $this->validateSectionPage($page),
        };
    }

    private function validateSectionPage(array $page): array
    {
        $result = [];

        foreach (['title', 'subtitle', 'meta'] as $field) {
            if (isset($page[$field])) {
                $result[$field] = trim((string) $page[$field]);
            }
        }

        if (!isset($page['sections']) || !is_array($page['sections'])) {
            throw new \RuntimeException('بخش‌های صفحه باید آرایه باشند.', 422);
        }

        $result['sections'] = [];
        foreach ($page['sections'] as $section) {
            if (!is_array($section) || empty(trim((string) ($section['title'] ?? '')))) {
                continue;
            }

            $entry = ['title' => trim((string) $section['title'])];

            if (!empty($section['content']) && is_array($section['content'])) {
                $entry['content'] = array_values(array_filter(
                    array_map(fn ($p) => trim((string) $p), $section['content']),
                    fn ($p) => $p !== ''
                ));
            }

            if (!empty($section['items']) && is_array($section['items'])) {
                $entry['items'] = array_values(array_filter(
                    array_map(fn ($i) => trim((string) $i), $section['items']),
                    fn ($i) => $i !== ''
                ));
            }

            if (empty($entry['content']) && empty($entry['items'])) {
                continue;
            }

            $result['sections'][] = $entry;
        }

        return $result;
    }

    private function validateFaqPage(array $page): array
    {
        $result = [];

        foreach (['title', 'subtitle', 'meta'] as $field) {
            if (isset($page[$field])) {
                $result[$field] = trim((string) $page[$field]);
            }
        }

        if (!isset($page['items']) || !is_array($page['items'])) {
            throw new \RuntimeException('سوالات متداول باید آرایه باشند.', 422);
        }

        $result['items'] = [];
        foreach ($page['items'] as $item) {
            if (!is_array($item)) {
                continue;
            }
            $question = trim((string) ($item['question'] ?? ''));
            $answer = trim((string) ($item['answer'] ?? ''));
            if ($question === '' || $answer === '') {
                continue;
            }
            $result['items'][] = ['question' => $question, 'answer' => $answer];
        }

        return $result;
    }

    private function validateContactPage(array $page): array
    {
        $result = [];

        foreach (['title', 'subtitle', 'meta', 'formUnavailable', 'mapPlaceholder'] as $field) {
            if (isset($page[$field])) {
                $result[$field] = trim((string) $page[$field]);
            }
        }

        foreach (['phone', 'email', 'address', 'hours'] as $field) {
            if (!isset($page[$field]) || !is_array($page[$field])) {
                continue;
            }
            $result[$field] = [
                'label' => trim((string) ($page[$field]['label'] ?? '')),
                'value' => trim((string) ($page[$field]['value'] ?? '')),
                'note'  => trim((string) ($page[$field]['note'] ?? '')),
            ];
        }

        return $result;
    }

    private function validateAboutPage(array $page): array
    {
        $result = [];

        foreach (['title', 'subtitle', 'meta', 'intro', 'mission', 'vision'] as $field) {
            if (isset($page[$field])) {
                $result[$field] = trim((string) $page[$field]);
            }
        }

        if (isset($page['sectionTitles']) && is_array($page['sectionTitles'])) {
            $result['sectionTitles'] = [];
            foreach ($page['sectionTitles'] as $k => $v) {
                $result['sectionTitles'][$k] = trim((string) $v);
            }
        }

        if (isset($page['whyChooseUs']) && is_array($page['whyChooseUs'])) {
            $result['whyChooseUs'] = [];
            foreach ($page['whyChooseUs'] as $item) {
                if (!is_array($item)) {
                    continue;
                }
                $title = trim((string) ($item['title'] ?? ''));
                if ($title === '') {
                    continue;
                }
                $result['whyChooseUs'][] = [
                    'icon'  => trim((string) ($item['icon'] ?? 'check')),
                    'title' => $title,
                    'desc'  => trim((string) ($item['desc'] ?? '')),
                ];
            }
        }

        if (isset($page['stats']) && is_array($page['stats'])) {
            $result['stats'] = [];
            foreach ($page['stats'] as $item) {
                if (!is_array($item)) {
                    continue;
                }
                $value = trim((string) ($item['value'] ?? ''));
                if ($value === '') {
                    continue;
                }
                $result['stats'][] = [
                    'value' => $value,
                    'label' => trim((string) ($item['label'] ?? '')),
                ];
            }
        }

        if (isset($page['team']) && is_array($page['team'])) {
            $result['team'] = [];
            foreach ($page['team'] as $item) {
                if (!is_array($item)) {
                    continue;
                }
                $name = trim((string) ($item['name'] ?? ''));
                if ($name === '') {
                    continue;
                }
                $result['team'][] = [
                    'name'   => $name,
                    'role'   => trim((string) ($item['role'] ?? '')),
                    'avatar' => trim((string) ($item['avatar'] ?? '')),
                ];
            }
        }

        return $result;
    }

    public function getShippingSettings(): array
    {
        $settings = $this->settingsModel->getSingleton();
        return [
            'standard_cost' => (float) ($settings['shipping_standard_cost'] ?? 0),
        ];
    }
}
