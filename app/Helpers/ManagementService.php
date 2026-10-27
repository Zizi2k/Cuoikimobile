<?php
namespace App\Helpers;
use PDO;
use InvalidArgumentException;
use Throwable;

/** Whitelisted admin REST CRUD. Never accepts client-supplied SQL tables or account links. */
class ManagementService
{
    private const ENTITIES = [
        'areas' => ['rental_areas', ['area_code','name','address','contact_phone','description'], ['area_code','name','address']],
        'tenants' => ['tenants', ['fullname','phone','email','dob','id_card','address','notes'], ['fullname','phone']],
        'services' => ['services', ['service_code','name','unit','price','type','description','is_active'], ['service_code','name','unit','price','type']],
        'contracts' => ['contracts', ['contract_code','room_id','tenant_id','start_date','end_date','rent_price','deposit_amount','payment_cycle','terms','status'], ['contract_code','room_id','tenant_id','start_date','end_date','rent_price']],
        'expenses' => ['expenses', ['expense_code','title','category','amount','expense_date','recipient','description'], ['expense_code','title','category','amount','expense_date']],
        'meters' => ['meter_readings', ['room_id','billing_month','electricity_old','electricity_new','water_old','water_new','recorded_date','notes'], ['room_id','billing_month','electricity_old','electricity_new','water_old','water_new','recorded_date']],
    ];
    public function __construct(private PDO $db) {}
    public function execute(string $resource, string $method, int $id, array $input, int $admin): array
    {
        if (!isset(self::ENTITIES[$resource])) throw new InvalidArgumentException('Danh mục không hợp lệ.');
        [$table,$fields,$required] = self::ENTITIES[$resource];
        if ($method === 'GET') return $this->db->query("SELECT * FROM `$table` ORDER BY id DESC LIMIT 500")->fetchAll(PDO::FETCH_ASSOC);
        if (!in_array($method, ['POST','PUT','DELETE'], true)) throw new InvalidArgumentException('Phương thức không hợp lệ.');
        $this->db->beginTransaction();
        try {
            $old = null;
            if ($method !== 'POST') {
                $q = $this->db->prepare("SELECT * FROM `$table` WHERE id=? FOR UPDATE"); $q->execute([$id]); $old=$q->fetch(PDO::FETCH_ASSOC);
                if (!$old) throw new InvalidArgumentException('Bản ghi không tồn tại.');
            }
            $data = array_intersect_key($input, array_flip($fields));
            if ($method !== 'DELETE') {
                $data = array_merge($old ? array_intersect_key($old,array_flip($fields)) : [], $data);
                foreach ($required as $field) if (!isset($data[$field]) || trim((string)$data[$field]) === '') throw new InvalidArgumentException("Thiếu trường $field.");
                foreach (['price','rent_price','deposit_amount','amount','electricity_old','electricity_new','water_old','water_new'] as $field) {
                    if (isset($data[$field]) && (!is_numeric($data[$field]) || !is_finite((float)$data[$field]) || (float)$data[$field] < 0)) throw new InvalidArgumentException("$field phải là số không âm.");
                }
                foreach (['room_id','tenant_id','payment_cycle'] as $field) if (isset($data[$field]) && (!ctype_digit((string)$data[$field]) || (int)$data[$field] < 1)) throw new InvalidArgumentException("$field phải là số nguyên dương.");
                foreach (['start_date','end_date','recorded_date','expense_date','dob'] as $field) {
                    if (isset($data[$field]) && $data[$field] !== '') {
                        $date=\DateTimeImmutable::createFromFormat('!Y-m-d',(string)$data[$field]);
                        if (!$date || $date->format('Y-m-d')!==$data[$field]) throw new InvalidArgumentException("$field cần định dạng YYYY-MM-DD.");
                    } elseif (array_key_exists($field,$data)) $data[$field]=null;
                }
                if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) throw new InvalidArgumentException('Email không hợp lệ.');
                if ($resource==='services' && !in_array($data['type'],['fixed','meter'],true)) throw new InvalidArgumentException('Loại dịch vụ phải là fixed/meter.');
                if ($resource==='contracts') {
                    $data['status'] ??= 'active';
                    if (!in_array($data['status'],['active','expired','terminated'],true) || $data['start_date'] >= $data['end_date']) throw new InvalidArgumentException('Trạng thái hoặc thời hạn hợp đồng không hợp lệ.');
                    if ($old && ((int)$old['room_id'] !== (int)$data['room_id'] || (int)$old['tenant_id'] !== (int)$data['tenant_id'])) throw new InvalidArgumentException('Không đổi phòng/người thuê trên hợp đồng đã lập. Hãy kết thúc và tạo hợp đồng mới.');
                    $q=$this->db->prepare('SELECT id,status FROM rooms WHERE id=? FOR UPDATE');$q->execute([$data['room_id']]);$room=$q->fetch();
                    $q=$this->db->prepare('SELECT id FROM tenants WHERE id=? FOR UPDATE');$q->execute([$data['tenant_id']]);$tenant=$q->fetch();
                    if (!$room || !$tenant) throw new InvalidArgumentException('Phòng hoặc người thuê không tồn tại.');
                    if ($data['status']==='active') {
                        if ($room['status']==='maintenance') throw new InvalidArgumentException('Phòng đang bảo trì.');
                        $q=$this->db->prepare("SELECT id FROM contracts WHERE status='active' AND (room_id=? OR tenant_id=?) AND id<>?");
                        $q->execute([$data['room_id'],$data['tenant_id'],$id]);
                        if ($q->fetch()) throw new InvalidArgumentException('Phòng/người thuê đã có hợp đồng đang hoạt động.');
                    }
                }
                if ($resource==='meters') {
                    if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/D',$data['billing_month'])) throw new InvalidArgumentException('Kỳ tính tiền phải là YYYY-MM.');
                    foreach (['electricity','water'] as $kind) {
                        $usage=(float)$data[$kind.'_new']-(float)$data[$kind.'_old'];
                        if ($usage<0) throw new InvalidArgumentException('Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ.');
                        $data[$kind.'_usage']=$usage;
                    }
                }
                if ($resource==='expenses' && !$old) $data['created_by']=$admin;
            }
            if ($resource==='meters' && $old) {
                $q=$this->db->prepare('SELECT id FROM invoices WHERE meter_reading_id=? LIMIT 1');$q->execute([$id]);
                if ($q->fetch()) throw new InvalidArgumentException('Chỉ số đã được lập hóa đơn, không thể sửa/xóa.');
            }
            if ($method==='DELETE') {
                $q=$this->db->prepare("DELETE FROM `$table` WHERE id=?");$q->execute([$id]);
            } elseif ($method==='POST') {
                $columns=implode('`,`',array_keys($data));$marks=implode(',',array_fill(0,count($data),'?'));
                $q=$this->db->prepare("INSERT INTO `$table` (`$columns`) VALUES ($marks)");$q->execute(array_values($data));$id=(int)$this->db->lastInsertId();
            } else {
                $set=implode(',',array_map(fn($column)=>"`$column`=?",array_keys($data)));
                $q=$this->db->prepare("UPDATE `$table` SET $set WHERE id=?");$q->execute([...array_values($data),$id]);
            }
            if ($resource==='contracts') {
                $roomId=(int)($data['room_id']??$old['room_id']);
                $q=$this->db->prepare("UPDATE rooms SET status=CASE WHEN EXISTS (SELECT 1 FROM contracts WHERE room_id=? AND status='active') THEN 'rented' WHEN status='maintenance' THEN 'maintenance' ELSE 'empty' END WHERE id=?");$q->execute([$roomId,$roomId]);
            }
            $this->db->commit();return ['id'=>$id];
        } catch (Throwable $e) { if ($this->db->inTransaction()) $this->db->rollBack(); throw $e; }
    }
}
