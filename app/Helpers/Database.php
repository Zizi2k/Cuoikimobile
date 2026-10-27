<?php

namespace App\Helpers;

use PDO;
use PDOException;
use Exception;

class Database
{
    private static ?PDO $instance = null;

    /**
     * Lấy thể hiện kết nối PDO (Singleton Pattern)
     */
    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $config = require __DIR__ . '/../../config/database.php';
            $dsn = sprintf(
                "%s:host=%s;port=%s;dbname=%s;charset=%s",
                $config['driver'],
                $config['host'],
                $config['port'],
                $config['database'],
                $config['charset']
            );

            try {
                self::$instance = new PDO(
                    $dsn,
                    $config['username'],
                    $config['password'],
                    $config['options']
                );
            } catch (PDOException $e) {
                // Ghi log lỗi kết nối an toàn không lộ thông tin mật khẩu
                $logDir = __DIR__ . '/../../storage/logs';
                if (!is_dir($logDir)) {
                    @mkdir($logDir, 0777, true);
                }
                @file_put_contents(
                    $logDir . '/database_errors.log',
                    "[" . date('Y-m-d H:i:s') . "] Lỗi kết nối CSDL: " . $e->getMessage() . PHP_EOL,
                    FILE_APPEND
                );
                throw new \RuntimeException('Không kết nối được cơ sở dữ liệu.', 0, $e);
            }
        }

        return self::$instance;
    }

    /**
     * Bắt đầu một Transaction
     */
    public static function beginTransaction(): bool
    {
        return self::getConnection()->beginTransaction();
    }

    /**
     * Xác nhận Transaction
     */
    public static function commit(): bool
    {
        return self::getConnection()->commit();
    }

    /**
     * Hủy bỏ Transaction khi có lỗi
     */
    public static function rollBack(): bool
    {
        if (self::getConnection()->inTransaction()) {
            return self::getConnection()->rollBack();
        }
        return false;
    }
}
