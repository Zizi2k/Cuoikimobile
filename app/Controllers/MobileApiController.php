<?php
namespace App\Controllers;

use App\Helpers\Database;
use App\Helpers\PushNotification;
use App\Helpers\RealtimeEmitter;
use App\Helpers\NotificationInbox;
use PDO;
use Throwable;

/**
 * Mobile REST API Controller for Expo React Native Application.
 * Supports authentication, role-based authorization (Admin / Tenant),
 * CRUD operations, Push Notifications, and Socket.IO Realtime integrations.
 */
class MobileApiController
{
    private function apiSecret(): string
    {
        $secret = getenv('QLPT_API_SECRET');
        if ($secret === false || strlen($secret) < 32) {
            $this->respond(['success' => false, 'message' => 'Máy chủ chưa cấu hình QLPT_API_SECRET (tối thiểu 32 ký tự).'], 503);
        }
        return $secret;
    }

    private function respond(array $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    private function input(): array
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw ?: '[]', true);
        return is_array($data) ? $data : $_POST;
    }

    private function makeToken(int $userId, string $role = 'tenant'): string
    {
        $payload = $userId . '.' . $role . '.' . (time() + 86400 * 7);
        return rtrim(strtr(base64_encode($payload), '+/', '-_'), '=') . '.' . hash_hmac('sha256', $payload, $this->apiSecret());
    }

    private function authorize(?string $requiredRole = null): array
    {
        $token = '';
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (!$header && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }
        if (!$header && function_exists('getallheaders')) {
            $headers = getallheaders();
            $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }

        if (preg_match('/Bearer\s+(.+)/i', $header, $m)) {
            $token = trim($m[1]);
        } elseif (!empty($_SERVER['HTTP_X_AUTH_TOKEN'])) {
            $token = trim($_SERVER['HTTP_X_AUTH_TOKEN']);
        } elseif (!empty($_GET['token'])) {
            $token = trim($_GET['token']);
        }

        if ($token === '') {
            $this->respond(['success' => false, 'message' => 'Vui lòng đăng nhập lại.'], 401);
        }

        $parts = explode('.', $token);
        if (count($parts) !== 2) {
            $this->respond(['success' => false, 'message' => 'Token không hợp lệ.'], 401);
        }


        $payload = base64_decode(strtr($parts[0], '-_', '+/'), true);
        if (!$payload || !hash_equals(hash_hmac('sha256', $payload, $this->apiSecret()), $parts[1])) {
            $this->respond(['success' => false, 'message' => 'Token không hợp lệ.'], 401);
        }

        if (!preg_match('/^([1-9][0-9]*)\.(admin|tenant)\.([0-9]+)$/D', $payload, $bits)) {
            $this->respond(['success' => false, 'message' => 'Token không hợp lệ.'], 401);
        }
        $userId = (int)$bits[1];
        $expiresAt = (int)$bits[3];
        if ($expiresAt <= time()) {
            $this->respond(['success' => false, 'message' => 'Phiên đăng nhập đã hết hạn.'], 401);
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT id, username, fullname, email, phone, role, status FROM users WHERE id = ? AND status = 1 LIMIT 1");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            $this->respond(['success' => false, 'message' => 'Tài khoản không tồn tại hoặc đã bị khóa.'], 401);
        }

        if ($user['role'] !== $bits[2]) {
            $this->respond(['success' => false, 'message' => 'Quyền tài khoản đã thay đổi. Vui lòng đăng nhập lại.'], 401);
        }

        if ($requiredRole && $user['role'] !== $requiredRole) {
            $this->respond(['success' => false, 'message' => 'Bạn không có quyền thực hiện thao tác này.'], 403);
        }

        // If user is a tenant, resolve their linked tenant profile
        if ($user['role'] === 'tenant') {
            $stmt = $pdo->prepare('SELECT id FROM tenants WHERE user_id = ? LIMIT 1');
            $stmt->execute([$user['id']]);
            $tenantId = $stmt->fetchColumn();

            $user['tenant_id'] = $tenantId ? (int)$tenantId : null;
        }

        return $user;
    }

    public function options(): void
    {
        $this->respond(['success' => true]);
    }

    /** Health check */
    public function health(): void
    {
        try {
            Database::getConnection()->query('SELECT 1');
            $this->respond([
                'success' => true,
                'message' => 'API và MySQL đang hoạt động.',
                'server_time' => date('d/m/Y H:i:s'),
                'time' => date('c')
            ]);
        } catch (Throwable $e) {
            $this->respond(['success' => false, 'message' => 'Không kết nối được database: ' . $e->getMessage()], 503);
        }
    }

    /** Demo tenant accounts */
    public function demoTenants(): void
    {
        $this->respond(['success' => true, 'data' => []]);
    }

    /**
     * User authentication (Admin & Tenant)
     */
    public function login(): void
    {
        try {
            $data = $this->input();
            $login = trim((string)($data['username'] ?? $data['phone'] ?? $data['email'] ?? ''));
            $password = (string)($data['password'] ?? '');

            if ($login === '' || $password === '') {
                $this->respond([
                    'success' => false,
                    'message' => 'Vui lòng nhập tài khoản (hoặc số điện thoại) và mật khẩu.'
                ], 422);
            }

            $this->apiSecret(); // Fail before any authentication work if signing is unconfigured.
            $cleanPhone = preg_match('/^[+0-9 ().-]+$/D', $login) ? preg_replace('/[^0-9]/', '', $login) : '';
            $pdo = Database::getConnection();

            // 1. Search in users table
            $stmt = $pdo->prepare(
                "SELECT u.id, u.username, u.password, u.role, u.fullname,
                        u.email, u.phone, u.status,
                        t.id AS tenant_id, t.fullname AS tenant_fullname
                 FROM users u
                 LEFT JOIN tenants t ON t.user_id = u.id
                 WHERE u.username = ?
                    OR u.email = ?
                    OR u.phone = ?
                    OR (CHAR_LENGTH(?) >= 9 AND u.phone = ?)
                    OR (CHAR_LENGTH(?) >= 9 AND t.phone = ?)
                 ORDER BY (u.role = 'admin') DESC, u.id ASC
                 LIMIT 1"
            );

            $stmt->execute([
                $login,
                $login,
                $login,
                $cleanPhone,
                $cleanPhone,
                $cleanPhone,
                $cleanPhone
            ]);
            $u = $stmt->fetch(PDO::FETCH_ASSOC);

            // Authentication never provisions accounts or accepts demo/identity-card passwords.
            if (!$u || !password_verify($password, (string)$u['password'])) {
                $this->respond(['success' => false, 'message' => 'Thông tin đăng nhập không chính xác.'], 401);
            }
            if (password_needs_rehash($u['password'], PASSWORD_DEFAULT)) {
                $pdo->prepare('UPDATE users SET password = ? WHERE id = ?')
                    ->execute([password_hash($password, PASSWORD_DEFAULT), $u['id']]);
            }

            if ((int)$u['status'] !== 1) {
                $this->respond([
                    'success' => false,
                    'message' => 'Tài khoản đã bị tạm khóa. Vui lòng liên hệ quản lý.'
                ], 403);
            }

            // Clean up private attributes
            unset($u['password']);

            $token = $this->makeToken((int)$u['id'], $u['role']);

            $this->respond([
                'success' => true,
                'message' => 'Đăng nhập thành công! Chào mừng ' . ($u['fullname'] ?: $u['username']) . '.',
                'token'   => $token,
                'user'    => $u
            ]);
        } catch (Throwable $e) {
            error_log('Mobile login error: ' . $e->getMessage());
            $this->respond([
                'success' => false,
                'message' => 'Không thể đăng nhập lúc này. Vui lòng thử lại sau.'
            ], 500);
        }
    }

    /**
     * User registration (Tenant)
     */
    public function register(): void
    {
        try {
            $data = $this->input();
            $fullname = trim((string)($data['fullname'] ?? ''));
            $phone = trim((string)($data['phone'] ?? ''));
            $password = (string)($data['password'] ?? '');
            $email = trim((string)($data['email'] ?? '')) ?: null;
            $idCard = trim((string)($data['id_card'] ?? '')) ?: null;

            if ($fullname === '' || $phone === '' || $password === '') {
                $this->respond(['success' => false, 'message' => 'Vui lòng điền đầy đủ Họ tên, Số điện thoại và Mật khẩu.'], 422);
            }

            $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
            if (strlen($cleanPhone) < 9 || strlen($cleanPhone) > 12) {
                $this->respond(['success' => false, 'message' => 'Số điện thoại không hợp lệ.'], 422);
            }

            if (strlen($password) < 6) {
                $this->respond(['success' => false, 'message' => 'Mật khẩu phải có ít nhất 6 ký tự.'], 422);
            }

            $this->apiSecret();
            $pdo = Database::getConnection();

            // Existing tenant profiles require administrator verification, never phone-only claiming.
            $stmt = $pdo->prepare("SELECT id FROM users WHERE phone = ? OR username = ? LIMIT 1");
            $stmt->execute([$cleanPhone, $cleanPhone]);
            if ($stmt->fetch()) {
                $this->respond(['success' => false, 'message' => 'Số điện thoại này đã được đăng ký tài khoản.'], 409);
            }

            $stmt = $pdo->prepare('SELECT id FROM tenants WHERE phone = ? LIMIT 1');
            $stmt->execute([$cleanPhone]);
            if ($stmt->fetchColumn()) {
                $this->respond(['success' => false, 'message' => 'Số điện thoại đã có hồ sơ. Vui lòng liên hệ chủ trọ để được cấp tài khoản.'], 409);
            }

            $pdo->beginTransaction();

            $username = 'kh_' . $cleanPhone;
            $passHash = password_hash($password, PASSWORD_DEFAULT);

            $stmtUser = $pdo->prepare("
                INSERT INTO users (username, password, role, fullname, phone, email, status, created_at)
                VALUES (?, ?, 'tenant', ?, ?, ?, 1, NOW())
            ");
            $stmtUser->execute([$username, $passHash, $fullname, $cleanPhone, $email]);
            $userId = (int)$pdo->lastInsertId();

            $stmtInsertTenant = $pdo->prepare("
                INSERT INTO tenants (user_id, fullname, phone, email, id_card, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            ");
            $stmtInsertTenant->execute([$userId, $fullname, $cleanPhone, $email, $idCard]);
            $tenantId = (int)$pdo->lastInsertId();

            $pdo->commit();

            $token = $this->makeToken($userId, 'tenant');
            $user = [
                'id'        => $userId,
                'username'  => $username,
                'role'      => 'tenant',
                'fullname'  => $fullname,
                'phone'     => $cleanPhone,
                'email'     => $email,
                'tenant_id' => (int)$tenantId
            ];

            $this->respond([
                'success' => true,
                'message' => 'Đăng ký tài khoản thành công!',
                'token'   => $token,
                'user'    => $user
            ], 201);
        } catch (Throwable $e) {
            if (isset($pdo) && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $this->respond(['success' => false, 'message' => 'Không thể đăng ký lúc này. Vui lòng kiểm tra thông tin hoặc liên hệ chủ trọ.'], 500);
        }
    }

    /**
     * Dashboard: Adaptive by role (Admin vs Tenant)
     */
    public function dashboard(): void
    {
        $u = $this->authorize();
        $pdo = Database::getConnection();

        // 1. ADMIN DASHBOARD
        if ($u['role'] === 'admin') {
            // Room counts
            $stmt = $pdo->query("SELECT status, count(*) AS cnt FROM rooms GROUP BY status");
            $roomStats = ['total' => 0, 'empty' => 0, 'rented' => 0, 'maintenance' => 0];
            while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $st = $r['status'];
                $c = (int)$r['cnt'];
                $roomStats['total'] += $c;
                if (isset($roomStats[$st])) {
                    $roomStats[$st] = $c;
                }
            }

            // Invoices summary
            $stmt = $pdo->query("SELECT count(*) as unpaid_count, COALESCE(SUM(remaining_amount), 0) as unpaid_total FROM invoices WHERE status IN ('unpaid', 'partially_paid', 'overdue')");
            $invStats = $stmt->fetch(PDO::FETCH_ASSOC);

            // Maintenance pending count
            $stmt = $pdo->query("SELECT count(*) FROM maintenance_requests WHERE status IN ('pending', 'in_progress')");
            $pendingMaintenanceCount = (int)$stmt->fetchColumn();

            // Recent invoices
            $stmt = $pdo->query("
                SELECT i.id, i.invoice_code, i.billing_month, i.total_amount, i.paid_amount, i.remaining_amount, i.due_date, i.status,
                       t.fullname AS tenant_name, r.room_number, r.room_code
                FROM invoices i
                JOIN tenants t ON i.tenant_id = t.id
                JOIN rooms r ON i.room_id = r.id
                ORDER BY i.id DESC
                LIMIT 5
            ");
            $recentInvoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Recent maintenance
            $stmt = $pdo->query("
                SELECT m.id, m.request_code, m.title, m.description, m.priority, m.status, m.created_at,
                       t.fullname AS tenant_name, r.room_number, r.room_code
                FROM maintenance_requests m
                JOIN tenants t ON m.tenant_id = t.id
                JOIN rooms r ON m.room_id = r.id
                ORDER BY m.id DESC
                LIMIT 5
            ");
            $recentMaintenance = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Recent notifications
            $notifications = (new NotificationInbox($pdo))->items($u, 5);

            $this->respond([
                'success' => true,
                'role' => 'admin',
                'user' => $u,
                'stats' => [
                    'rooms' => $roomStats,
                    'unpaid_invoices_count' => (int)$invStats['unpaid_count'],
                    'unpaid_invoices_total' => (float)$invStats['unpaid_total'],
                    'pending_maintenance_count' => $pendingMaintenanceCount
                ],
                'invoices' => $recentInvoices,
                'maintenance' => $recentMaintenance,
                'notifications' => $notifications
            ]);
        }

        // 2. TENANT DASHBOARD
        $tid = $u['tenant_id'];
        $room = null;
        if ($tid) {
            $stmt = $pdo->prepare("
                SELECT c.id AS contract_id, c.contract_code, c.start_date, c.end_date, c.rent_price, c.status AS contract_status,
                       r.id AS room_id, r.room_code, r.room_number, r.area_size, r.price, a.name AS area_name, a.address
                FROM contracts c
                JOIN rooms r ON r.id = c.room_id
                JOIN rental_areas a ON a.id = r.area_id
                WHERE c.tenant_id = ? AND c.status = 'active'
                ORDER BY c.id DESC
                LIMIT 1
            ");
            $stmt->execute([$tid]);
            $room = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        }

        $invoices = [];
        if ($tid) {
            $stmt = $pdo->prepare("
                SELECT id, invoice_code, billing_month, total_amount, paid_amount, remaining_amount, due_date, status
                FROM invoices
                WHERE tenant_id = ?
                ORDER BY billing_month DESC, id DESC
                LIMIT 5
            ");
            $stmt->execute([$tid]);
            $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        $notifications = (new NotificationInbox($pdo))->items($u, 5);

        $requests = [];
        if ($tid) {
            $stmt = $pdo->prepare("
                SELECT id, request_code, title, description, priority, status, admin_notes, created_at
                FROM maintenance_requests
                WHERE tenant_id = ?
                ORDER BY id DESC
                LIMIT 5
            ");
            $stmt->execute([$tid]);
            $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        $tenant = [];
        if ($tid) {
            $stmt = $pdo->prepare('SELECT fullname, phone, email, id_card FROM tenants WHERE id = ?');
            $stmt->execute([$tid]);
            $tenant = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        }

        $bankAcc = get_setting('bank_account_number', '090123456789');
        $bankName = get_setting('bank_name', 'MB Bank');
        $bankOwner = get_setting('bank_account_name', 'CHU NHA TRO AN BINH');

        foreach ($invoices as &$inv) {
            if ((float)$inv['remaining_amount'] > 0) {
                $inv['vietqr_url'] = get_vietqr_url($bankAcc, $bankOwner, (float)$inv['remaining_amount'], $inv['invoice_code'], $bankName);
            } else {
                $inv['vietqr_url'] = null;
            }
        }
        unset($inv);

        $this->respond([
            'success' => true,
            'role' => 'tenant',
            'user' => $u,
            'tenant' => $tenant,
            'room' => $room,
            'invoices' => $invoices,
            'notifications' => $notifications,
            'maintenance' => $requests,
            'bank' => [
                'name' => $bankName,
                'account_number' => $bankAcc,
                'account_name' => $bankOwner
            ]
        ]);
    }

    /**
     * List rooms (Admin sees all; Tenant sees current room)
     */
    public function rooms(): void
    {
        $u = $this->authorize();
        $pdo = Database::getConnection();

        if ($u['role'] === 'admin') {
            $stmt = $pdo->query("
                SELECT r.id, r.area_id, r.room_code, r.room_number, r.area_size, r.price, r.deposit, r.max_occupants, r.status, r.description,
                       a.name AS area_name, a.address AS area_address,
                       t.fullname AS current_tenant_name, t.phone AS current_tenant_phone, c.id AS contract_id
                FROM rooms r
                JOIN rental_areas a ON r.area_id = a.id
                LEFT JOIN contracts c ON c.room_id = r.id AND c.status = 'active'
                LEFT JOIN tenants t ON t.id = c.tenant_id
                ORDER BY r.id ASC
            ");
            $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->respond(['success' => true, 'data' => $rooms]);
        }

        // Tenant sees only their room
        $tid = $u['tenant_id'];
        if (!$tid) {
            $this->respond(['success' => true, 'data' => []]);
        }

        $stmt = $pdo->prepare("
            SELECT r.id, r.area_id, r.room_code, r.room_number, r.area_size, r.price, r.deposit, r.status, r.description,
                   a.name AS area_name, a.address AS area_address,
                   c.contract_code, c.start_date, c.end_date
            FROM contracts c
            JOIN rooms r ON c.room_id = r.id
            JOIN rental_areas a ON r.area_id = a.id
            WHERE c.tenant_id = ? AND c.status = 'active'
            LIMIT 1
        ");
        $stmt->execute([$tid]);
        $room = $stmt->fetch(PDO::FETCH_ASSOC);
        $this->respond(['success' => true, 'data' => $room ? [$room] : []]);
    }

    /**
     * Invoices list (Admin sees all, Tenant sees their own)
     */
    public function invoices(): void
    {
        $u = $this->authorize();
        $pdo = Database::getConnection();

        $bankAcc = get_setting('bank_account_number', '090123456789');
        $bankName = get_setting('bank_name', 'MB Bank');
        $bankOwner = get_setting('bank_account_name', 'CHU NHA TRO AN BINH');

        if ($u['role'] === 'admin') {
            $stmt = $pdo->query("
                SELECT i.id, i.invoice_code, i.billing_month, i.room_price,
                       i.electricity_amount, i.water_amount, i.service_amount,
                       i.other_fees, i.discount, i.total_amount, i.paid_amount,
                       i.remaining_amount, i.due_date, i.status,
                       t.fullname AS tenant_name, t.phone AS tenant_phone,
                       r.room_number, r.room_code
                FROM invoices i
                JOIN tenants t ON i.tenant_id = t.id
                JOIN rooms r ON i.room_id = r.id
                ORDER BY i.billing_month DESC, i.id DESC
            ");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $tid = $u['tenant_id'];
            if (!$tid) {
                $this->respond(['success' => true, 'data' => []]);
            }
            $stmt = $pdo->prepare("
                SELECT id, invoice_code, billing_month, room_price,
                       electricity_amount, water_amount, service_amount,
                       other_fees, discount, total_amount, paid_amount,
                       remaining_amount, due_date, status
                FROM invoices
                WHERE tenant_id = ?
                ORDER BY billing_month DESC, id DESC
            ");
            $stmt->execute([$tid]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        foreach ($rows as &$inv) {
            if ((float)$inv['remaining_amount'] > 0) {
                $inv['vietqr_url'] = get_vietqr_url($bankAcc, $bankOwner, (float)$inv['remaining_amount'], $inv['invoice_code'], $bankName);
            } else {
                $inv['vietqr_url'] = null;
            }
        }
        unset($inv);

        $this->respond([
            'success' => true,
            'data'    => $rows,
            'bank'    => [
                'name'           => $bankName,
                'account_number' => $bankAcc,
                'account_name'   => $bankOwner
            ]
        ]);
    }

    /**
     * Create invoice (Admin only)
     */
    public function createInvoice(): void
    {
        $u = $this->authorize('admin');
        $data = $this->input();
        $pdo = Database::getConnection();

        $contractId = (int)($data['contract_id'] ?? 0);
        $billingMonth = trim((string)($data['billing_month'] ?? date('Y-m')));
        $dueDate = trim((string)($data['due_date'] ?? date('Y-m-d', strtotime('+7 days'))));

        if (!$contractId || empty($billingMonth)) {
            $this->respond(['success' => false, 'message' => 'Vui lòng chọn hợp đồng và kỳ tính tiền.'], 422);
        }

        $stmt = $pdo->prepare("SELECT c.*, r.room_number, r.room_code, t.fullname AS tenant_name FROM contracts c JOIN rooms r ON c.room_id=r.id JOIN tenants t ON c.tenant_id=t.id WHERE c.id = ? LIMIT 1");
        $stmt->execute([$contractId]);
        $contract = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$contract) {
            $this->respond(['success' => false, 'message' => 'Hợp đồng không tồn tại.'], 404);
        }

        // Check duplicate
        if ($contract['status'] !== 'active') $this->respond(['success'=>false,'message'=>'Hợp đồng không còn hiệu lực.'],422);
        $stmtDup = $pdo->prepare("SELECT id FROM invoices WHERE contract_id = ? AND billing_month = ? LIMIT 1");
        $stmtDup->execute([$contractId, $billingMonth]);
        if ($stmtDup->fetch()) {
            $this->respond(['success' => false, 'message' => "Hóa đơn kỳ {$billingMonth} của phòng này đã tồn tại."], 409);
        }

        if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/D', $billingMonth) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $dueDate)) {
            $this->respond(['success'=>false,'message'=>'Kỳ hoặc hạn thanh toán không hợp lệ.'],422);
        }
        foreach (['room_price','electricity_usage','electricity_rate','water_usage','water_rate','service_amount','other_fees','discount'] as $key) {
            if (isset($data[$key]) && (!is_numeric($data[$key]) || !is_finite((float)$data[$key]) || (float)$data[$key]<0)) {
                $this->respond(['success'=>false,'message'=>'Các khoản tiền/chỉ số phải là số không âm.'],422);
            }
        }
        $roomPrice = (float)($data['room_price'] ?? $contract['rent_price']);
        $elecUsage = (float)($data['electricity_usage'] ?? 0);
        $elecRate = (float)($data['electricity_rate'] ?? 3500);
        $elecAmount = $elecUsage * $elecRate;

        $waterUsage = (float)($data['water_usage'] ?? 0);
        $waterRate = (float)($data['water_rate'] ?? 20000);
        $waterAmount = $waterUsage * $waterRate;

        $serviceAmount = (float)($data['service_amount'] ?? 140000); // Default wifi+trash
        $otherFees = (float)($data['other_fees'] ?? 0);
        $discount = (float)($data['discount'] ?? 0);
        $totalAmount = max(0, $roomPrice + $elecAmount + $waterAmount + $serviceAmount + $otherFees - $discount);

        $invCode = 'HDN-' . str_replace('-', '', $billingMonth) . '-' . bin2hex(random_bytes(4));

        $pdo->beginTransaction();
        try {
            $stmtInv = $pdo->prepare("
                INSERT INTO invoices (
                    invoice_code, contract_id, room_id, tenant_id, billing_month,
                    room_price, electricity_amount, water_amount, service_amount,
                    other_fees, discount, total_amount, paid_amount, remaining_amount,
                    due_date, status, notes, created_at
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, 0.00, ?,
                    ?, 'unpaid', ?, NOW()
                )
            ");
            $stmtInv->execute([
                $invCode, $contractId, $contract['room_id'], $contract['tenant_id'], $billingMonth,
                $roomPrice, $elecAmount, $waterAmount, $serviceAmount,
                $otherFees, $discount, $totalAmount, $totalAmount,
                $dueDate, trim((string)($data['notes'] ?? ''))
            ]);
            $invId = (int)$pdo->lastInsertId();

            // Insert line items
            $stmtDet = $pdo->prepare("INSERT INTO invoice_details (invoice_id, item_name, quantity, unit, unit_price, amount, note) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmtDet->execute([$invId, 'Tiền phòng kỳ ' . $billingMonth, 1, 'Tháng', $roomPrice, $roomPrice, 'Tiền phòng theo hợp đồng']);
            if ($elecAmount > 0) {
                $stmtDet->execute([$invId, "Tiền điện ({$elecUsage} kWh)", $elecUsage, 'kWh', $elecRate, $elecAmount, 'Đơn giá: ' . number_format($elecRate) . ' đ/kWh']);
            }
            if ($waterAmount > 0) {
                $stmtDet->execute([$invId, "Tiền nước ({$waterUsage} m³)", $waterUsage, 'm³', $waterRate, $waterAmount, 'Đơn giá: ' . number_format($waterRate) . ' đ/m³']);
            }
            if ($serviceAmount > 0) {
                $stmtDet->execute([$invId, 'Phí dịch vụ chung', 1, 'Tháng', $serviceAmount, $serviceAmount, 'Wifi, rác']);
            }

            $pdo->commit();

            // Send push notification to tenant
            $dueDateFormatted = date('d/m/Y', strtotime($dueDate));
            PushNotification::createAndSend(
                'Hóa đơn tháng mới',
                "Bạn có hóa đơn tiền phòng mới kỳ {$billingMonth} với tổng số tiền " . number_format($totalAmount, 0, ',', '.') . " đ. Hạn thanh toán: {$dueDateFormatted}.",
                'payment',
                (int)$contract['tenant_id'],
                null,
                'invoice',
                $invId,
                [
                    'invoice_id'    => $invId,
                    'invoice_code'  => $invCode,
                    'total_amount'  => $totalAmount,
                    'due_date'      => $dueDate,
                    'type'          => 'new_invoice'
                ],
                $u['id']
            );

            $this->respond([
                'success' => true,
                'message' => 'Lập và phát hành hóa đơn thành công!',
                'invoice_id' => $invId,
                'invoice_code' => $invCode
            ], 201);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            $this->respond(['success' => false, 'message' => 'Lỗi tạo hóa đơn: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Record payment for an invoice (Admin only)
     */
    public function recordPayment(): void
    {
        $u = $this->authorize('admin');
        $data = $this->input();
        $pdo = Database::getConnection();

        $invoiceId = (int)($data['invoice_id'] ?? 0);
        $amount = (float)($data['amount'] ?? 0);
        $method = in_array(($data['payment_method'] ?? 'cash'), ['cash', 'bank_transfer'], true) ? ($data['payment_method'] ?? 'cash') : 'cash';
        $ref = trim((string)($data['transaction_ref'] ?? ''));
        $notes = trim((string)($data['notes'] ?? ''));

        if (!$invoiceId || !is_numeric($data['amount'] ?? null) || !is_finite($amount) || $amount <= 0) {
            $this->respond(['success' => false, 'message' => 'Vui lòng cung cấp mã hóa đơn và số tiền thanh toán hợp lệ.'], 422);
        }

        $pdo->beginTransaction();
        $stmt = $pdo->prepare("SELECT * FROM invoices WHERE id = ? LIMIT 1 FOR UPDATE");
        $stmt->execute([$invoiceId]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$invoice) {
            $this->respond(['success' => false, 'message' => 'Hóa đơn không tồn tại.'], 404);
        }

        if ($amount > (float)$invoice['remaining_amount']) {
            $pdo->rollBack();
            $this->respond(['success'=>false,'message'=>'Số tiền vượt công nợ.'],422);
        }
        $newPaid = (float)$invoice['paid_amount'] + $amount;
        $total = (float)$invoice['total_amount'];
        $newRemaining = max(0, $total - $newPaid);

        $newStatus = 'unpaid';
        if ($newRemaining <= 0) {
            $newStatus = 'paid';
        } elseif ($newPaid > 0) {
            $newStatus = 'partially_paid';
        }

        try {
            $payCode = 'TT-' . date('ymdHis') . '-' . bin2hex(random_bytes(4));
            $stmtPay = $pdo->prepare("
                INSERT INTO payments (payment_code, invoice_id, payment_date, amount, payment_method, transaction_ref, notes, created_by, created_at)
                VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, NOW())
            ");
            $stmtPay->execute([$payCode, $invoiceId, $amount, $method, $ref, $notes, $u['id']]);

            $stmtUpd = $pdo->prepare("UPDATE invoices SET paid_amount = ?, remaining_amount = ?, status = ?, updated_at = NOW() WHERE id = ?");
            $stmtUpd->execute([$newPaid, $newRemaining, $newStatus, $invoiceId]);

            $pdo->commit();

            // Notify tenant
            $paidFormatted = number_format($amount, 0, ',', '.') . ' đ';
            PushNotification::createAndSend(
                'Xác nhận thanh toán tiền phòng',
                "Chủ trọ đã xác nhận thanh toán {$paidFormatted} cho hóa đơn {$invoice['invoice_code']}. Trạng thái: " . ($newStatus === 'paid' ? 'Đã thanh toán đủ.' : 'Thanh toán một phần.'),
                'payment',
                (int)$invoice['tenant_id'],
                null,
                'invoice',
                $invoiceId,
                [
                    'invoice_id' => $invoiceId,
                    'paid_amount' => $amount,
                    'status' => $newStatus,
                    'type' => 'payment_received'
                ],
                $u['id']
            );

            $this->respond([
                'success' => true,
                'message' => 'Đã ghi nhận thanh toán thành công!',
                'new_status' => $newStatus,
                'remaining_amount' => $newRemaining
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            $this->respond(['success' => false, 'message' => 'Lỗi ghi nhận thanh toán: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Maintenance requests handling:
     * GET: list requests
     * POST: tenant creates request
     */
    public function maintenance(): void
    {
        $u = $this->authorize();
        $pdo = Database::getConnection();

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
            if ($u['role'] === 'admin') {
                $stmt = $pdo->query("
                    SELECT m.id, m.request_code, m.room_id, m.tenant_id, m.title, m.description,
                           m.priority, m.image_path, m.status, m.admin_notes, m.cost, m.created_at, m.updated_at,
                           t.fullname AS tenant_name, t.phone AS tenant_phone,
                           r.room_number, r.room_code
                    FROM maintenance_requests m
                    JOIN tenants t ON m.tenant_id = t.id
                    JOIN rooms r ON m.room_id = r.id
                    ORDER BY m.id DESC
                ");
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } else {
                $tid = $u['tenant_id'];
                if (!$tid) {
                    $this->respond(['success' => true, 'data' => []]);
                }
                $stmt = $pdo->prepare("
                    SELECT id, request_code, title, description, priority, image_path, status, admin_notes, cost, created_at, updated_at
                    FROM maintenance_requests
                    WHERE tenant_id = ?
                    ORDER BY id DESC
                ");
                $stmt->execute([$tid]);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }

            $this->respond(['success' => true, 'data' => $rows]);
        }

        // POST: Tenant submits a new request
        $data = $this->input();
        $title = trim((string)($data['title'] ?? ''));
        $desc = trim((string)($data['description'] ?? ''));

        if ($title === '' || $desc === '') {
            $this->respond(['success' => false, 'message' => 'Vui lòng nhập tiêu đề và mô tả sự cố.'], 422);
        }

        $tid = $u['tenant_id'];
        if (!$tid) {
            $this->respond(['success' => false, 'message' => 'Tài khoản chưa được liên kết với hồ sơ người thuê.'], 403);
        }

        $stmt = $pdo->prepare("
            SELECT c.room_id, r.room_number, r.room_code, t.fullname
            FROM contracts c
            JOIN rooms r ON c.room_id = r.id
            JOIN tenants t ON c.tenant_id = t.id
            WHERE c.tenant_id = ? AND c.status = 'active'
            ORDER BY c.id DESC
            LIMIT 1
        ");
        $stmt->execute([$tid]);
        $contract = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$contract) {
            $this->respond(['success' => false, 'message' => 'Bạn chưa có hợp đồng thuê phòng đang hoạt động.'], 403);
        }

        $priority = in_array(($data['priority'] ?? 'medium'), ['low', 'medium', 'high', 'urgent'], true) ? ($data['priority'] ?? 'medium') : 'medium';
        $code = 'YC-' . date('ymdHis') . '-' . random_int(10, 99);

        $stmt = $pdo->prepare("
            INSERT INTO maintenance_requests (request_code, room_id, tenant_id, title, description, priority, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
        ");
        $stmt->execute([$code, $contract['room_id'], $tid, $title, $desc, $priority]);
        $reqId = (int)$pdo->lastInsertId();

        $roomName = $contract['room_number'] ?: $contract['room_code'];
        $tenantName = $contract['fullname'] ?: $u['fullname'];

        // 1. Dispatch Push Notification to all admins
        PushNotification::createAndSend(
            "Sự cố mới cần tiếp nhận ({$roomName})",
            "Người thuê {$tenantName} vừa báo sự cố: {$title}",
            'maintenance',
            null,
            null,
            'maintenance',
            $reqId,
            [
                'request_id'   => $reqId,
                'request_code' => $code,
                'room_name'    => $roomName,
                'tenant_name'  => $tenantName,
                'priority'     => $priority,
                'type'         => 'maintenance_created'
            ],
            $u['id']
        );

        // 2. Emit Realtime event to Socket.IO admin room
        $realtimePayload = [
            'id'           => $reqId,
            'request_code' => $code,
            'room_id'      => (int)$contract['room_id'],
            'room_name'    => $roomName,
            'tenant_id'    => (int)$tid,
            'tenant_name'  => $tenantName,
            'title'        => $title,
            'description'  => $desc,
            'priority'     => $priority,
            'status'       => 'pending',
            'created_at'   => date('Y-m-d H:i:s')
        ];
        RealtimeEmitter::emit('incident:created', $realtimePayload, 'admin');

        $this->respond([
            'success'      => true,
            'message'      => 'Đã gửi yêu cầu sửa chữa tới chủ trọ thành công!',
            'id'           => $reqId,
            'request_code' => $code
        ], 201);
    }

    /**
     * Update maintenance status (Admin only)
     * POST /api/maintenance/update or POST /api/maintenance/{id}/status
     */
    public function updateMaintenanceStatus(int|string|null $id = null): void
    {
        $u = $this->authorize('admin');
        $data = $this->input();
        $pdo = Database::getConnection();

        $reqId = (int)($id ?: ($data['id'] ?? $data['request_id'] ?? 0));
        if (!$reqId) {
            $this->respond(['success' => false, 'message' => 'Thiếu ID yêu cầu bảo trì.'], 422);
        }

        $stmt = $pdo->prepare("
            SELECT m.*, t.user_id AS tenant_user_id, t.fullname AS tenant_name, r.room_number, r.room_code
            FROM maintenance_requests m
            JOIN tenants t ON m.tenant_id = t.id
            JOIN rooms r ON m.room_id = r.id
            WHERE m.id = ?
            LIMIT 1
        ");
        $stmt->execute([$reqId]);
        $req = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$req) {
            $this->respond(['success' => false, 'message' => 'Không tìm thấy yêu cầu sửa chữa.'], 404);
        }

        $status = in_array(($data['status'] ?? ''), ['pending', 'in_progress', 'completed', 'rejected'], true)
            ? $data['status']
            : $req['status'];

        $adminNotes = isset($data['admin_notes']) ? trim((string)$data['admin_notes']) : $req['admin_notes'];
        $cost = isset($data['cost']) ? (float)$data['cost'] : (float)$req['cost'];

        $stmtUpd = $pdo->prepare("
            UPDATE maintenance_requests 
            SET status = ?, admin_notes = ?, cost = ?, updated_at = NOW() 
            WHERE id = ?
        ");
        $stmtUpd->execute([$status, $adminNotes, $cost, $reqId]);

        $statusLabels = [
            'pending'     => 'Chờ xử lý',
            'in_progress' => 'Đang xử lý',
            'completed'   => 'Đã hoàn thành',
            'rejected'    => 'Từ chối'
        ];
        $statusText = $statusLabels[$status] ?? $status;

        // 1. Dispatch Push Notification to tenant
        $title = "Cập nhật sự cố: {$req['title']}";
        $content = "Sự cố {$req['request_code']} của bạn đã được chuyển sang trạng thái: {$statusText}." . ($adminNotes ? " Ghi chú: {$adminNotes}" : "");

        PushNotification::createAndSend(
            $title,
            $content,
            'maintenance',
            (int)$req['tenant_id'],
            $req['tenant_user_id'] ? (int)$req['tenant_user_id'] : null,
            'maintenance',
            $reqId,
            [
                'request_id'   => $reqId,
                'request_code' => $req['request_code'],
                'status'       => $status,
                'status_text'  => $statusText,
                'admin_notes'  => $adminNotes,
                'type'         => 'maintenance_update'
            ],
            $u['id']
        );

        // 2. Dispatch Realtime event to tenant and admin rooms
        $realtimePayload = [
            'id'           => $reqId,
            'request_code' => $req['request_code'],
            'title'        => $req['title'],
            'status'       => $status,
            'status_text'  => $statusText,
            'admin_notes'  => $adminNotes,
            'cost'         => $cost,
            'updated_at'   => date('Y-m-d H:i:s')
        ];

        if (!empty($req['tenant_user_id'])) {
            RealtimeEmitter::emit('incident:status:changed', $realtimePayload, "user_{$req['tenant_user_id']}");
        }
        RealtimeEmitter::emit('incident:status:changed', $realtimePayload, 'admin');

        $this->respond([
            'success'     => true,
            'message'     => "Đã cập nhật trạng thái sự cố thành: {$statusText}",
            'status'      => $status,
            'status_text' => $statusText
        ]);
    }

    /**
     * Save push notification token
     * POST /api/push-token
     */
    public function savePushToken(): void
    {
        $u = $this->authorize();
        $data = $this->input();

        $token = trim((string)($data['token'] ?? ''));
        $deviceType = trim((string)($data['device_type'] ?? 'mobile'));
        $deviceId = trim((string)($data['device_id'] ?? '')) ?: null;

        if (!PushNotification::isValidToken($token)) {
            $this->respond(['success' => false, 'message' => 'Expo push token không hợp lệ.'], 422);
        }

        $ok = PushNotification::saveToken($u['id'], $token, $deviceType, $deviceId);

        if ($ok) {
            $this->respond([
                'success' => true,
                'message' => 'Đã đăng ký push token thành công cho tài khoản #' . $u['id']
            ]);
        } else {
            $this->respond(['success' => false, 'message' => 'Không thể lưu push token.'], 500);
        }
    }

    /**
     * Remove push token on logout
     * POST /api/push-token/remove
     */
    public function removePushToken(): void
    {
        $u = $this->authorize();
        $data = $this->input();
        $token = trim((string)($data['token'] ?? ''));

        if ($token === '') {
            $this->respond(['success' => true]);
        }

        PushNotification::removeToken($token, (int)$u['id']);
        $this->respond(['success' => true, 'message' => 'Đã hủy đăng ký token thiết bị.']);
    }

    /**
     * Notifications history
     * GET /api/notifications
     */
    public function notifications(): void
    {
        $u = $this->authorize();
        $pdo = Database::getConnection();

        $inbox = new NotificationInbox($pdo);
        $items = $inbox->items($u);
        foreach ($items as &$item) {
            if (!empty($item['data_payload'])) {
                $item['data'] = json_decode($item['data_payload'], true);
            }
        }
        unset($item);
        $unreadCount = $inbox->unreadCount($u);

        $this->respond([
            'success'      => true,
            'unread_count' => $unreadCount,
            'data'         => $items
        ]);
    }

    /**
     * Mark a single notification as read
     * POST /api/notifications/read/{id}
     */
    public function markNotificationRead(int|string|null $id = null): void
    {
        $u = $this->authorize();
        $notifId = (int)$id;
        if (!$notifId) {
            $data = $this->input();
            $notifId = (int)($data['id'] ?? 0);
        }

        if (!$notifId) {
            $this->respond(['success' => false, 'message' => 'Thiếu ID thông báo.'], 422);
        }

        $pdo = Database::getConnection();
        if (!(new NotificationInbox($pdo))->markRead($u, $notifId)) {
            $this->respond(['success' => false, 'message' => 'Không tìm thấy thông báo.'], 404);
        }

        $this->respond(['success' => true, 'message' => 'Đã đánh dấu thông báo là đã đọc.']);
    }

    /**
     * Mark all notifications as read
     * POST /api/notifications/read-all
     */
    public function markAllNotificationsRead(): void
    {
        $u = $this->authorize();
        $pdo = Database::getConnection();
        (new NotificationInbox($pdo))->markAllRead($u);

        $this->respond(['success' => true, 'message' => 'Đã đánh dấu tất cả thông báo là đã đọc.']);
    }

    /**
     * Trigger payment reminder job manually
     * POST /api/reminders/run
     */
    public function runReminders(): void
    {
        $u = $this->authorize('admin');
        $scriptPath = __DIR__ . '/../../scripts/send_payment_reminders.php';

        ob_start();
        include $scriptPath;
        $output = ob_get_clean();

        $this->respond([
            'success' => true,
            'message' => 'Đã chạy tiến trình quét và nhắc hạn đóng tiền.',
            'log'     => $output
        ]);
    }

    /**
     * Unread notifications count
     * GET /api/notifications/unread-count
     */
    public function unreadCount(): void
    {
        $u = $this->authorize();
        $pdo = Database::getConnection();
        $count = (new NotificationInbox($pdo))->unreadCount($u);
        $this->respond(['success' => true, 'unread_count' => $count]);
    }

    /**
     * Get user notification preferences
     * GET /api/notifications/preferences
     */
    public function getNotificationPreferences(): void
    {
        $u = $this->authorize();
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT category, is_enabled FROM notification_preferences WHERE user_id = ?");
        $stmt->execute([$u['id']]);
        $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

        $defaultPrefs = [
            'invoice'     => 1,
            'payment'     => 1,
            'maintenance' => 1,
            'reminder'    => 1
        ];

        $merged = array_merge($defaultPrefs, $rows ?: []);

        $this->respond([
            'success' => true,
            'preferences' => $merged
        ]);
    }

    /**
     * Save user notification preference
     * POST /api/notifications/preferences
     */
    public function saveNotificationPreferences(): void
    {
        $u = $this->authorize();
        $data = $this->input();
        $pdo = Database::getConnection();

        $category = trim((string)($data['category'] ?? ''));
        $isEnabled = !empty($data['is_enabled']) ? 1 : 0;

        if (!in_array($category, ['invoice','payment','maintenance','reminder'], true)) {
            $this->respond(['success' => false, 'message' => 'Thiếu danh mục thông báo.'], 422);
        }

        $stmt = $pdo->prepare("
            INSERT INTO notification_preferences (user_id, category, is_enabled, updated_at)
            VALUES (?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled), updated_at = NOW()
        ");
        $stmt->execute([$u['id'], $category, $isEnabled]);

        $this->respond(['success' => true, 'message' => 'Đã lưu tùy chọn thông báo.']);
    }

    /**
     * Create room (Admin only)
     * POST /api/rooms
     */
    public function createRoom(): void
    {
        $u = $this->authorize('admin');
        $data = $this->input();
        $pdo = Database::getConnection();

        $areaId = (int)($data['area_id'] ?? 1);
        $roomNumber = trim((string)($data['room_number'] ?? $data['room_code'] ?? ''));
        $roomCode = trim((string)($data['room_code'] ?? $roomNumber));
        $price = (float)($data['price'] ?? 0);
        $areaSize = (float)($data['area_size'] ?? 20);
        $deposit = (float)($data['deposit'] ?? $price);
        $maxOccupants = (int)($data['max_occupants'] ?? 2);
        $description = trim((string)($data['description'] ?? ''));

        if ($roomNumber === '' || $price <= 0) {
            $this->respond(['success' => false, 'message' => 'Số phòng và giá thuê không được để trống.'], 422);
        }

        $stmt = $pdo->prepare("
            INSERT INTO rooms (area_id, room_code, room_number, area_size, price, deposit, max_occupants, status, description, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'empty', ?, NOW())
        ");
        $stmt->execute([$areaId, $roomCode, $roomNumber, $areaSize, $price, $deposit, $maxOccupants, $description]);
        $id = (int)$pdo->lastInsertId();

        $this->respond([
            'success' => true,
            'message' => 'Tạo phòng trọ mới thành công!',
            'room_id' => $id
        ], 201);
    }

    /**
     * Update room (Admin only)
     * POST /api/rooms/update/{id} or PUT /api/rooms/{id}
     */
    public function updateRoom(int|string|null $id = null): void
    {
        $u = $this->authorize('admin');
        $roomId = (int)$id;
        $data = $this->input();
        if (!$roomId) {
            $roomId = (int)($data['id'] ?? 0);
        }

        if (!$roomId) {
            $this->respond(['success' => false, 'message' => 'Thiếu ID phòng trọ.'], 422);
        }

        $pdo = Database::getConnection();
        $stmtCheck = $pdo->prepare("SELECT * FROM rooms WHERE id = ? LIMIT 1");
        $stmtCheck->execute([$roomId]);
        $room = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$room) {
            $this->respond(['success' => false, 'message' => 'Phòng trọ không tồn tại.'], 404);
        }

        $areaId=(int)($data['area_id']??$room['area_id']);
        $roomCode=trim((string)($data['room_code']??$room['room_code']));
        $roomNumber = trim((string)($data['room_number'] ?? $room['room_number']));
        $price = isset($data['price']) ? (float)$data['price'] : (float)$room['price'];
        $areaSize = isset($data['area_size']) ? (float)$data['area_size'] : (float)$room['area_size'];
        $status = in_array(($data['status'] ?? ''), ['empty', 'rented', 'maintenance'], true) ? $data['status'] : $room['status'];
        $description = isset($data['description']) ? trim((string)$data['description']) : $room['description'];

        if ($roomCode === '' || $areaId<=0 || $roomNumber === '' || !is_finite($price) || $price<=0 || !is_finite($areaSize) || $areaSize<=0) {
            $this->respond(['success'=>false,'message'=>'Tên, giá hoặc diện tích phòng không hợp lệ.'],422);
        }
        $active=$pdo->prepare("SELECT id FROM contracts WHERE room_id=? AND status='active' LIMIT 1");$active->execute([$roomId]);
        if ($active->fetchColumn() && $status !== 'rented') {
            $this->respond(['success'=>false,'message'=>'Kết thúc hợp đồng trước khi đổi trạng thái phòng đang thuê.'],409);
        }
        $stmt = $pdo->prepare("
            UPDATE rooms 
            SET area_id = ?, room_code = ?, room_number = ?, price = ?, area_size = ?, status = ?, description = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$areaId, $roomCode, $roomNumber, $price, $areaSize, $status, $description, $roomId]);

        $this->respond([
            'success' => true,
            'message' => 'Cập nhật phòng trọ thành công!'
        ]);
    }

    /**
     * Delete room (Admin only)
     * POST /api/rooms/delete/{id} or DELETE /api/rooms/{id}
     */
    public function deleteRoom(int|string|null $id = null): void
    {
        $u = $this->authorize('admin');
        $roomId = (int)$id;
        if (!$roomId) {
            $data = $this->input();
            $roomId = (int)($data['id'] ?? 0);
        }

        if (!$roomId) {
            $this->respond(['success' => false, 'message' => 'Thiếu ID phòng.'], 422);
        }

        $pdo = Database::getConnection();
        // Check active contracts
        $stmtContract = $pdo->prepare("SELECT COUNT(*) FROM contracts WHERE room_id = ? AND status = 'active'");
        $stmtContract->execute([$roomId]);
        if ((int)$stmtContract->fetchColumn() > 0) {
            $this->respond(['success' => false, 'message' => 'Không thể xóa phòng đang có hợp đồng thuê hoạt động.'], 400);
        }

        $stmt = $pdo->prepare("DELETE FROM rooms WHERE id = ?");
        $stmt->execute([$roomId]);

        $this->respond(['success' => true, 'message' => 'Đã xóa phòng trọ thành công!']);
    }

    /**
     * List tenants (Admin only)
     * GET /api/tenants
     */
    public function tenants(): void
    {
        $u = $this->authorize('admin');
        $pdo = Database::getConnection();

        $stmt = $pdo->query("
            SELECT t.id, t.user_id, t.fullname, t.phone, t.email, t.dob, t.id_card, t.address,
                   c.contract_code, c.room_id, r.room_number, r.room_code
            FROM tenants t
            LEFT JOIN contracts c ON c.tenant_id = t.id AND c.status = 'active'
            LEFT JOIN rooms r ON c.room_id = r.id
            ORDER BY t.id DESC
        ");
        $tenants = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $this->respond(['success' => true, 'data' => $tenants]);
    }
    public function session(): void
    {
        $this->respond(['success' => true, 'user' => $this->authorize()]);
    }

    public function invoiceDetail(int|string $id): void
    {
        $u = $this->authorize();
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM invoices WHERE id = ?' . ($u['role'] === 'admin' ? '' : ' AND tenant_id = ?'));
        $stmt->execute($u['role'] === 'admin' ? [(int)$id] : [(int)$id, $u['tenant_id']]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$invoice) $this->respond(['success' => false, 'message' => 'Không tìm thấy hóa đơn.'], 404);
        $stmt = $pdo->prepare('SELECT item_name,quantity,unit,unit_price,amount FROM invoice_details WHERE invoice_id = ?');
        $stmt->execute([(int)$id]);
        $invoice['details'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if ((float)$invoice['remaining_amount'] > 0) {
            $invoice['vietqr_url'] = get_vietqr_url(get_setting('bank_account_number', ''), get_setting('bank_account_name', ''), (float)$invoice['remaining_amount'], $invoice['invoice_code'], get_setting('bank_name', ''));
        }
        $this->respond(['success' => true, 'data' => $invoice]);
    }

    public function maintenanceDetail(int|string $id): void
    {
        $u = $this->authorize();
        $stmt = Database::getConnection()->prepare('SELECT * FROM maintenance_requests WHERE id = ?' . ($u['role'] === 'admin' ? '' : ' AND tenant_id = ?'));
        $stmt->execute($u['role'] === 'admin' ? [(int)$id] : [(int)$id, $u['tenant_id']]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$record) $this->respond(['success' => false, 'message' => 'Không tìm thấy sự cố.'], 404);
        $this->respond(['success' => true, 'data' => $record]);
    }

    public function manage(string $resource, int|string|null $id = null): void
    {
        $u = $this->authorize('admin');
        try {
            $data = (new \App\Helpers\ManagementService(Database::getConnection()))->execute($resource, $_SERVER['REQUEST_METHOD'], (int)$id, $this->input(), (int)$u['id']);
            $this->respond(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            $this->respond(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\PDOException $e) {
            $this->respond(['success' => false, 'message' => 'Dữ liệu trùng hoặc đang được sử dụng. Không thể lưu/xóa.'], 409);
        }
    }
}
