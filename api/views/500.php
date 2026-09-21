<!DOCTYPE html>

<html dir="rtl" lang="fa"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>۵۰۰ خطای داخلی سرور</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600&amp;family=JetBrains+Mono:wght@400&amp;family=Material+Symbols+Outlined:wght,FILL,GRAD,opsz@400,0,0,24&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              "colors": {
                      "on-surface": "#191c1d",
                      "surface": "#f8f9fa",
                      "inverse-primary": "#c6c6c6",
                      "surface-tint": "#5e5e5e",
                      "primary": "#000000",
                      "on-primary-container": "#848484",
                      "on-background": "#191c1d",
                      "surface-bright": "#f8f9fa",
                      "tertiary-fixed-dim": "#c6c6c6",
                      "on-surface-variant": "#4c4546",
                      "on-tertiary": "#ffffff",
                      "on-tertiary-container": "#848484",
                      "outline-variant": "#cfc4c5",
                      "secondary-fixed": "#dce2f3",
                      "primary-fixed": "#e2e2e2",
                      "on-tertiary-fixed": "#1b1b1b",
                      "on-primary-fixed": "#1b1b1b",
                      "on-secondary-fixed-variant": "#404754",
                      "surface-container-highest": "#e1e3e4",
                      "inverse-on-surface": "#f0f1f2",
                      "surface-dim": "#d9dadb",
                      "surface-variant": "#e1e3e4",
                      "surface-container": "#edeeef",
                      "on-secondary-container": "#5e6572",
                      "tertiary": "#000000",
                      "error-container": "#ffdad6",
                      "secondary-fixed-dim": "#c0c7d6",
                      "error": "#ba1a1a",
                      "primary-container": "#1b1b1b",
                      "on-secondary-fixed": "#151c27",
                      "on-primary": "#ffffff",
                      "secondary": "#585f6c",
                      "on-secondary": "#ffffff",
                      "on-error": "#ffffff",
                      "secondary-container": "#dce2f3",
                      "surface-container-high": "#e7e8e9",
                      "inverse-surface": "#2e3132",
                      "tertiary-fixed": "#e2e2e2",
                      "primary-fixed-dim": "#c6c6c6",
                      "background": "#f8f9fa",
                      "tertiary-container": "#1b1b1b",
                      "on-primary-fixed-variant": "#474747",
                      "surface-container-low": "#f3f4f5",
                      "outline": "#7e7576",
                      "surface-container-lowest": "#ffffff",
                      "on-error-container": "#93000a",
                      "on-tertiary-fixed-variant": "#474747"
              },
              "borderRadius": {
                      "DEFAULT": "0.125rem",
                      "lg": "0.25rem",
                      "xl": "0.5rem",
                      "full": "0.75rem"
              },
              "spacing": {
                      "xs": "4px",
                      "margin": "24px",
                      "gutter": "16px",
                      "xl": "32px",
                      "3xl": "64px",
                      "2xl": "48px",
                      "sm": "8px",
                      "lg": "24px",
                      "base": "4px",
                      "md": "16px"
              },
              "fontFamily": {
                      "display": [
                              "Vazirmatn"
                      ],
                      "headline-md": [
                              "Vazirmatn"
                      ],
                      "label-md": [
                              "Vazirmatn"
                      ],
                      "body-md": [
                              "Vazirmatn"
                      ],
                      "label-sm": [
                              "Vazirmatn"
                      ],
                      "body-sm": [
                              "Vazirmatn"
                      ],
                      "headline-lg": [
                              "Vazirmatn"
                      ],
                      "code": [
                              "JetBrains Mono"
                      ],
                      "body-lg": [
                              "Vazirmatn"
                      ]
              },
              "fontSize": {
                      "display": [
                              "30px",
                              {
                                      "lineHeight": "38px",
                                      "letterSpacing": "-0.02em",
                                      "fontWeight": "600"
                              }
                      ],
                      "headline-md": [
                              "20px",
                              {
                                      "lineHeight": "28px",
                                      "letterSpacing": "-0.01em",
                                      "fontWeight": "600"
                              }
                      ],
                      "label-md": [
                              "14px",
                              {
                                      "lineHeight": "20px",
                                      "letterSpacing": "0",
                                      "fontWeight": "500"
                              }
                      ],
                      "body-md": [
                              "14px",
                              {
                                      "lineHeight": "20px",
                                      "letterSpacing": "0",
                                      "fontWeight": "400"
                              }
                      ],
                      "label-sm": [
                              "12px",
                              {
                                      "lineHeight": "16px",
                                      "letterSpacing": "0.02em",
                                      "fontWeight": "500"
                              }
                      ],
                      "body-sm": [
                              "12px",
                              {
                                      "lineHeight": "18px",
                                      "letterSpacing": "0",
                                      "fontWeight": "400"
                              }
                      ],
                      "headline-lg": [
                              "24px",
                              {
                                      "lineHeight": "32px",
                                      "letterSpacing": "-0.02em",
                                      "fontWeight": "600"
                              }
                      ],
                      "code": [
                              "13px",
                              {
                                      "lineHeight": "20px",
                                      "letterSpacing": "0",
                                      "fontWeight": "400"
                              }
                      ],
                      "body-lg": [
                              "16px",
                              {
                                      "lineHeight": "24px",
                                      "letterSpacing": "0",
                                      "fontWeight": "400"
                              }
                      ]
              }
      },
          },
        }
      </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
    </style>
</head>
<body class="bg-surface text-on-surface antialiased min-h-screen flex flex-col items-center justify-center p-margin">
<main class="max-w-md w-full flex flex-col items-center text-center">
<!-- Error Icon -->
<div class="mb-lg text-outline">
<span class="material-symbols-outlined" data-icon="error_outline" style="font-size: 48px; font-weight: 300;">error_outline</span>
</div>
<!-- Typography Cluster -->
<div class="space-y-sm mb-xl">
<h1 class="font-display text-display text-primary">۵۰۰</h1>
<h2 class="font-headline-md text-headline-md text-on-surface">خطای داخلی سرور</h2>
<p class="font-body-md text-body-md text-on-surface-variant max-w-sm mx-auto mt-md">
                مشکلی از سمت ما رخ داده است. لطفاً بعداً دوباره تلاش کنید.
            </p>
</div>
<!-- Action Buttons -->
<div class="flex flex-col sm:flex-row gap-sm w-full justify-center">
<button class="bg-primary text-on-primary font-label-md text-label-md px-lg py-[10px] rounded hover:bg-on-surface-variant transition-colors w-full sm:w-auto flex justify-center items-center gap-sm">
<span class="material-symbols-outlined text-[18px]">refresh</span>
                تلاش مجدد
            </button>
<a class="bg-surface-container-lowest text-primary border border-surface-variant font-label-md text-label-md px-lg py-[10px] rounded hover:bg-surface-container-low transition-colors w-full sm:w-auto flex justify-center items-center" href="#">
                رفتن به داشبورد
            </a>
</div>
<!-- Technical Details (Optional for System Look) -->
<div class="mt-2xl pt-lg border-t border-surface-variant w-full text-right">
<p class="font-code text-code text-on-surface-variant flex items-center justify-end gap-xs" dir="ltr">
<span class="material-symbols-outlined text-[16px]">terminal</span>
                شناسه درخواست: <span class="text-primary">req_8f7b2c1a9e</span>
</p>
</div>
</main>
</body></html>