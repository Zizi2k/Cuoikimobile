<?php

namespace App\Models;

use App\Core\Model;
use PDO;

class Notification extends Model
{
    protected string $table = 'notifications';

    /**
     * Lấy tất cả thông báo cho Admin quản lý
     */
    public function allForAdmin(): array
    {
        $sql = "
            SELECT n.*, t.fullname AS target_tenant_name, u.fullname AS created_by_name
            FROM notifications n
            LEFT JOIN tenants t ON n.target_tenant_id = t.id
            LEFT JOIN users u ON n.created_by = u.id
            ORDER BY n.id DESC
        ";
        return $this->db->query($sql)->fetchAll();
    }

    /**
     * Lấy danh sách thông báo dành cho Người thuê cụ thể (thông báo chung hoặc gửi riêng người đó)
     */
    public function allForTenant(int $tenantId): array
    {
        $stmt = $this->db->prepare('SELECT user_id FROM tenants WHERE id = ?');
        $stmt->execute([$tenantId]);
        $userId = $stmt->fetchColumn();
        if (!$userId) return [];
        return (new \App\Helpers\NotificationInbox($this->db))->items([
            'id' => (int)$userId, 'role' => 'tenant', 'tenant_id' => $tenantId
        ], 100);
    }
}
