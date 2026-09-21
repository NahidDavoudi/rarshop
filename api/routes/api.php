<?php

use App\Core\Middleware\AuthMiddleware;
use App\Core\Middleware\AdminMiddleware;
use App\Core\Middleware\LogMiddleware;
use App\Modules\Auth\AuthController;
use App\Modules\Users\UsersController;
use App\Modules\Product\ProductController;
use App\Modules\Category\CategoryController;
use App\Modules\Order\OrderController;
use App\Modules\Cart\CartController;
use App\Modules\Discount\DiscountController;
use App\Modules\Admin\AdminController;
use App\Modules\Settings\SettingsController;
use App\Modules\Attribute\AttributeController;
use App\Modules\Variant\VariantController;
use App\Modules\PromoBanner\PromoBannerController;
use App\Modules\HeroSlide\HeroSlideController;
use App\Modules\Size\SizeController;
use App\Modules\Payment\PaymentController;

$router->group([
    'middleware' => [LogMiddleware::class],
], function ($router) {

    // ═══════════════════════════════════════════════════════════════════════
    // عمومی (بدون احراز هویت)
    // ═══════════════════════════════════════════════════════════════════════

    // Auth
    $router->post('/api/v1/auth/register',    [AuthController::class, 'register']);
    $router->post('/api/v1/auth/login',       [AuthController::class, 'login']);
    $router->post('/api/v1/auth/admin-login', [AuthController::class, 'adminLogin']);
    $router->post('/api/v1/auth/otp/request', [AuthController::class, 'otpRequest']);
    $router->post('/api/v1/auth/otp/verify',  [AuthController::class, 'otpVerify']);
    $router->post('/api/v1/auth/refresh',    [AuthController::class, 'refresh']);
    $router->post('/api/v1/auth/logout',     [AuthController::class, 'logout']);

    // Products
    $router->get('/api/v1/products',          [ProductController::class, 'index']);
    $router->get('/api/v1/products/featured', [ProductController::class, 'featured']);
    $router->get('/api/v1/products/{id}',     [ProductController::class, 'show']);

    // Categories
    $router->get('/api/v1/categories',             [CategoryController::class, 'index']);
    $router->get('/api/v1/categories/{id}',        [CategoryController::class, 'show']);
    $router->get('/api/v1/categories/slug/{slug}', [CategoryController::class, 'slug']);

    // Discounts
    $router->get('/api/v1/discounts/validate', [DiscountController::class, 'validateCode']);

    // Promo banners
    $router->get('/api/v1/promo-banners', [PromoBannerController::class, 'index']);

    // Hero slides
    $router->get('/api/v1/hero-slides', [HeroSlideController::class, 'index']);

    // Settings
    $router->get('/api/v1/settings', [SettingsController::class, 'index']);
    $router->get('/api/v1/settings/shipping',[SettingsController::class, 'getShippingCost']);
        
    $router->get('/api/v1/payment/callback', [PaymentController::class, 'callback']);
    $router->post('/api/v1/payment/callback', [PaymentController::class, 'callback']);
    // ═══════════════════════════════════════════════════════════════════════
    // نیاز به توکن
    // ═══════════════════════════════════════════════════════════════════════

    $router->group([
        'prefix'     => '/api/v1',
        'middleware' => [AuthMiddleware::class],
    ], function ($router) {

        // Auth
        $router->get('/auth/me', [AuthController::class, 'me']);

        // Profile
        $router->get('/users/me',          [UsersController::class, 'profile']);
        $router->patch('/users/me',        [UsersController::class, 'update']);
        $router->put('/users/me/password', [UsersController::class, 'changePassword']);

        // Addresses
        $router->get('/users/me/addresses',         [UsersController::class, 'addresses']);
        $router->post('/users/me/addresses',        [UsersController::class, 'addAddress']);
        $router->patch('/users/me/addresses/{id}',  [UsersController::class, 'updateAddress']);
        $router->delete('/users/me/addresses/{id}', [UsersController::class, 'deleteAddress']);

        // Orders
        $router->post('/orders',                [OrderController::class, 'store']);
        $router->get('/orders',                 [OrderController::class, 'index']);
        $router->get('/orders/{id}',            [OrderController::class, 'show']);
        $router->get('/orders/number/{number}', [OrderController::class, 'byNumber']);
        $router->patch('/orders/{id}/cancel',   [OrderController::class, 'cancel']);

        // Payment
        $router->post('/payment/initiate', [PaymentController::class, 'initiate']);

        // Cart
        $router->get('/cart',                      [CartController::class, 'index']);
        $router->delete('/cart',                   [CartController::class, 'clear']);
        $router->post('/cart/merge',               [CartController::class, 'merge']);
        $router->post('/cart/items',               [CartController::class, 'add']);
        $router->patch('/cart/items/{productId}',  [CartController::class, 'update']);
        $router->patch('/cart/items/variant/{variantId}', [CartController::class, 'update']);
        $router->delete('/cart/items/{productId}', [CartController::class, 'remove']);
        $router->delete('/cart/items/variant/{variantId}', [CartController::class, 'remove']);
        $router->post('/cart/discount',            [CartController::class, 'discount']);

    });

    // ═══════════════════════════════════════════════════════════════════════
    // ادمین
    // ═══════════════════════════════════════════════════════════════════════

    $router->group([
        'prefix'     => '/api/v1/admin',
        'middleware' => [AuthMiddleware::class, AdminMiddleware::class],
    ], function ($router) {

        // Dashboard
        $router->get('/dashboard',                    [AdminController::class, 'index']);
        $router->get('/dashboard/stats',              [AdminController::class, 'stats']);
        $router->get('/dashboard/orders/recent',      [AdminController::class, 'recentOrders']);
        $router->get('/dashboard/orders/by-status',   [AdminController::class, 'ordersByStatus']);
        $router->get('/dashboard/products/low-stock', [AdminController::class, 'lowStock']);
        $router->get('/dashboard/products/top',       [AdminController::class, 'topProducts']);
        $router->get('/dashboard/revenue',            [AdminController::class, 'revenue']);

        // Users
        $router->get('/users',                   [UsersController::class, 'index']);
        $router->patch('/users/{id}/role',       [UsersController::class, 'updateRole']);
        $router->patch('/users/{id}/activate',   [UsersController::class, 'activate']);
        $router->patch('/users/{id}/deactivate', [UsersController::class, 'deactivate']);

        // Products
        $router->post('/products',                         [ProductController::class, 'store']);
        $router->put('/products/{id}',                     [ProductController::class, 'update']);
        $router->delete('/products/{id}',                  [ProductController::class, 'destroy']);
        $router->patch('/products/{id}/toggle',            [ProductController::class, 'toggle']);
        $router->post('/products/{id}/images',             [ProductController::class, 'addImage']);
        $router->patch('/products/{id}/images/{imageId}',  [ProductController::class, 'setMainImage']);
        $router->delete('/products/{id}/images/{imageId}', [ProductController::class, 'deleteImage']);
        $router->post('/products/{id}/variants/generate',  [VariantController::class, 'generate']);
        $router->post('/products/{id}/variants/preview',   [VariantController::class, 'previewGenerate']);
        $router->put('/products/{id}/variants/bulk',       [VariantController::class, 'bulkUpdate']);
        $router->post('/products/{id}/variants/bulk-inventory', [VariantController::class, 'bulkInventory']);
        // Axes & values
        $router->get('/products/{id}/axes',                 [VariantController::class, 'listAxes']);
        $router->post('/products/{id}/axes',                [VariantController::class, 'createAxis']);
        $router->post('/products/{id}/axes/with-assignment', [VariantController::class, 'addAxisWithAssignment']);
        $router->put('/products/{id}/axes/{axisId}',       [VariantController::class, 'updateAxis']);
        $router->delete('/products/{id}/axes/{axisId}',    [VariantController::class, 'deactivateAxis']);
        $router->post('/products/{id}/axes/{axisId}/values', [VariantController::class, 'createAxisValue']);
        $router->put('/products/{id}/axes/{axisId}/values/{valueId}', [VariantController::class, 'updateAxisValue']);
        $router->delete('/products/{id}/axes/{axisId}/values/{valueId}', [VariantController::class, 'deactivateAxisValue']);
        $router->post('/products/{id}/axes/{axisId}/merge', [VariantController::class, 'mergeAxisValues']);

        // Variants
        $router->put('/variants/{id}',                     [VariantController::class, 'update']);

        // Attribute types
        $router->get('/attribute-types',                  [AttributeController::class, 'index']);
        $router->post('/attribute-types',                 [AttributeController::class, 'store']);
        $router->post('/attribute-types/{id}/values',      [AttributeController::class, 'addValue']);

        // Categories
        $router->post('/categories',                         [CategoryController::class, 'store']);
        $router->put('/categories/{id}',                     [CategoryController::class, 'update']);
        $router->delete('/categories/{id}',                  [CategoryController::class, 'destroy']);
        $router->post('/categories/{id}/poster',             [CategoryController::class, 'uploadPoster']);
        $router->get('/categories/{id}/images',              [CategoryController::class, 'images']);
        $router->post('/categories/{id}/images',             [CategoryController::class, 'addImage']);
        $router->patch('/categories/{id}/images/{imageId}',  [CategoryController::class, 'setMainImage']);
        $router->delete('/categories/{id}/images/{imageId}', [CategoryController::class, 'destroyImage']);

        // Orders
        $router->get('/orders',                          [OrderController::class, 'adminIndex']);
        $router->get('/orders/{id}',                     [OrderController::class, 'adminShow']);
        $router->patch('/orders/{id}/status',            [OrderController::class, 'updateStatus']);

        // Settings
        $router->get('/settings',                    [SettingsController::class, 'show']);
        $router->patch('/settings',                  [SettingsController::class, 'update']);
        $router->post('/settings/upload/{type}',     [SettingsController::class, 'uploadImage']);

        // Promo banners
        $router->get('/promo-banners',              [PromoBannerController::class, 'adminIndex']);
        $router->post('/promo-banners',             [PromoBannerController::class, 'store']);
        $router->patch('/promo-banners/reorder',    [PromoBannerController::class, 'reorder']);
        $router->put('/promo-banners/{id}',         [PromoBannerController::class, 'update']);
        $router->delete('/promo-banners/{id}',      [PromoBannerController::class, 'destroy']);

        // Hero slides
        $router->get('/hero-slides',              [HeroSlideController::class, 'adminIndex']);
        $router->post('/hero-slides',             [HeroSlideController::class, 'store']);
        $router->patch('/hero-slides/reorder',    [HeroSlideController::class, 'reorder']);
        $router->put('/hero-slides/{id}',         [HeroSlideController::class, 'update']);
        $router->delete('/hero-slides/{id}',      [HeroSlideController::class, 'destroy']);

        // Discounts
        $router->get('/discounts',                   [DiscountController::class, 'index']);
        $router->get('/discounts/active',            [DiscountController::class, 'active']);
        $router->post('/discounts',                  [DiscountController::class, 'store']);
        $router->put('/discounts/{id}',              [DiscountController::class, 'update']);
        $router->patch('/discounts/{id}/deactivate', [DiscountController::class, 'deactivate']);
        $router->delete('/discounts/{id}',           [DiscountController::class, 'destroy']);
        // Size guides
        $router->get('/size',        [SizeController::class, 'index']);
        $router->get('/size/{id}',   [SizeController::class, 'show']);
        $router->post('/size',       [SizeController::class, 'store']);
        $router->put('/size/{id}',   [SizeController::class, 'update']);
        $router->delete('/size/{id}',[SizeController::class, 'destroy']);
    });

});