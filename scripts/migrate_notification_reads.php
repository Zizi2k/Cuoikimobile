<?php
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("CLI only.\n");
}
require_once __DIR__ . '/../app/Helpers/Database.php';
try {
    $pdo = App\Helpers\Database::getConnection();
    $pdo->exec(file_get_contents(__DIR__ . '/../database/migrations/002_notification_reads.sql'));
    echo "notification_reads is ready. Existing notification data is preserved.\n";
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage() . "\n");
    exit(1);
}
