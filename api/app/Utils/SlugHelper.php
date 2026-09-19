<?php

namespace App\Utils;

class SlugHelper
{
    public static function make(string $text, string $fallback = 'item'): string
    {
        $text = trim($text);
        if ($text === '') {
            return $fallback;
        }

        $slug = mb_strtolower($text, 'UTF-8');
        $slug = preg_replace('/[\s_]+/u', '-', $slug) ?? $fallback;
        $slug = preg_replace('/[^\p{L}\p{N}-]+/u', '', $slug) ?? $fallback;
        $slug = trim($slug, '-');

        return $slug !== '' ? $slug : $fallback;
    }

    public static function unique(string $base, callable $exists): string
    {
        $slug = self::make($base);
        if (!$exists($slug)) {
            return $slug;
        }

        $i = 2;
        while ($exists("{$slug}-{$i}")) {
            $i++;
        }

        return "{$slug}-{$i}";
    }
}
