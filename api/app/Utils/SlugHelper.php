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

    /**
     * Axis/value slug: FA normalization only for product_variant_axes / product_axis_values.
     * - Removes ZWNJ \u200C, ZWJ \u200D, BOM \uFEFF, kashida \u0640
     * - ي (064A), ى (0649) → ی (06CC); ك (0643), ڪ (06AA) → ک (06A9)
     * - FA/AR digits → Latin
     * - Does NOT touch ئ (0626) or ؤ (0624)
     * - NFKC via unicode normalize if ext-intl available, else no-op
     * products.slug must NOT use this — keep make() for that.
     */
    public static function axisSlug(string $text, string $fallback = 'item'): string
    {
        $text = trim($text);
        if ($text === '') return $fallback;

        // Remove ZWNJ, ZWJ, BOM, kashida
        $text = str_replace(["\u{200C}", "\u{200D}", "\u{FEFF}", "\u{0640}"], '', $text);
        // ي / ى → ی (do not touch ئ)
        $text = str_replace(["\xD9\x8A", "\xD9\x89"], "\xDB\x8C", $text); // ي, ى → ی
        // ك / ڪ → ک
        $text = str_replace(["\xD9\x83", "\xD9\xAA"], "\xDA\xA9", $text); // ك, ڪ → ک
        // FA digits ۰-۹ (06F0-06F9) and AR digits ٠-٩ (0660-0669) → Latin
        $fa = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹','٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
        $en = ['0','1','2','3','4','5','6','7','8','9','0','1','2','3','4','5','6','7','8','9'];
        $text = str_replace($fa, $en, $text);

        if (class_exists('Normalizer')) {
            $norm = \Normalizer::normalize($text, \Normalizer::FORM_KC);
            if ($norm !== false && $norm !== null) $text = $norm;
        }

        $slug = mb_strtolower($text, 'UTF-8');
        $slug = preg_replace('/[\s_]+/u', '-', $slug) ?? $fallback;
        $slug = preg_replace('/[^\p{L}\p{N}-]+/u', '', $slug) ?? $fallback;
        $slug = trim($slug, '-');
        return $slug !== '' ? $slug : $fallback;
    }

    public static function axisUnique(string $base, callable $exists): string
    {
        $slug = self::axisSlug($base);
        if (!$exists($slug)) return $slug;
        $i = 2;
        while ($exists("{$slug}-{$i}")) $i++;
        return "{$slug}-{$i}";
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
