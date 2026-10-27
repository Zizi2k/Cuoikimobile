<?php

namespace App\Helpers;

use PDO;
use Throwable;
require_once __DIR__.'/RealtimeEmitter.php';

/**
 * Helper to handle Push Notifications (Expo Push Service) and notification history.
 */
class PushNotification
{
    public static function isValidToken(string $token): bool
    {
        return (bool)preg_match('/^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/D', $token)
            && !str_contains($token, 'SimDevice_');
    }

    private const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

    /**
     * Save or update an Expo Push Token for a user device.
     */
    public static function saveToken(int $userId, string $token, string $deviceType = 'mobile', ?string $deviceId = null): bool
    {
        $token = trim($token);
        if (!self::isValidToken($token) || $userId <= 0) {
            return false;
        }

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("
                INSERT INTO `push_tokens` (`user_id`, `token`, `device_type`, `device_id`, `updated_at`)
                VALUES (?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                    `user_id` = VALUES(`user_id`),
                    `device_type` = VALUES(`device_type`),
                    `device_id` = VALUES(`device_id`),
                    `updated_at` = NOW()
            ");
            return $stmt->execute([$userId, $token, $deviceType, $deviceId]);
        } catch (Throwable $e) {
            error_log('PushNotification::saveToken error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Remove a push token on logout or when revoked.
     */
    public static function removeToken(string $token, int $userId): bool
    {
        $token = trim($token);
        if ($token === '') {
            return false;
        }

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("DELETE FROM `push_tokens` WHERE `token` = ? AND `user_id` = ?");
            return $stmt->execute([$token, $userId]);
        } catch (Throwable $e) {
            error_log('PushNotification::removeToken error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Send remote push notifications via Expo Push Service.
     */
    public static function sendExpoPush(array $tokens, string $title, string $body, array $data = []): array
    {
        $validTokens = array_filter(array_unique($tokens), function ($t) {
            return is_string($t) && self::isValidToken($t);
        });

        if (empty($validTokens)) {
            return ['success' => false, 'message' => 'No valid push tokens provided.'];
        }

        if (count($validTokens)>100) {
            $results=[];
            foreach(array_chunk($validTokens,100) as $chunk) $results[]=self::sendExpoPush($chunk,$title,$body,$data);
            return ['success'=>!in_array(false,array_column($results,'success'),true),'batches'=>$results];
        }
        $messages = [];
        foreach ($validTokens as $token) {
            $messages[] = [
                'to'       => $token,
                'sound'    => 'default',
                'title'    => $title,
                'body'     => $body,
                'data'     => $data,
                'priority' => 'high',
                'channelId' => 'default'
            ];
        }

        $result = self::request(self::endpoint(), $messages);
        $tickets = $result['data'] ?? [];
        $success = false;
        foreach (array_values($validTokens) as $index => $token) {
            $ticket = $tickets[$index] ?? ['status'=>'error','message'=>'Không nhận được Expo ticket.'];
            $ok = ($ticket['status'] ?? '') === 'ok';
            $success = $success || $ok;
            try {
                $pdo=Database::getConnection();
                $q=$pdo->prepare('INSERT INTO push_deliveries (notification_id,token_hash,expo_ticket_id,status,message) VALUES (?,?,?,?,?)');
                $q->execute([$data['notification_id']??null,hash('sha256',$token),$ticket['id']??null,$ok?'accepted':'error',substr($ticket['message']??'',0,255)]);
                if (($ticket['details']['error']??'')==='DeviceNotRegistered') {
                    $pdo->prepare('DELETE FROM push_tokens WHERE token=?')->execute([$token]);
                }
            } catch(Throwable $e) { error_log('Push delivery log: '.$e->getMessage()); }
        }
        return ['success'=>$success,'tickets'=>$tickets];
    }

    public static function endpoint(bool $receipts=false): string
    {
        // Only test runs can replace the provider with a local capture server.
        if (getenv('APP_ENV')==='test' && getenv('QLPT_TEST_PUSH_URL')) return getenv('QLPT_TEST_PUSH_URL').($receipts?'/receipts':'/send');
        return $receipts?'https://exp.host/--/api/v2/push/getReceipts':self::EXPO_PUSH_URL;
    }

    public static function request(string $url, array $body): array
    {
        $headers=['Content-Type: application/json','Accept: application/json'];
        if (getenv('EXPO_ACCESS_TOKEN')) $headers[]='Authorization: Bearer '.getenv('EXPO_ACCESS_TOKEN');
        if (function_exists('curl_init')) {
            $ch=curl_init($url);
            curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>json_encode($body),CURLOPT_RETURNTRANSFER=>true,CURLOPT_HTTPHEADER=>$headers,CURLOPT_ENCODING=>'',CURLOPT_TIMEOUT=>8]);
            $raw=curl_exec($ch);$status=curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
            if ($status<200 || $status>=300) return [];
        } else {
            $context=stream_context_create(['http'=>['method'=>'POST','header'=>implode("\r\n",$headers),'content'=>json_encode($body),'timeout'=>8]]);
            $raw=@file_get_contents($url,false,$context);
        }
        return json_decode($raw?:'{}',true)?:[];
    }

    private static function category(array $data): string
    {
        return match($data['type']??'') {
            'new_invoice'=>'invoice', 'payment_received'=>'payment',
            'payment_reminder'=>'reminder', 'maintenance_created','maintenance_update'=>'maintenance',
            default => ($data['reference_type']??'')==='maintenance'?'maintenance':'payment'
        };
    }

    /**
     * Send push notification to a specific user ID.
     */
    public static function sendToUser(int $userId, string $title, string $body, array $data = []): array
    {
        try {
            $pdo = Database::getConnection();
            $preference=$pdo->prepare('SELECT is_enabled FROM notification_preferences WHERE user_id=? AND category=?');
            $preference->execute([$userId,self::category($data)]);
            if ($preference->fetchColumn() === 0) return ['success'=>true,'skipped'=>'disabled'];
            $stmt = $pdo->prepare("SELECT pt.token FROM push_tokens pt JOIN users u ON u.id=pt.user_id WHERE pt.user_id=? AND u.status=1 AND pt.is_active=1");
            $stmt->execute([$userId]);
            $tokens = $stmt->fetchAll(PDO::FETCH_COLUMN);

            if (empty($tokens)) {
                return ['success' => false, 'message' => "No push tokens registered for user #{$userId}."];
            }

            return self::sendExpoPush($tokens, $title, $body, $data);
        } catch (Throwable $e) {
            error_log('PushNotification::sendToUser error: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send push notification to all users of a specific role (e.g. 'admin').
     */
    public static function sendToRole(string $role, string $title, string $body, array $data = []): array
    {
        try {
            $pdo = Database::getConnection();
            $stmt=$pdo->prepare('SELECT id FROM users WHERE role=? AND status=1');$stmt->execute([$role]);
            $results=[];
            foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $id) $results[]=self::sendToUser((int)$id,$title,$body,$data);
            return ['success'=>true,'results'=>$results];
        } catch (Throwable $e) {
            error_log('PushNotification::sendToRole error: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Create notification history record in database and dispatch push notification.
     */
    public static function createAndSend(
        string $title,
        string $content,
        string $type,
        ?int $targetTenantId = null,
        ?int $targetUserId = null,
        ?string $refType = null,
        ?int $refId = null,
        array $dataPayload = [],
        ?int $createdBy = null
    ): array {
        try {
            $pdo = Database::getConnection();

            // Auto-resolve target_user_id from target_tenant_id if needed
            if (!$targetUserId && $targetTenantId) {
                $stmt = $pdo->prepare("SELECT user_id FROM tenants WHERE id = ? LIMIT 1");
                $stmt->execute([$targetTenantId]);
                $targetUserId = $stmt->fetchColumn() ?: null;
            }

            $payloadJson = !empty($dataPayload) ? json_encode($dataPayload, JSON_UNESCAPED_UNICODE) : null;

            $stmt = $pdo->prepare("
                INSERT INTO `notifications` 
                    (`title`, `content`, `type`, `target_tenant_id`, `target_user_id`, `created_by`, `is_read`, `reference_type`, `reference_id`, `data_payload`, `created_at`)
                VALUES 
                    (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $title,
                $content,
                $type,
                $targetTenantId,
                $targetUserId,
                $createdBy,
                $refType,
                $refId,
                $payloadJson
            ]);
            $notificationId = (int) $pdo->lastInsertId();

            // Prepare push payload
            $pushData = array_merge($dataPayload, [
                'notification_id' => $notificationId,
                'type'           => $dataPayload['type'] ?? $type,
                'reference_type' => $refType,
                'reference_id'   => $refId
            ]);

            // Dispatch push notification
            $eventRoom = $targetUserId ? 'user_'.$targetUserId : (($type==='maintenance' && !$targetTenantId) ? 'admin' : null);
            if ($eventRoom) RealtimeEmitter::emit('notification:created', ['notification_id'=>$notificationId], $eventRoom);
            $pushResult = null;
            if ($targetUserId) {
                $pushResult = self::sendToUser((int)$targetUserId, $title, $content, $pushData);
            } elseif ($type === 'maintenance' && !$targetUserId) {
                // If it's an incident report for admins
                $pushResult = self::sendToRole('admin', $title, $content, $pushData);
            }

            return [
                'success'         => true,
                'notification_id' => $notificationId,
                'push_result'     => $pushResult
            ];
        } catch (Throwable $e) {
            error_log('PushNotification::createAndSend error: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
