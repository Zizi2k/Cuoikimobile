<?php

namespace App\Core;

class App
{
    private Router $router;

    public function __construct()
    {
        $this->bootstrap();
        $this->router = new Router();
    }

    /**
     * Khởi tạo môi trường ứng dụng
     */
    private function bootstrap(): void
    {
        $appConfig = require __DIR__ . '/../../config/app.php';

        // Thiết lập múi giờ Việt Nam
        date_default_timezone_set($appConfig['timezone'] ?? 'Asia/Ho_Chi_Minh');

        // Khởi tạo Session an toàn
        if (session_status() === PHP_SESSION_NONE) {
            ini_set('session.cookie_httponly', '1');
            ini_set('session.use_only_cookies', '1');
            session_start();
        }

        // Tự động load helper functions
        require_once __DIR__ . '/../Helpers/helpers.php';
    }

    /**
     * Nạp các route và khởi chạy
     */
    public function run(): void
    {
        // Nạp file định tuyến routes
        $router = $this->router;
        require __DIR__ . '/../../routes/web.php';

        // Điều phối request
        try {
            $this->router->dispatch();
        } catch (\Throwable $e) {
            error_log('Request error: '.$e->getMessage());
            http_response_code($e instanceof \PDOException && $e->getCode()==='23000' ? 409 : 500);
            if (str_starts_with($this->router->getCurrentRoute(), '/api/')) {
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode(['success'=>false,'message'=>'Lỗi máy chủ. Kiểm tra cấu hình hoặc migration database.'],JSON_UNESCAPED_UNICODE);
            } else { echo 'Không thể xử lý yêu cầu. Vui lòng thử lại sau.'; }
        }
    }
}
