<?php
namespace App\Helpers;

use PDO;

/** One visibility policy and one receipt per user, including broadcast notifications. */
class NotificationInbox
{
    public function __construct(private PDO $db) {}

    private function scope(array $user): array
    {
        $uid = (int)$user['id'];
        $tid = $user['role'] === 'tenant' ? ($user['tenant_id'] ?? null) : null;
        // Incident reports without a recipient are operational notices for admins only.
        $broadcast = '(n.target_user_id IS NULL AND n.target_tenant_id IS NULL)';
        if ($user['role'] !== 'admin') {
            $broadcast .= " AND NOT (n.type = 'maintenance' AND COALESCE(n.reference_type, '') = 'maintenance')";
        }
        return [
            "(n.target_user_id = ? OR (n.target_user_id IS NULL AND n.target_tenant_id = ?) OR ($broadcast))",
            [$uid, $tid]
        ];
    }

    public function items(array $user, int $limit = 50): array
    {
        [$scope, $params] = $this->scope($user);
        $limit = max(1, min(100, $limit));
        $stmt = $this->db->prepare("SELECT n.id, n.title, n.content, n.type,
            CASE WHEN nr.user_id IS NULL THEN 0 ELSE 1 END AS is_read,
            n.reference_type, n.reference_id, n.data_payload, n.created_at
            FROM notifications n
            LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
            WHERE $scope ORDER BY n.id DESC LIMIT $limit");
        $stmt->execute([(int)$user['id'], ...$params]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($items as &$item) $item['is_read'] = (int)$item['is_read'];
        return $items;
    }

    public function unreadCount(array $user): int
    {
        [$scope, $params] = $this->scope($user);
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM notifications n
            LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
            WHERE $scope AND nr.user_id IS NULL");
        $stmt->execute([(int)$user['id'], ...$params]);
        return (int)$stmt->fetchColumn();
    }

    public function markRead(array $user, int $id): bool
    {
        [$scope, $params] = $this->scope($user);
        $stmt = $this->db->prepare("SELECT n.id FROM notifications n WHERE n.id = ? AND $scope");
        $stmt->execute([$id, ...$params]);
        if (!$stmt->fetchColumn()) return false;
        $stmt = $this->db->prepare('INSERT IGNORE INTO notification_reads (notification_id, user_id) VALUES (?, ?)');
        $stmt->execute([$id, (int)$user['id']]);
        return true;
    }

    public function markAllRead(array $user): void
    {
        [$scope, $params] = $this->scope($user);
        $stmt = $this->db->prepare("INSERT IGNORE INTO notification_reads (notification_id, user_id)
            SELECT n.id, ? FROM notifications n WHERE $scope");
        $stmt->execute([(int)$user['id'], ...$params]);
    }
}
