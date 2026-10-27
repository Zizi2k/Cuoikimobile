<?php
/**
 * Cron / Scheduled Task Script to automatically send Payment Reminders.
 * Run daily via Windows Task Scheduler or CLI:
 *   php scripts/send_payment_reminders.php
 */

require_once __DIR__ . '/../app/Helpers/Database.php';
require_once __DIR__ . '/../app/Helpers/PushNotification.php';
require_once __DIR__ . '/../app/Helpers/helpers.php';

use App\Helpers\Database;
use App\Helpers\PushNotification;

echo "[" . date('Y-m-d H:i:s') . "] Starting automated payment reminder job...\n";

try {
    $pdo = Database::getConnection();

    // 1. Update overdue status for past-due unpaid invoices
    $today = date('Y-m-d');
    $stmtOverdue = $pdo->prepare("
        UPDATE invoices 
        SET status = 'overdue' 
        WHERE due_date < ? 
          AND status IN ('unpaid', 'partially_paid') 
          AND remaining_amount > 0
    ");
    $stmtOverdue->execute([$today]);

    // 2. Query invoices that are unpaid or partially paid and due within reminder window (due today, tomorrow, or overdue)
    // Reminder window: due_date <= DATE_ADD(CURDATE(), INTERVAL 1 DAY)
    $stmt = $pdo->prepare("
        SELECT 
            i.id, i.invoice_code, i.billing_month, i.total_amount, i.paid_amount, 
            i.remaining_amount, i.due_date, i.status, i.tenant_id,
            t.fullname AS tenant_name, t.phone AS tenant_phone, t.user_id,
            r.room_number, r.room_code
        FROM invoices i
        JOIN tenants t ON i.tenant_id = t.id
        JOIN rooms r ON i.room_id = r.id
        WHERE i.status IN ('unpaid', 'partially_paid', 'overdue')
          AND i.remaining_amount > 0
          AND i.due_date <= DATE_ADD(CURDATE(), INTERVAL 1 DAY)
          AND NOT EXISTS (
              SELECT 1 FROM payment_reminder_logs prl 
              WHERE prl.invoice_id = i.id 
                AND prl.reminder_type = 'due_date' 
                AND prl.reminder_date = CURDATE()
          )
        ORDER BY i.due_date ASC
    ");
    $stmt->execute();
    $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Found " . count($invoices) . " invoice(s) needing reminder today.\n";

    $remindedCount = 0;
    $skippedCount = 0;

    foreach ($invoices as $inv) {
        $userId = $inv['user_id'] ? (int)$inv['user_id'] : null;

        if (!$userId) {
            echo "Invoice #{$inv['invoice_code']}: Tenant has no user account linked. Skipping push.\n";
            $skippedCount++;
            continue;
        }

        $remainingStr = number_format((float)$inv['remaining_amount'], 0, ',', '.') . ' đ';
        $dueStr = date('d/m/Y', strtotime($inv['due_date']));
        $roomName = $inv['room_number'] ?: $inv['room_code'];

        $title = "Nhắc hạn thanh toán tiền phòng ({$roomName})";
        $content = "Hóa đơn kỳ {$inv['billing_month']} còn {$remainingStr} cần thanh toán trước ngày {$dueStr}. Vui lòng thanh toán đúng hạn.";

        // Insert into reminder logs to prevent duplicate sending (atomic idempotency)
        try {
            $insertLog = $pdo->prepare("
                INSERT INTO payment_reminder_logs 
                    (invoice_id, reminder_type, reminder_date, sent_to_user_id, sent_status, sent_at)
                VALUES 
                    (?, 'due_date', CURDATE(), ?, 'pending', NOW())
            ");
            $insertLog->execute([$inv['id'], $userId]);
        } catch (\PDOException $e) {
            // Already logged today (duplicate prevented by unique constraint)
            echo "Invoice #{$inv['invoice_code']} was already reminded today. Skipping.\n";
            continue;
        }

        // Create notification and send push notification
        $res = PushNotification::createAndSend(
            $title,
            $content,
            'payment',
            (int)$inv['tenant_id'],
            $userId,
            'invoice',
            (int)$inv['id'],
            [
                'invoice_id'     => (int)$inv['id'],
                'invoice_code'   => $inv['invoice_code'],
                'remaining'      => (float)$inv['remaining_amount'],
                'due_date'       => $inv['due_date'],
                'type'           => 'payment_reminder'
            ],
            null
        );

        // Update log status to sent
        $pdo->prepare("UPDATE payment_reminder_logs SET sent_status = 'sent' WHERE invoice_id = ? AND reminder_date = CURDATE()")
            ->execute([$inv['id']]);

        echo "Reminded tenant {$inv['tenant_name']} (User #{$userId}) for Invoice {$inv['invoice_code']} - {$remainingStr}.\n";
        $remindedCount++;
    }

    echo "[" . date('Y-m-d H:i:s') . "] Reminder job finished. Total reminded: {$remindedCount}, Skipped: {$skippedCount}.\n";
} catch (\Throwable $e) {
    echo "ERROR running payment reminder job: " . $e->getMessage() . "\n";
    exit(1);
}
