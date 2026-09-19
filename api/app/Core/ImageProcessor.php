<?php

namespace App\Core;

use Intervention\Image\ImageManagerStatic as Image;

class ImageProcessor
{
    /**
     * @return array{large:string,medium:string,thumb:string,files:array<string,string>}
     */
    public static function generateVariants(string $sourcePath, string $destDir, string $basename, array $preset): array
    {
        if (!extension_loaded('imagick') || !class_exists('Imagick', false)) {
            throw new \RuntimeException(
                'افزونه Imagick فعال نیست. پس از composer install، ext-imagick را در php.ini فعال کنید.',
                500
            );
        }

        if (!is_file($sourcePath)) {
            throw new \RuntimeException('فایل تصویر معتبر نیست.', 422);
        }

        if (!is_dir($destDir) && !mkdir($destDir, 0755, true)) {
            throw new \RuntimeException('خطا در ایجاد پوشه آپلود.', 500);
        }

        Image::configure(['driver' => 'imagick']);

        $quality = ImageConfig::webpQuality();
        $files   = [];

        try {
            foreach (['large', 'medium', 'thumb'] as $variant) {
                $maxDim   = (int) ($preset[$variant] ?? 800);
                $filename = "{$basename}_{$variant}.webp";
                $path     = $destDir . $filename;

                $image = Image::make($sourcePath);
                $image->orientate();
                self::resizeToMax($image, $maxDim);
                self::stripMetadata($image);

                $encoded = $image->encode('webp', $quality);
                if (!$encoded->save($path)) {
                    throw new \RuntimeException('خطا در ذخیره تصویر بهینه‌شده.', 500);
                }

                $image->destroy();
                $files[$variant] = $filename;
            }
        } catch (\Throwable $e) {
            self::cleanupFiles($destDir, $files);
            if ($e instanceof \RuntimeException) {
                throw $e;
            }
            throw new \RuntimeException('خطا در پردازش تصویر: ' . $e->getMessage(), 500);
        }

        return [
            'large'  => $files['large'],
            'medium' => $files['medium'],
            'thumb'  => $files['thumb'],
            'files'  => $files,
        ];
    }

    private static function resizeToMax(\Intervention\Image\Image $image, int $maxDim): void
    {
        $width  = $image->width();
        $height = $image->height();

        if ($width <= 0 || $height <= 0) {
            throw new \RuntimeException('ابعاد تصویر معتبر نیست.', 422);
        }

        if ($width <= $maxDim && $height <= $maxDim) {
            return;
        }

        $image->resize($maxDim, $maxDim, function ($constraint) {
            $constraint->aspectRatio();
            $constraint->upsize();
        });
    }

    private static function stripMetadata(\Intervention\Image\Image $image): void
    {
        $core = $image->getCore();
        if (is_object($core) && method_exists($core, 'stripImage')) {
            $core->stripImage();
        }
    }

    /** @param array<string,string> $files */
    private static function cleanupFiles(string $dir, array $files): void
    {
        foreach ($files as $filename) {
            $path = $dir . $filename;
            if (is_file($path)) {
                @unlink($path);
            }
        }
    }
}
