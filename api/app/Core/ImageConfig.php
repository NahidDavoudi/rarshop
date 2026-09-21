<?php

namespace App\Core;

class ImageConfig
{
    public const INPUT_MIMES = ['image/jpeg', 'image/png' , 'image/webp'];

    public static function maxUploadBytes(): int
    {
        $mb = (int) Env::get('IMAGE_MAX_UPLOAD_MB', 5);
        return max(1, $mb) * 1024 * 1024;
    }

    public static function webpQuality(): int
    {
        return max(1, min(100, (int) Env::get('IMAGE_WEBP_QUALITY', 82)));
    }

    /** @return array{large:int,medium:int,thumb:int} */
    public static function presetFor(string $folder, ?string $type = null): array
    {
        $presets = [
            'products'      => ['large' => 1600, 'medium' => 800, 'thumb' => 300],
            'categories'      => ['large' => 1200, 'medium' => 600, 'thumb' => 300],
            'promo-banners'   => ['large' => 1920, 'medium' => 1200, 'thumb' => 400],
            'hero-slides'     => ['large' => 1920, 'medium' => 1200, 'thumb' => 400],
            'settings'        => [
                'logo'    => ['large' => 256, 'medium' => 128, 'thumb' => 64],
                'favicon' => ['large' => 128, 'medium' => 64, 'thumb' => 32],
                'hero'    => ['large' => 1920, 'medium' => 1200, 'thumb' => 400],
                'poster'  => ['large' => 1920, 'medium' => 1200, 'thumb' => 400],
                'default' => ['large' => 1600, 'medium' => 800, 'thumb' => 300],
            ],
        ];

        if ($folder === 'settings') {
            $settingsPresets = $presets['settings'];
            if ($type && isset($settingsPresets[$type])) {
                return $settingsPresets[$type];
            }
            return $settingsPresets['default'];
        }

        return $presets[$folder] ?? ['large' => 1600, 'medium' => 800, 'thumb' => 300];
    }
}
