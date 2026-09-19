<?php

namespace App\Core;

use App\Core\Env;

class UploadHelper
{
    /** @return string Public URL path (e.g. /universal/uploads/products/img_xxx.jpg) */
    public static function storeImage(array $file, string $folder): string
    {
        return self::store($file, $folder, [
            'allowed'  => ['image/jpeg', 'image/png', 'image/webp'],
            'max_size' => 3 * 1024 * 1024,
            'prefix'   => 'img_',
        ])['url'];
    }

    /**
     * Validate, resize, convert to WebP, and store large/medium/thumb variants.
     *
     * @return array{large:string,medium:string,thumb:string,files:array<string,string>}
     */
    public static function storeOptimizedImage(array $file, string $folder, ?string $presetType = null): array
    {
        self::assertValidUpload($file);

        $detectedMime = self::detectMimeType($file['tmp_name']);
        if (!$detectedMime || !in_array($detectedMime, ImageConfig::INPUT_MIMES, true)) {
            throw new \RuntimeException('فقط فایل‌های JPG و PNG مجاز هستند.', 422);
        }

        $maxSize = ImageConfig::maxUploadBytes();
        if ((int) $file['size'] > $maxSize) {
            $mb = (int) ($maxSize / (1024 * 1024));
            throw new \RuntimeException("حجم فایل بیشتر از {$mb} مگابایت است.", 422);
        }

        $basename = 'img_' . bin2hex(random_bytes(16));
        $dir      = self::uploadDir($folder);
        $preset   = ImageConfig::presetFor($folder, $presetType);

        $generated = ImageProcessor::generateVariants($file['tmp_name'], $dir, $basename, $preset);

        return [
            'large'  => self::publicUrl($folder, $generated['files']['large']),
            'medium' => self::publicUrl($folder, $generated['files']['medium']),
            'thumb'  => self::publicUrl($folder, $generated['files']['thumb']),
            'files'  => [
                'large'  => $generated['files']['large'],
                'medium' => $generated['files']['medium'],
                'thumb'  => $generated['files']['thumb'],
            ],
        ];
    }

    /** @return array{file_name: string, file_path: string} */
    public static function storeReceipt(array $file): array
    {
        $result = self::store($file, 'receipts', [
            'allowed'  => ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
            'max_size' => 5 * 1024 * 1024,
            'prefix'   => 'receipt_',
        ]);

        return [
            'file_name' => $result['filename'],
            'file_path' => $result['url'],
        ];
    }

    /** @return array{filename: string, url: string, path: string} */
    private static function store(array $file, string $folder, array $options): array
    {
        self::assertValidUpload($file);

        $allowed = $options['allowed'];
        $maxSize = $options['max_size'];
        $prefix  = $options['prefix'];

        $detectedMime = self::detectMimeType($file['tmp_name']);
        if (!$detectedMime || !in_array($detectedMime, $allowed, true)) {
            throw new \RuntimeException('نوع واقعی فایل مجاز نیست.', 422);
        }

        if ((int) $file['size'] > $maxSize) {
            $mb = (int) ($maxSize / (1024 * 1024));
            throw new \RuntimeException("حجم فایل بیشتر از {$mb} مگابایت است.", 422);
        }

        $ext = self::extensionForMime($detectedMime);
        if (!$ext) {
            throw new \RuntimeException('پسوند فایل با نوع آن سازگار نیست.', 422);
        }

        $filename = $prefix . bin2hex(random_bytes(16)) . '.' . $ext;
        $dir      = self::uploadDir($folder);

        if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
            throw new \RuntimeException('خطا در ایجاد پوشه آپلود.', 500);
        }

        if (!move_uploaded_file($file['tmp_name'], $dir . $filename)) {
            throw new \RuntimeException('خطا در آپلود فایل.', 500);
        }

        return [
            'filename' => $filename,
            'url'      => self::publicUrl($folder, $filename),
            'path'     => $dir . $filename,
        ];
    }

    private static function assertValidUpload(array $file): void
    {
        if (empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            throw new \RuntimeException('فایل آپلود معتبر نیست.', 422);
        }
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new \RuntimeException('خطا در آپلود فایل.', 422);
        }
    }

    private static function uploadDir(string $folder): string
    {
        $configured = Env::get('UPLOAD_DIR');
        if ($configured) {
            $root = rtrim($configured, '/\\');
        } else {
            $root = dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'uploads';
        }

        return $root . DIRECTORY_SEPARATOR . $folder . DIRECTORY_SEPARATOR;
    }

    private static function publicUrl(string $folder, string $filename): string
    {
        $publicBase = rtrim((string) Env::get('UPLOAD_PUBLIC_BASE', ''), '/');
        if ($publicBase !== '') {
            return "{$publicBase}/{$folder}/{$filename}";
        }

        $base = rtrim(Env::get('APP_BASE_PATH', ''), '/');
        $path = "/uploads/{$folder}/{$filename}";

        return $base ? "{$base}{$path}" : $path;
    }

    private static function detectMimeType(string $path): ?string
    {
        if (!is_file($path)) {
            return null;
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if (!$finfo) {
            return null;
        }

        $mime = finfo_file($finfo, $path);
        finfo_close($finfo);

        return is_string($mime) ? $mime : null;
    }

    private static function extensionForMime(string $mime): ?string
    {
        $map = [
            'image/jpeg'       => 'jpg',
            'image/png'        => 'png',
            'image/webp'       => 'webp',
            'application/pdf'  => 'pdf',
        ];

        return $map[$mime] ?? null;
    }
}
