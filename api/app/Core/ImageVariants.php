<?php

namespace App\Core;

class ImageVariants
{
    /** @return array{large:string,medium:string,thumb:string} */
    public static function fromRow(array $row, string $prefix = 'image'): array
    {
        $legacy = trim((string) ($row["{$prefix}_url"] ?? $row[$prefix] ?? ''));

        return [
            'large'  => trim((string) ($row["{$prefix}_large_url"] ?? '')) ?: $legacy,
            'medium' => trim((string) ($row["{$prefix}_medium_url"] ?? '')) ?: $legacy,
            'thumb'  => trim((string) ($row["{$prefix}_thumb_url"] ?? '')) ?: $legacy,
        ];
    }

    /** @return array<string,mixed> */
    public static function enrichRow(array $row, string $prefix = 'image'): array
    {
        $variants = self::fromRow($row, $prefix);

        $row["{$prefix}_large_url"]  = $variants['large'];
        $row["{$prefix}_medium_url"] = $variants['medium'];
        $row["{$prefix}_thumb_url"]  = $variants['thumb'];
        $row['urls'] = $variants;

        return $row;
    }

    /** @param array{large:string,medium:string,thumb:string} $variants */
    public static function posterFields(array $variants): array
    {
        return [
            'poster_image'        => $variants['large'],
            'poster_image_medium' => $variants['medium'],
            'poster_image_thumb'  => $variants['thumb'],
        ];
    }

    /** @param array{large:string,medium:string,thumb:string} $variants */
    public static function imageFields(array $variants): array
    {
        return [
            'image_url'        => $variants['large'],
            'image_large_url'  => $variants['large'],
            'image_medium_url' => $variants['medium'],
            'image_thumb_url'  => $variants['thumb'],
        ];
    }

    /** @param array{large:string,medium:string,thumb:string} $variants */
    public static function settingsFields(string $baseField, array $variants): array
    {
        return [
            $baseField               => $variants['large'],
            "{$baseField}_medium"    => $variants['medium'],
            "{$baseField}_thumb"     => $variants['thumb'],
        ];
    }
}
