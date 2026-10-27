<?php
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('CLI only'); }
require_once __DIR__.'/../app/Helpers/Database.php';
try {
    $pdo=App\Helpers\Database::getConnection();
    $pdo->exec(file_get_contents(__DIR__.'/../database/migrations/003_push_delivery.sql'));
    $q=$pdo->query("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='invoices' AND index_name IN ('uniq_invoice_contract_month','unique_contract_billing_month')");
    if (!(int)$q->fetchColumn()) {
        $duplicate=$pdo->query('SELECT contract_id,billing_month FROM invoices GROUP BY contract_id,billing_month HAVING COUNT(*)>1 LIMIT 1')->fetch();
        if ($duplicate) throw new RuntimeException('Có hóa đơn trùng kỳ. Đối chiếu thủ công trước khi thêm ràng buộc; migration không xóa dữ liệu.');
        $pdo->exec('ALTER TABLE invoices ADD UNIQUE KEY uniq_invoice_contract_month (contract_id,billing_month)');
    }
    echo "Rubric migration ready.\n";
} catch(Throwable $e) {fwrite(STDERR,$e->getMessage()."\n");exit(1);}
