<?php
namespace App\Controllers;

use App\Helpers\Database;
use App\Core\Controller;
use App\Middleware\AuthMiddleware;
use App\Models\User;

class AuthController extends Controller
{
    public function showLogin(): void
    {
        if (is_logged_in()) {
            redirect(is_admin() ? '/dashboard' : '/tenant/dashboard');
        }
        view('auth.login', [], 'none');
    }

    public function login(): void
    {
        if (!verify_csrf_token()) {
            set_flash('danger', 'Phiên đăng nhập không hợp lệ. Vui lòng thử lại.');
            redirect('/login');
        }

        $username = trim($_POST['username'] ?? $_POST['phone'] ?? $_POST['email'] ?? '');
        $password = (string)($_POST['password'] ?? '');
        if ($username === '' || $password === '') {
            set_flash('danger', 'Vui lòng nhập tên đăng nhập (hoặc số điện thoại) và mật khẩu.');
            redirect('/login');
        }

        $cleanPhone = preg_replace('/[^0-9]/', '', $username);

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare(
                "SELECT u.id, u.username, u.password, u.role, u.fullname, u.email, u.phone, u.status,
                        t.id AS tenant_id, t.id_card AS tenant_id_card
                 FROM users u
                 LEFT JOIN tenants t ON t.user_id = u.id
                 WHERE u.username = ?
                    OR u.email = ?
                    OR u.phone = ?
                    OR (CHAR_LENGTH(?) >= 9 AND u.phone = ?)
                    OR (CHAR_LENGTH(?) >= 9 AND t.phone = ?)
                 ORDER BY (u.username = ?) DESC, (u.email = ?) DESC, (u.phone = ?) DESC, u.id ASC
                 LIMIT 1"
            );
            $stmt->execute([
                $username,
                $username,
                $username,
                $cleanPhone,
                $cleanPhone,
                $cleanPhone,
                $cleanPhone,
                $username,
                $username,
                $username
            ]);
            $user = $stmt->fetch();

            $passwordValid = $user && password_verify($password, (string)$user['password']);

            if (!$user || !$passwordValid || (int)$user['status'] !== 1) {
                set_flash('danger', 'Thông tin đăng nhập không đúng hoặc tài khoản đã bị khóa.');
                redirect('/login');
            }

            session_regenerate_id(true);
            $_SESSION['user'] = [
                'id' => (int)$user['id'],
                'username' => $user['username'],
                'name' => $user['fullname'],
                'fullname' => $user['fullname'],
                'email' => $user['email'],
                'phone' => $user['phone'],
                'role' => $user['role'],
            ];
            unset($_SESSION['tenant_id']);
            if ($user['role'] === 'tenant') {
                $tenantId = $user['tenant_id'];
                if (!$tenantId) {
                    $tenantStmt = $pdo->prepare('SELECT id FROM tenants WHERE user_id = ? LIMIT 1');
                    $tenantStmt->execute([$user['id']]);
                    $tenantId = $tenantStmt->fetchColumn();
                }
                if ($tenantId) {
                    $_SESSION['tenant_id'] = (int)$tenantId;
                }
            }
            set_flash('success', 'Đăng nhập thành công! Chào mừng ' . htmlspecialchars($user['fullname']) . '.');
            redirect($user['role'] === 'admin' ? '/dashboard' : '/tenant/dashboard');
        } catch (\Throwable $e) {
            error_log('Login error: ' . $e->getMessage());
            set_flash('danger', 'Không thể đăng nhập lúc này. Vui lòng kiểm tra cấu hình cơ sở dữ liệu.');
            redirect('/login');
        }
    }

    public function logout(): void
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        session_start();
        set_flash('info', 'Bạn đã đăng xuất.');
        redirect('/login');
    }

    public function showProfile(): void
    {
        AuthMiddleware::requireLogin();
        $user = auth_user();
        view('auth.profile', ['user' => $user], is_admin() ? 'admin' : 'tenant');
    }

    public function updateProfile(): void
    {
        if (!verify_csrf_token()) {
            set_flash('danger', 'Token CSRF không hợp lệ.');
            redirect('/profile');
        }
        AuthMiddleware::requireLogin();
        $user = auth_user();
        $fullname = trim($_POST['fullname'] ?? $_POST['name'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $phone = trim($_POST['phone'] ?? '');
        if ($fullname === '' || $email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            set_flash('danger', 'Vui lòng nhập họ tên và email hợp lệ.');
            redirect('/profile');
        }
        try {
            $pdo = Database::getConnection();
            $check = $pdo->prepare('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1');
            $check->execute([$email, $user['id']]);
            if ($check->fetch()) {
                set_flash('danger', 'Email đã được sử dụng bởi tài khoản khác.');
                redirect('/profile');
            }
            $stmt = $pdo->prepare('UPDATE users SET fullname = ?, email = ?, phone = ? WHERE id = ?');
            $stmt->execute([$fullname, $email, $phone, $user['id']]);
            $_SESSION['user']['name'] = $fullname;
            $_SESSION['user']['fullname'] = $fullname;
            $_SESSION['user']['email'] = $email;
            $_SESSION['user']['phone'] = $phone;
            set_flash('success', 'Cập nhật thông tin thành công.');
        } catch (\Throwable $e) {
            error_log('Profile update error: ' . $e->getMessage());
            set_flash('danger', 'Không thể cập nhật hồ sơ. Email có thể đã tồn tại.');
        }
        redirect('/profile');
    }

    public function changePassword(): void
    {
        if (!verify_csrf_token()) {
            set_flash('danger', 'Token CSRF không hợp lệ.');
            redirect('/profile');
        }
        AuthMiddleware::requireLogin();
        $user = auth_user();
        $current = (string)($_POST['current_password'] ?? '');
        $new = (string)($_POST['new_password'] ?? '');
        $confirm = (string)($_POST['confirm_password'] ?? '');
        if (strlen($new) < 8 || $new !== $confirm) {
            set_flash('danger', 'Mật khẩu mới phải có ít nhất 8 ký tự và hai lần nhập phải trùng nhau.');
            redirect('/profile');
        }
        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare('SELECT password FROM users WHERE id = ?');
            $stmt->execute([$user['id']]);
            $hash = $stmt->fetchColumn();
            if (!$hash || !password_verify($current, $hash)) {
                set_flash('danger', 'Mật khẩu hiện tại không đúng.');
                redirect('/profile');
            }
            $update = $pdo->prepare('UPDATE users SET password = ? WHERE id = ?');
            $update->execute([password_hash($new, PASSWORD_DEFAULT), $user['id']]);
            set_flash('success', 'Đổi mật khẩu thành công.');
        } catch (\Throwable $e) {
            error_log('Password change error: ' . $e->getMessage());
            set_flash('danger', 'Không thể đổi mật khẩu lúc này.');
        }
        redirect('/profile');
    }
}
