<?php
$orderId = isset($_GET['order_id']) ? htmlspecialchars($_GET['order_id'], ENT_QUOTES, 'UTF-8') : '';
$status  = $_GET['status'] ?? '';
$isSuccess = ($status === 'success');
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#0a0a0a">
  <title>نتیجه پرداخت</title>
  <link rel="stylesheet" href="assets/css/output.css">
  <link rel="stylesheet" href="assets/css/fonts.css">
  <link rel="shortcut icon" href="assets/images/logo.png" type="image/x-icon">
  <script src="assets/js/libs/lucide.min.js"></script>
  <style>
    body {
      font-family: var(--font-vazir);
      background-color: var(--color-dark);
      color: var(--color-body-text);
      min-height: 100vh;
    }
  </style>
</head>

<body class="bg-body text-body overflow-x-hidden flex items-center justify-center min-h-screen px-4" dir="rtl">

  <main class="w-full max-w-md">
    <div class="bg-card border border-border rounded-2xl p-8 text-center">

      <?php if ($isSuccess): ?>
        <div class="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
          <i data-lucide="check-circle-2" class="w-8 h-8 text-green-500"></i>
        </div>
        <h2 class="text-2xl font-bold mb-3 text-green-500">پرداخت با موفقیت انجام شد</h2>
        <p class="text-muted mb-1">سفارش شما با موفقیت ثبت و پرداخت شد.</p>
      <?php else: ?>
        <div class="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
          <i data-lucide="x-circle" class="w-8 h-8 text-accent"></i>
        </div>
        <h2 class="text-2xl font-bold mb-3 text-accent">پرداخت ناموفق بود</h2>
        <p class="text-muted mb-1">متاسفانه پرداخت شما با مشکل مواجه شد.</p>
      <?php endif; ?>

      <?php if ($orderId): ?>
        <p class="text-muted mb-8">
          شماره سفارش: <span class="font-bold text-body"><?= $orderId ?></span>
        </p>
      <?php else: ?>
        <div class="mb-8"></div>
      <?php endif; ?>

      <div class="flex flex-col gap-3">
        <a href="index.html"
          class="inline-block w-full px-8 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover font-bold transition-colors">
          بازگشت به خانه
        </a>

        <?php if (!$isSuccess): ?>
          <a href="index.html#/checkout"
            class="inline-block w-full px-8 py-3 bg-surface border border-border text-body rounded-lg hover:border-accent/40 transition-colors">
            تلاش مجدد برای پرداخت
          </a>
        <?php endif; ?>
      </div>

    </div>
  </main>

  <script>
    lucide.createIcons();
  </script>

</body>

</html>