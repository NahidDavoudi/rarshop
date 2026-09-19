<?php

namespace App\Modules\Settings;

use App\Core\Controller;
use App\Core\Http\Request;
use App\Core\UploadHelper;

class SettingsController extends Controller
{
    private SettingsService $service;

    public function __construct()
    {
        $this->service = new SettingsService(new SettingsModel());
    }

    // GET /api/v1/settings
    public function index(): void
    {
        try {
            $this->success($this->service->getPublicSettings());
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 404);
        }
    }

    // GET /api/v1/admin/settings
    public function show(): void
    {
        try {
            $this->success($this->service->getSettings());
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 404);
        }
    }

    // PATCH /api/v1/admin/settings
    public function update(Request $request): void
    {
        $data = $request->only([
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
            'legal_content',
            'enamad_html',
        ]);

        try {
            $settings = $this->service->updateSettings($data);
            $this->success($settings, 'تنظیمات بروزرسانی شد');
            } catch (\RuntimeException $e) {
                $code = $e->getCode();
                $this->error($e->getMessage(), is_int($code) ? $code : 400);
            }
    }

    // POST /api/v1/admin/settings/upload/{type}
    public function uploadImage(Request $request, string $type): void
    {
        if (!in_array($type, SettingsService::allowedUploadTypes(), true)) {
            $this->error('نوع تصویر معتبر نیست. (logo, hero, poster, favicon)', 422);
        }

        $file = $_FILES['image'] ?? null;

        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->error('فایل تصویر ارسال نشده یا خطا داشته', 422);
        }

        try {
            $variants = UploadHelper::storeOptimizedImage($file, 'settings', $type);
            $settings = $this->service->uploadImage($type, $variants);
            $field = SettingsService::uploadFieldForType($type);

            $this->success([
                'urls'     => $variants,
                'url'      => $variants['large'],
                'type'     => $type,
                'field'    => $field,
                'settings' => $settings,
            ], 'تصویر آپلود شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    public function getShippingCost(Request $request)
    {
        $shippingSettings = $this->service->getShippingSettings(); 
        $this->success(['cost'=> $shippingSettings['standard_cost']], "success", 200);
    }
}
