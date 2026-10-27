<?php
// Only used by tests/security_regression.py against a disposable database.
if (PHP_SAPI !== 'cli' || !preg_match('/^qlpt_security_[a-f0-9]+$/D', getenv('DB_NAME') ?: '')) exit(1);
$config = require __DIR__ . '/../config/database.php';
$pdo = new PDO("mysql:host={$config['host']};port={$config['port']};charset=utf8mb4", $config['username'], $config['password'], $config['options']);
$name = $config['database'];
if (($argv[1] ?? '') === 'drop') {
    $pdo->exec("DROP DATABASE IF EXISTS `$name`");
    exit;
}
$sql = str_replace('quanlyphongtro', $name, file_get_contents(__DIR__ . '/../database/database.sql'));
$pdo->exec($sql);
$pdo->exec("USE `$name`");
$stmt = $pdo->prepare('INSERT INTO users (id,username,password,role,fullname,phone) VALUES (?,?,?,?,?,?)');
foreach ([[101,'admin_test','admin','0900000101'],[102,'tenant_a','tenant','0900000102'],[103,'tenant_b','tenant','0900000103']] as [$id,$user,$role,$phone]) {
    $stmt->execute([$id,$user,password_hash('Correct-private-test-password', PASSWORD_DEFAULT),$role,$user,$phone]);
}
$pdo->exec("INSERT INTO tenants (id,user_id,fullname,phone,id_card) VALUES (102,102,'Tenant A','0900000102','123456789102'), (103,103,'Tenant B','0900000103','123456789103'), (104,NULL,'Unlinked','0900000104','123456789104')");
$pdo->exec("DELETE FROM notifications");
$pdo->exec("INSERT INTO notifications (id,title,content,type,target_tenant_id,target_user_id,reference_type,is_read) VALUES
(101,'Public','Public','general',NULL,NULL,NULL,1),
(102,'A only','Private A','general',102,102,NULL,0),
(103,'B only','Private B','general',103,103,NULL,0),
(104,'Admin only','Incident','maintenance',NULL,NULL,'maintenance',0),
(105,'A legacy','Private A','general',102,NULL,NULL,0)");
$pdo->exec("INSERT INTO push_tokens (user_id,token) VALUES (103,'ExponentPushToken[real_test_device_b]')");
echo "Fixture ready\n";
