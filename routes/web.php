<?php

use App\Controllers\AuthController;
use App\Controllers\DashboardController;
use App\Controllers\AreaController;
use App\Controllers\RoomController;
use App\Controllers\TenantController;
use App\Controllers\ContractController;
use App\Controllers\ServiceController;
use App\Controllers\MeterController;
use App\Controllers\InvoiceController;
use App\Controllers\PaymentController;
use App\Controllers\MaintenanceController;
use App\Controllers\ExpenseController;
use App\Controllers\ReportController;
use App\Controllers\NotificationController;
use App\Controllers\SettingController;
use App\Controllers\TenantPortalController;
use App\Controllers\UserController;
use App\Controllers\MobileApiController;

/** @var \App\Core\Router $router */

// Trang chủ điều hướng thông minh
$router->get('/', function() {
    if (!is_logged_in()) {
        redirect('/login');
    }
    if (is_admin()) {
        redirect('/dashboard');
    } else {
        redirect('/tenant/dashboard');
    }
});

// Xác thực tài khoản
$router->get('/login', [AuthController::class, 'showLogin']);
$router->post('/login', [AuthController::class, 'login']);
$router->get('/logout', [AuthController::class, 'logout']);
$router->get('/profile', [AuthController::class, 'showProfile']);
$router->post('/profile', [AuthController::class, 'updateProfile']);
$router->post('/change-password', [AuthController::class, 'changePassword']);

// Quản trị viên (Admin)
$router->get('/dashboard', [DashboardController::class, 'index']);

// Quản lý tài khoản người dùng
$router->get('/users', [UserController::class, 'index']);
$router->post('/users/toggle-status/{id}', [UserController::class, 'toggleStatus']);

// Quản lý khu trọ
$router->get('/areas', [AreaController::class, 'index']);
$router->get('/areas/create', [AreaController::class, 'create']);
$router->post('/areas', [AreaController::class, 'store']);
$router->get('/areas/edit/{id}', [AreaController::class, 'edit']);
$router->post('/areas/update/{id}', [AreaController::class, 'update']);
$router->post('/areas/delete/{id}', [AreaController::class, 'delete']);

// Quản lý phòng trọ
$router->get('/rooms', [RoomController::class, 'index']);
$router->get('/rooms/create', [RoomController::class, 'create']);
$router->post('/rooms', [RoomController::class, 'store']);
$router->get('/rooms/show/{id}', [RoomController::class, 'show']);
$router->get('/rooms/edit/{id}', [RoomController::class, 'edit']);
$router->post('/rooms/update/{id}', [RoomController::class, 'update']);
$router->post('/rooms/delete/{id}', [RoomController::class, 'delete']);
$router->post('/rooms/image/delete/{id}', [RoomController::class, 'deleteImage']);
$router->post('/rooms/image/primary/{id}', [RoomController::class, 'setPrimaryImage']);

// Quản lý người thuê
$router->get('/tenants', [TenantController::class, 'index']);
$router->get('/tenants/create', [TenantController::class, 'create']);
$router->post('/tenants', [TenantController::class, 'store']);
$router->get('/tenants/show/{id}', [TenantController::class, 'show']);
$router->get('/tenants/edit/{id}', [TenantController::class, 'edit']);
$router->post('/tenants/update/{id}', [TenantController::class, 'update']);
$router->post('/tenants/delete/{id}', [TenantController::class, 'delete']);

// Quản lý hợp đồng
$router->get('/contracts', [ContractController::class, 'index']);
$router->get('/contracts/create', [ContractController::class, 'create']);
$router->post('/contracts', [ContractController::class, 'store']);
$router->get('/contracts/show/{id}', [ContractController::class, 'show']);
$router->get('/contracts/edit/{id}', [ContractController::class, 'edit']);
$router->post('/contracts/update/{id}', [ContractController::class, 'update']);
$router->post('/contracts/extend/{id}', [ContractController::class, 'extend']);
$router->post('/contracts/terminate/{id}', [ContractController::class, 'terminate']);
$router->get('/contracts/print/{id}', [ContractController::class, 'printContract']);

