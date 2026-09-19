<!DOCTYPE html>

<html dir="rtl" lang="fa"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>۴۰۱ - نیاز به احراز هویت</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              "colors": {
                      "surface-dim": "#d9dadb",
                      "surface-container": "#edeeef",
                      "secondary-fixed-dim": "#c0c7d6",
                      "on-error-container": "#93000a",
                      "on-surface-variant": "#4c4546",
                      "on-tertiary-container": "#848484",
                      "surface-container-highest": "#e1e3e4",
                      "secondary": "#585f6c",
                      "on-tertiary-fixed": "#1b1b1b",
                      "tertiary": "#000000",
                      "on-secondary": "#ffffff",
                      "tertiary-fixed-dim": "#c6c6c6",
                      "on-primary": "#ffffff",
                      "surface-container-lowest": "#ffffff",
                      "surface-bright": "#f8f9fa",
                      "error": "#ba1a1a",
                      "on-surface": "#191c1d",
                      "on-background": "#191c1d",
                      "outline": "#7e7576",
                      "tertiary-container": "#1b1b1b",
                      "on-error": "#ffffff",
                      "inverse-surface": "#2e3132",
                      "primary-fixed": "#e2e2e2",
                      "on-secondary-container": "#5e6572",
                      "on-secondary-fixed": "#151c27",
                      "on-primary-container": "#848484",
                      "on-tertiary-fixed-variant": "#474747",
                      "secondary-container": "#dce2f3",
                      "on-primary-fixed": "#1b1b1b",
                      "primary": "#000000",
                      "error-container": "#ffdad6",
                      "surface-container-high": "#e7e8e9",
                      "inverse-on-surface": "#f0f1f2",
                      "inverse-primary": "#c6c6c6",
                      "on-secondary-fixed-variant": "#404754",
                      "on-primary-fixed-variant": "#474747",
                      "primary-fixed-dim": "#c6c6c6",
                      "tertiary-fixed": "#e2e2e2",
                      "primary-container": "#1b1b1b",
                      "background": "#f8f9fa",
                      "surface": "#f8f9fa",
                      "outline-variant": "#cfc4c5",
                      "on-tertiary": "#ffffff",
                      "surface-tint": "#5e5e5e",
                      "secondary-fixed": "#dce2f3",
                      "surface-variant": "#e1e3e4",
                      "surface-container-low": "#f3f4f5"
              },
              "borderRadius": {
                      "DEFAULT": "0.125rem",
                      "lg": "0.25rem",
                      "xl": "0.5rem",
                      "full": "0.75rem"
              },
              "spacing": {
                      "xs": "4px",
                      "base": "4px",
                      "md": "16px",
                      "2xl": "48px",
                      "sm": "8px",
                      "lg": "24px",
                      "gutter": "16px",
                      "3xl": "64px",
                      "xl": "32px",
                      "margin": "24px"
              },
              "fontFamily": {
                      "body-sm": ["Vazirmatn", "sans-serif"],
                      "headline-md": ["Vazirmatn", "sans-serif"],
                      "display": ["Vazirmatn", "sans-serif"],
                      "headline-lg": ["Vazirmatn", "sans-serif"],
                      "code": ["JetBrains Mono", "monospace"],
                      "label-md": ["Vazirmatn", "sans-serif"],
                      "body-lg": ["Vazirmatn", "sans-serif"],
                      "label-sm": ["Vazirmatn", "sans-serif"],
                      "body-md": ["Vazirmatn", "sans-serif"]
              },
              "fontSize": {
                      "body-sm": ["12px", {"lineHeight": "18px", "letterSpacing": "0", "fontWeight": "400"}],
                      "headline-md": ["20px", {"lineHeight": "28px", "letterSpacing": "-0.01em", "fontWeight": "600"}],
                      "display": ["30px", {"lineHeight": "38px", "letterSpacing": "-0.02em", "fontWeight": "600"}],
                      "headline-lg": ["24px", {"lineHeight": "32px", "letterSpacing": "-0.02em", "fontWeight": "600"}],
                      "code": ["13px", {"lineHeight": "20px", "letterSpacing": "0", "fontWeight": "400"}],
                      "label-md": ["14px", {"lineHeight": "20px", "letterSpacing": "0", "fontWeight": "500"}],
                      "body-lg": ["16px", {"lineHeight": "24px", "letterSpacing": "0", "fontWeight": "400"}],
                      "label-sm": ["12px", {"lineHeight": "16px", "letterSpacing": "0.02em", "fontWeight": "500"}],
                      "body-md": ["14px", {"lineHeight": "20px", "letterSpacing": "0", "fontWeight": "400"}]
              }
            }
          }
        }
    </script>
<style>
        body {
            font-family: 'Vazirmatn', sans-serif;
        }
    </style>
</head>
<body class="bg-surface text-on-surface h-screen w-screen flex flex-col antialiased">
<!-- TopNavBar component logic says to hide if it's a linear/transactional intent. 
         A 401 page is a dead end/transactional style interruption, but keeping topbar minimal if needed.
         Following the instruction to suppress navigation to prioritize the canvas for dead ends. -->
<main class="flex-grow flex items-center justify-center p-md">
<div class="max-w-md w-full text-center flex flex-col items-center">
<!-- Icon -->
<div class="mb-lg rounded-full bg-surface-container flex items-center justify-center p-md border border-outline-variant w-16 h-16">
<span class="material-symbols-outlined text-[32px] text-on-surface-variant font-light" data-icon="key">key</span>
</div>
<!-- Error Code & Title -->
<h1 class="font-display text-display text-primary mb-sm">۴۰۱</h1>
<h2 class="font-headline-lg text-headline-lg text-on-surface mb-md">نیاز به احراز هویت</h2>
<!-- Description -->
<p class="font-body-lg text-body-lg text-on-surface-variant mb-xl max-w-[280px] mx-auto leading-relaxed">
                برای دسترسی به این منبع باید وارد حساب کاربری خود شوید.
            </p>
<!-- Actions -->
<div class="flex flex-col gap-sm w-full max-w-[240px]">
<button class="w-full bg-primary text-on-primary font-label-md text-label-md py-[10px] px-md rounded-lg flex items-center justify-center gap-sm transition-colors hover:bg-surface-tint focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-surface">
<span class="material-symbols-outlined text-[18px]" data-icon="login">login</span>
                    ورود به سیستم
                </button>
<button class="w-full bg-surface text-primary border border-outline-variant font-label-md text-label-md py-[10px] px-md rounded-lg flex items-center justify-center gap-sm transition-colors hover:bg-surface-container-low focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-surface">
                    بازگشت به صفحه اصلی
                </button>
</div>
</div>
</main>
<!-- Footer omitted as per dead-end page logic, focusing entirely on the canvas -->
</body></html>