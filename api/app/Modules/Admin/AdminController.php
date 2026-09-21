<?php

namespace App\Modules\Admin;

use App\Core\Controller;
use App\Core\Http\Request;

class AdminController extends Controller
{
    private AdminDashboardService $service;

    public function __construct()
    {
        $this->service = new AdminDashboardService();
    }

    // GET /api/v1/admin/dashboard
    public function index(): void
    {
        $this->success($this->service->getOverview());
    }

    // GET /api/v1/admin/dashboard/stats
    public function stats(): void
    {
        $this->success($this->service->getStats());
    }

    // GET /api/v1/admin/dashboard/orders/recent?limit=10
    public function recentOrders(Request $request): void
    {
        $limit = min((int) $request->query('limit', 10), 50);
        $this->success($this->service->getRecentOrders($limit));
    }

    // GET /api/v1/admin/dashboard/products/low-stock?threshold=5
    public function lowStock(Request $request): void
    {
        $threshold = (int) $request->query('threshold', 5);
        $this->success($this->service->getLowStockProducts($threshold));
    }

    // GET /api/v1/admin/dashboard/revenue?days=7
    public function revenue(Request $request): void
    {
        $days = (int) $request->query('days', 7);
        $this->success($this->service->getRevenueByDay($days));
    }

    // GET /api/v1/admin/dashboard/products/top?limit=10
    public function topProducts(Request $request): void
    {
        $limit = min((int) $request->query('limit', 10), 50);
        $this->success($this->service->getTopSellingProducts($limit));
    }

    // GET /api/v1/admin/dashboard/orders/by-status
    public function ordersByStatus(): void
    {
        $this->success($this->service->getOrdersByStatus());
    }
}