// Quản lý dịch vụ & đơn giá
$router->get('/services', [ServiceController::class, 'index']);
$router->post('/services', [ServiceController::class, 'store']);
$router->post('/services/update/{id}', [ServiceController::class, 'update']);
$router->post('/services/delete/{id}', [ServiceController::class, 'delete']);

// Quản lý chỉ số điện nước
$router->get('/meters', [MeterController::class, 'index']);
$router->get('/meters/create', [MeterController::class, 'create']);
$router->post('/meters', [MeterController::class, 'store']);
$router->get('/meters/prev-reading-ajax', [MeterController::class, 'getPrevReadingAjax']);

// Quản lý hóa đơn
$router->get('/invoices', [InvoiceController::class, 'index']);
$router->get('/invoices/create', [InvoiceController::class, 'create']);
$router->post('/invoices', [InvoiceController::class, 'store']);
$router->post('/invoices/auto-generate', [InvoiceController::class, 'autoGenerate']);
$router->get('/invoices/show/{id}', [InvoiceController::class, 'show']);
$router->get('/invoices/print/{id}', [InvoiceController::class, 'printInvoice']);

// Quản lý thanh toán
$router->get('/payments', [PaymentController::class, 'index']);
$router->post('/payments', [PaymentController::class, 'store']);

// Quản lý bảo trì (Admin)
$router->get('/maintenance', [MaintenanceController::class, 'index']);
$router->get('/maintenance/show/{id}', [MaintenanceController::class, 'show']);
$router->post('/maintenance/update/{id}', [MaintenanceController::class, 'update']);

// Quản lý chi phí
$router->get('/expenses', [ExpenseController::class, 'index']);
$router->get('/expenses/create', [ExpenseController::class, 'create']);
$router->post('/expenses', [ExpenseController::class, 'store']);
$router->get('/expenses/edit/{id}', [ExpenseController::class, 'edit']);
$router->post('/expenses/update/{id}', [ExpenseController::class, 'update']);
$router->post('/expenses/delete/{id}', [ExpenseController::class, 'delete']);

// Báo cáo & thống kê
$router->get('/reports', [ReportController::class, 'index']);

// Quản lý thông báo
$router->get('/notifications', [NotificationController::class, 'index']);
$router->post('/notifications', [NotificationController::class, 'store']);
$router->post('/notifications/delete/{id}', [NotificationController::class, 'delete']);

// Cài đặt hệ thống
$router->get('/settings', [SettingController::class, 'index']);
$router->post('/settings', [SettingController::class, 'update']);

// ==========================================
// CỔNG THÔNG TIN NGƯỜI THUÊ (TENANT PORTAL)
// ==========================================
$router->get('/tenant/dashboard', [TenantPortalController::class, 'dashboard']);
$router->get('/tenant/room', [TenantPortalController::class, 'room']);
$router->get('/tenant/contract', [TenantPortalController::class, 'contract']);
$router->get('/tenant/invoices', [TenantPortalController::class, 'invoices']);
$router->get('/tenant/invoices/show/{id}', [TenantPortalController::class, 'invoiceDetail']);
$router->get('/tenant/meters', [TenantPortalController::class, 'meters']);
$router->get('/tenant/payments', [TenantPortalController::class, 'payments']);
$router->get('/tenant/maintenance', [TenantPortalController::class, 'maintenance']);
$router->get('/tenant/maintenance/create', [TenantPortalController::class, 'createMaintenance']);
$router->post('/tenant/maintenance', [TenantPortalController::class, 'storeMaintenance']);
$router->get('/tenant/notifications', [TenantPortalController::class, 'notifications']);

