<?php
if (PHP_SAPI!=='cli') {http_response_code(403);exit('CLI only');}
require_once __DIR__.'/../app/Helpers/Database.php';
require_once __DIR__.'/../app/Helpers/PushNotification.php';
use App\Helpers\Database;
use App\Helpers\PushNotification;
$pdo=Database::getConnection();
$rows=$pdo->query("SELECT id,expo_ticket_id,token_hash FROM push_deliveries WHERE status='accepted' AND expo_ticket_id IS NOT NULL ORDER BY id LIMIT 1000")->fetchAll(PDO::FETCH_ASSOC);
foreach(array_chunk($rows,100) as $batch) {
 $response=PushNotification::request(PushNotification::endpoint(true),['ids'=>array_column($batch,'expo_ticket_id')]);
 foreach($batch as $row) {
  $receipt=$response['data'][$row['expo_ticket_id']]??null;if(!$receipt)continue;
  $status=($receipt['status']??'')==='ok'?'delivered':'error';
  $q=$pdo->prepare('UPDATE push_deliveries SET status=?,message=?,checked_at=NOW() WHERE id=?');$q->execute([$status,substr($receipt['message']??'',0,255),$row['id']]);
  if (($receipt['details']['error']??'')==='DeviceNotRegistered') {$q=$pdo->prepare('DELETE FROM push_tokens WHERE SHA2(token,256)=?');$q->execute([$row['token_hash']]);}
 }
}
echo 'Checked '.count($rows)." Expo tickets. A provider receipt is not proof the user read the notification.\n";