// API JSON cho ứng dụng di động React Native Expo
$router->get('/api/health', [MobileApiController::class, 'health']);
$router->get('/api/demo-tenants', [MobileApiController::class, 'demoTenants']);
$router->post('/api/login', [MobileApiController::class, 'login']);
$router->post('/api/register', [MobileApiController::class, 'register']);
$router->get('/api/dashboard', [MobileApiController::class, 'dashboard']);

// Quản lý phòng trọ (CRUD)
$router->get('/api/rooms', [MobileApiController::class, 'rooms']);
$router->post('/api/rooms', [MobileApiController::class, 'createRoom']);
$router->put('/api/rooms/{id}', [MobileApiController::class, 'updateRoom']);
$router->post('/api/rooms/update/{id}', [MobileApiController::class, 'updateRoom']);
$router->delete('/api/rooms/{id}', [MobileApiController::class, 'deleteRoom']);
$router->post('/api/rooms/delete/{id}', [MobileApiController::class, 'deleteRoom']);

// Quản lý khách thuê
$router->get('/api/tenants', [MobileApiController::class, 'tenants']);

// Quản lý hóa đơn & thanh toán
$router->get('/api/invoices', [MobileApiController::class, 'invoices']);
$router->post('/api/invoices', [MobileApiController::class, 'createInvoice']);
$router->post('/api/payments', [MobileApiController::class, 'recordPayment']);

// Quản lý sự cố & bảo trì
$router->get('/api/maintenance', [MobileApiController::class, 'maintenance']);
$router->post('/api/maintenance', [MobileApiController::class, 'maintenance']);
$router->post('/api/maintenance/update', [MobileApiController::class, 'updateMaintenanceStatus']);
$router->post('/api/maintenance/delete', [MobileApiController::class, 'deleteMaintenance']);
$router->post('/api/maintenance/delete/{id}', [MobileApiController::class, 'deleteMaintenance']);
$router->post('/api/maintenance/{id}/status', [MobileApiController::class, 'updateMaintenanceStatus']);

// Quản lý Push Token thiết bị
$router->post('/api/push-token', [MobileApiController::class, 'savePushToken']);
$router->post('/api/push-tokens', [MobileApiController::class, 'savePushToken']);
$router->post('/api/push-token/remove', [MobileApiController::class, 'removePushToken']);
$router->delete('/api/push-token', [MobileApiController::class, 'removePushToken']);
$router->delete('/api/push-tokens', [MobileApiController::class, 'removePushToken']);

// Quản lý thông báo & Tùy chọn
$router->get('/api/notifications', [MobileApiController::class, 'notifications']);
$router->get('/api/notifications/unread-count', [MobileApiController::class, 'unreadCount']);
$router->post('/api/notifications/read/{id}', [MobileApiController::class, 'markNotificationRead']);
$router->patch('/api/notifications/{id}/read', [MobileApiController::class, 'markNotificationRead']);
$router->post('/api/notifications/read-all', [MobileApiController::class, 'markAllNotificationsRead']);
$router->patch('/api/notifications/read-all', [MobileApiController::class, 'markAllNotificationsRead']);
$router->get('/api/notifications/preferences', [MobileApiController::class, 'getNotificationPreferences']);
$router->post('/api/notifications/preferences', [MobileApiController::class, 'saveNotificationPreferences']);
$router->post('/api/reminders/run', [MobileApiController::class, 'runReminders']);



// Session identity and scoped detail routes for navigation / Socket.IO handshake.
$router->get('/api/session', [MobileApiController::class, 'session']);
$router->get('/api/invoices/{id}', [MobileApiController::class, 'invoiceDetail']);
$router->get('/api/maintenance/{id}', [MobileApiController::class, 'maintenanceDetail']);
$router->get('/api/manage/{resource}', [MobileApiController::class, 'manage']);
$router->post('/api/manage/{resource}', [MobileApiController::class, 'manage']);
$router->put('/api/manage/{resource}/{id}', [MobileApiController::class, 'manage']);
$router->delete('/api/manage/{resource}/{id}', [MobileApiController::class, 'manage']);
