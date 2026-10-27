-- ========================================================
-- CƠ SỞ DỮ LIỆU: HỆ THỐNG QUẢN LÝ PHÒNG TRỌ (QuanLyPhongTro)
-- Hệ quản trị: MySQL / MariaDB (Tương thích WAMP64)
-- Bảng mã: utf8mb4 / utf8mb4_unicode_ci
-- Múi giờ: Asia/Ho_Chi_Minh
-- ========================================================

CREATE DATABASE IF NOT EXISTS `quanlyphongtro` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `quanlyphongtro`;

SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- 1. Bảng users (Tài khoản người dùng: Admin và Người thuê)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `push_deliveries`;
DROP TABLE IF EXISTS `notification_reads`;
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'tenant') NOT NULL DEFAULT 'tenant',
  `fullname` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `avatar` VARCHAR(255) DEFAULT NULL,
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1: Hoạt động, 0: Đã khóa',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Bảng rental_areas (Khu trọ / Dãy trọ)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `rental_areas`;
CREATE TABLE `rental_areas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `area_code` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `contact_phone` VARCHAR(20) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Bảng rooms (Phòng trọ)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `rooms`;
CREATE TABLE `rooms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `area_id` INT NOT NULL,
  `room_code` VARCHAR(20) NOT NULL UNIQUE,
  `room_number` VARCHAR(50) NOT NULL,
  `area_size` DECIMAL(6,2) NOT NULL DEFAULT 20.00 COMMENT 'Diện tích m2',
  `price` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Giá thuê VNĐ/tháng',
  `deposit` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Tiền cọc mặc định VNĐ',
  `max_occupants` INT NOT NULL DEFAULT 2,
  `status` ENUM('empty', 'rented', 'maintenance') NOT NULL DEFAULT 'empty',
  `description` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_rooms_area` FOREIGN KEY (`area_id`) REFERENCES `rental_areas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_room_status` (`status`),
  INDEX `idx_room_area` (`area_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Bảng room_images (Hình ảnh phòng trọ - Đa hình ảnh)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `room_images`;
CREATE TABLE `room_images` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `room_id` INT NOT NULL,
  `image_path` VARCHAR(255) NOT NULL,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_room_images_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_image_room` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. Bảng tenants (Thông tin người thuê phòng)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `tenants`;
CREATE TABLE `tenants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL UNIQUE,
  `fullname` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `dob` DATE DEFAULT NULL,
  `id_card` VARCHAR(30) DEFAULT NULL COMMENT 'CCCD/CMND',
  `address` VARCHAR(255) DEFAULT NULL COMMENT 'Quê quán / Hộ khẩu',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tenants_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_tenant_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. Bảng contracts (Hợp đồng thuê phòng)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `contracts`;
CREATE TABLE `contracts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `contract_code` VARCHAR(30) NOT NULL UNIQUE,
  `room_id` INT NOT NULL,
  `tenant_id` INT NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `rent_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `deposit_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_cycle` INT NOT NULL DEFAULT 1 COMMENT 'Chu kỳ thanh toán (tháng)',
  `terms` TEXT DEFAULT NULL COMMENT 'Điều khoản hợp đồng',
  `status` ENUM('active', 'expired', 'terminated') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_contracts_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_contracts_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_contract_status` (`status`),
  INDEX `idx_contract_room` (`room_id`),
  INDEX `idx_contract_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. Bảng services (Danh mục dịch vụ & Đơn giá)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `services`;
CREATE TABLE `services` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `service_code` VARCHAR(30) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `unit` VARCHAR(30) NOT NULL COMMENT 'kWh, m3, phòng, người, xe...',
  `price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `type` ENUM('meter', 'fixed') NOT NULL DEFAULT 'fixed' COMMENT 'meter: điện/nước, fixed: cố định',
  `description` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8. Bảng meter_readings (Ghi nhận chỉ số điện, nước định kỳ)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `meter_readings`;
CREATE TABLE `meter_readings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `room_id` INT NOT NULL,
  `billing_month` VARCHAR(7) NOT NULL COMMENT 'Định dạng YYYY-MM',
  `electricity_old` INT NOT NULL DEFAULT 0,
  `electricity_new` INT NOT NULL DEFAULT 0,
  `electricity_usage` INT NOT NULL DEFAULT 0,
  `water_old` INT NOT NULL DEFAULT 0,
  `water_new` INT NOT NULL DEFAULT 0,
  `water_usage` INT NOT NULL DEFAULT 0,
  `recorded_date` DATE NOT NULL,
  `notes` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_meters_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE KEY `unique_room_billing_month` (`room_id`, `billing_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 9. Bảng invoices (Hóa đơn tiền phòng & dịch vụ)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `invoices`;
CREATE TABLE `invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_code` VARCHAR(30) NOT NULL UNIQUE,
  `contract_id` INT NOT NULL,
  `room_id` INT NOT NULL,
  `tenant_id` INT NOT NULL,
  `meter_reading_id` INT DEFAULT NULL,
  `billing_month` VARCHAR(7) NOT NULL COMMENT 'Định dạng YYYY-MM',
  `room_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `electricity_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `water_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `service_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `other_fees` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `remaining_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `due_date` DATE NOT NULL,
  `status` ENUM('unpaid', 'partially_paid', 'paid', 'overdue') NOT NULL DEFAULT 'unpaid',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_invoices_contract` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_invoices_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_invoices_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_invoices_meter` FOREIGN KEY (`meter_reading_id`) REFERENCES `meter_readings` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  UNIQUE KEY `unique_contract_billing_month` (`contract_id`, `billing_month`),
  INDEX `idx_invoice_status` (`status`),
  INDEX `idx_invoice_month` (`billing_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 10. Bảng invoice_details (Chi tiết từng mục trong hóa đơn)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `invoice_details`;
CREATE TABLE `invoice_details` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_id` INT NOT NULL,
  `item_name` VARCHAR(150) NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  `unit` VARCHAR(30) NOT NULL,
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `note` VARCHAR(255) DEFAULT NULL,
  CONSTRAINT `fk_inv_details_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_inv_details_invoice` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 11. Bảng payments (Lịch sử thanh toán hóa đơn)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payment_code` VARCHAR(30) NOT NULL UNIQUE,
  `invoice_id` INT NOT NULL,
  `payment_date` DATETIME NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_method` ENUM('cash', 'bank_transfer') NOT NULL DEFAULT 'cash',
  `transaction_ref` VARCHAR(100) DEFAULT NULL COMMENT 'Mã tham chiếu / số tài khoản / ghi chú',
  `notes` TEXT DEFAULT NULL,
  `created_by` INT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_payments_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_payments_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_payment_invoice` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 12. Bảng maintenance_requests (Yêu cầu sửa chữa, bảo trì)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `maintenance_requests`;
CREATE TABLE `maintenance_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `request_code` VARCHAR(30) NOT NULL UNIQUE,
  `room_id` INT NOT NULL,
  `tenant_id` INT NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT NOT NULL,
  `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  `image_path` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('pending', 'in_progress', 'completed', 'rejected') NOT NULL DEFAULT 'pending',
  `admin_notes` TEXT DEFAULT NULL,
  `cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_maint_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_maint_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_maint_status` (`status`),
  INDEX `idx_maint_room` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 13. Bảng notifications (Thông báo hệ thống / Chủ trọ gửi)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(150) NOT NULL,
  `content` TEXT NOT NULL,
  `type` ENUM('general', 'maintenance', 'payment', 'system') NOT NULL DEFAULT 'general',
  `target_tenant_id` INT DEFAULT NULL COMMENT 'NULL = gửi toàn bộ người thuê',
  `target_user_id` INT DEFAULT NULL COMMENT 'NULL = theo target_tenant_id hoặc tất cả',
  `created_by` INT DEFAULT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `reference_type` VARCHAR(50) DEFAULT NULL,
  `reference_id` INT DEFAULT NULL,
  `data_payload` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_notif_tenant` FOREIGN KEY (`target_tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_notif_target_user` (`target_user_id`),
  INDEX `idx_notif_read` (`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- 14. Bảng expenses (Quản lý chi phí vận hành nhà trọ)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `expenses`;
CREATE TABLE `expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `expense_code` VARCHAR(30) NOT NULL UNIQUE,
  `title` VARCHAR(150) NOT NULL,
  `category` VARCHAR(50) NOT NULL COMMENT 'Bảo trì, Điện nước chung, Mua sắm, Vệ sinh, Lương, Khác',
  `amount` DECIMAL(12,2) NOT NULL,
  `expense_date` DATE NOT NULL,
  `recipient` VARCHAR(100) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_by` INT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_expenses_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_expense_date` (`expense_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 15. Bảng system_settings (Cài đặt hệ thống & Cấu hình)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(50) NOT NULL UNIQUE,
  `setting_value` TEXT DEFAULT NULL,
  `description` VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 16. Bảng activity_logs (Nhật ký thao tác hệ thống)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `activity_logs`;
CREATE TABLE `activity_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT DEFAULT NULL,
  `details` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_log_user` (`user_id`),
  INDEX `idx_log_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 17. Bảng push_tokens (Token Push Notification thiết bị di động)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `push_tokens`;
CREATE TABLE `push_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `token` VARCHAR(255) NOT NULL UNIQUE,
  `device_type` VARCHAR(50) DEFAULT 'mobile',
  `device_id` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_push_user` (`user_id`),
  CONSTRAINT `fk_push_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 18. Bảng payment_reminder_logs (Lịch sử nhắc hạn đóng tiền, chống gửi trùng)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `payment_reminder_logs`;
CREATE TABLE `payment_reminder_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_id` INT NOT NULL,
  `reminder_type` VARCHAR(50) NOT NULL DEFAULT 'due_date',
  `reminder_date` DATE NOT NULL,
  `sent_to_user_id` INT NOT NULL,
  `sent_status` VARCHAR(50) NOT NULL DEFAULT 'sent',
  `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_invoice_reminder_date` (`invoice_id`, `reminder_type`, `reminder_date`),
  CONSTRAINT `fk_reminder_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-user read receipts. Idempotent and non-destructive.
-- Legacy notifications.is_read is deliberately NOT copied: broadcast readers are unknown.
CREATE TABLE IF NOT EXISTS `notification_reads` (
  `notification_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `read_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`, `user_id`),
  INDEX `idx_notification_reads_user` (`user_id`),
  CONSTRAINT `fk_notification_reads_notification` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notification_reads_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS push_deliveries (
 id INT AUTO_INCREMENT PRIMARY KEY,
 notification_id INT DEFAULT NULL,
 token_hash CHAR(64) NOT NULL,
 expo_ticket_id VARCHAR(255) DEFAULT NULL,
 status VARCHAR(30) NOT NULL,
 message VARCHAR(255) DEFAULT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 checked_at DATETIME DEFAULT NULL,
 INDEX idx_push_receipt (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;


-- ========================================================
-- DỮ LIỆU MẪU ĐỂ KIỂM THỬ (SAMPLE DATA)
-- ========================================================

-- Mật khẩu mặc định:
-- Tai khoan quan tri duoc tao an toan bang scripts/create_admin.php sau khi import.

-- Khu trọ
INSERT INTO `rental_areas` (`id`, `area_code`, `name`, `address`, `contact_phone`, `description`) VALUES
(1, 'KT-Q7', 'Khu Trọ An Bình - Quận 7', '123 Huỳnh Tấn Phát, Phường Tân Phú, Quận 7, TP.HCM', '0901234567', 'Khu trọ an ninh, có camera 24/7, khóa vân tay, gần trường ĐH Tôn Đức Thắng.'),
(2, 'KT-NB', 'Nhà Trọ Hưng Thịnh - Nhà Bè', '45 Lê Văn Lương, Xã Phước Kiển, Huyện Nhà Bè, TP.HCM', '0909888999', 'Dãy phòng mới xây, sạch sẽ thoáng mát, có ban công riêng.');

-- Dịch vụ
INSERT INTO `services` (`id`, `service_code`, `name`, `unit`, `price`, `type`, `description`, `is_active`) VALUES
(1, 'DV-DIEN', 'Tiền điện', 'kWh', 3500.00, 'meter', 'Tính theo chỉ số công tơ điện hàng tháng', 1),
(2, 'DV-NUOC', 'Tiền nước', 'm³', 20000.00, 'meter', 'Tính theo đồng hồ nước riêng từng phòng', 1),
(3, 'DV-WIFI', 'Internet / Wifi cáp quang', 'Phòng', 100000.00, 'fixed', 'Wifi tốc độ cao mỗi tầng 1 router riêng', 1),
(4, 'DV-RAC', 'Phí vệ sinh & rác thải', 'Phòng', 40000.00, 'fixed', 'Thu gom rác mỗi ngày', 1),
(5, 'DV-XE', 'Phí gửi xe máy', 'Xe', 100000.00, 'fixed', 'Nhà để xe có bảo vệ và camera giám sát', 1);

-- Phòng trọ
INSERT INTO `rooms` (`id`, `area_id`, `room_code`, `room_number`, `area_size`, `price`, `deposit`, `max_occupants`, `status`, `description`) VALUES
(1, 1, 'P101', 'Phòng 101 (Tầng 1)', 22.50, 3200000.00, 3200000.00, 2, 'rented', 'Phòng tầng trệt, có gác lửng đúc, máy lạnh Inverter, kệ bếp, WC khép kín.'),
(2, 1, 'P102', 'Phòng 102 (Tầng 1)', 25.00, 3500000.00, 3500000.00, 3, 'rented', 'Phòng góc thoáng mát, có cửa sổ lớn, gác cao đứng thẳng, máy lạnh, tủ lạnh.'),
(3, 1, 'P201', 'Phòng 201 (Tầng 2)', 20.00, 2800000.00, 2800000.00, 2, 'empty', 'Phòng lầu 1, có ban công nhỏ thoáng gió, máy nước nóng năng lượng mặt trời.'),
(4, 1, 'P202', 'Phòng 202 (Tầng 2)', 24.00, 3000000.00, 3000000.00, 2, 'maintenance', 'Đang sơn sửa và bảo dưỡng điều hòa trước khi bàn giao khách mới.'),
(5, 2, 'P.NB1', 'Phòng A1 (Tầng trệt)', 26.00, 3300000.00, 3300000.00, 3, 'empty', 'Phòng khu Nhà Bè, sân rộng để xe thoải mái, an ninh tuyệt đối.'),
(6, 2, 'P.NB2', 'Phòng A2 (Lầu 1)', 28.00, 3600000.00, 3600000.00, 4, 'empty', 'Phòng 2 gian rộng rãi, thích hợp cho gia đình nhỏ hoặc nhóm bạn sinh viên.');

-- Người thuê
INSERT INTO `tenants` (`id`, `user_id`, `fullname`, `phone`, `email`, `dob`, `id_card`, `address`, `notes`) VALUES
(1, NULL, 'Nguyễn Văn An', '0912345678', 'nguyenvanan@gmail.com', '2001-05-15', '079201008899', 'TP. Mỹ Tho, Tỉnh Tiền Giang', 'Sinh viên năm cuối ĐH Tôn Đức Thắng, ở 2 người.'),
(2, NULL, 'Trần Thị Bình', '0987654321', 'tranthib@gmail.com', '1998-11-20', '072198007766', 'Huyện Cần Giuộc, Long An', 'Nhân viên văn phòng công ty FPT Quận 7, ở 1 người.');

-- Hợp đồng thuê
INSERT INTO `contracts` (`id`, `contract_code`, `room_id`, `tenant_id`, `start_date`, `end_date`, `rent_price`, `deposit_amount`, `payment_cycle`, `terms`, `status`) VALUES
(1, 'HD-2026-001', 1, 1, '2026-01-01', '2026-12-31', 3200000.00, 3200000.00, 1, 'Bên B cam kết giữ gìn vệ sinh chung, không làm ồn sau 23h, thanh toán tiền phòng từ ngày 01 đến ngày 05 hằng tháng.', 'active'),
(2, 'HD-2026-002', 2, 2, '2026-03-01', '2027-02-28', 3500000.00, 3500000.00, 1, 'Thanh toán đúng hạn, cọc 1 tháng tiền phòng, báo trước 30 ngày trước khi chuyển đi.', 'active');

-- Ghi nhận chỉ số điện nước tháng 09/2026 và 10/2026
INSERT INTO `meter_readings` (`id`, `room_id`, `billing_month`, `electricity_old`, `electricity_new`, `electricity_usage`, `water_old`, `water_new`, `water_usage`, `recorded_date`, `notes`) VALUES
(1, 1, '2026-09', 100, 195, 95, 30, 38, 8, '2026-09-30', 'Ghi số cuối tháng 9'),
(2, 2, '2026-09', 210, 312, 102, 55, 66, 11, '2026-09-30', 'Ghi số cuối tháng 9'),
(3, 1, '2026-10', 195, 290, 95, 38, 47, 9, '2026-10-10', 'Ghi số định kỳ tháng 10'),
(4, 2, '2026-10', 312, 420, 108, 66, 78, 12, '2026-10-10', 'Ghi số định kỳ tháng 10');

-- Hóa đơn tiền phòng & dịch vụ
-- Hóa đơn 1: P101 tháng 09/2026 (Đã thanh toán)
-- Tiền phòng 3.200.000 + Điện (95 * 3.500 = 332.500) + Nước (8 * 20.000 = 160.000) + Wifi 100.000 + Rác 40.000 + Xe 100.000 = 3.932.500 đ
INSERT INTO `invoices` (`id`, `invoice_code`, `contract_id`, `room_id`, `tenant_id`, `meter_reading_id`, `billing_month`, `room_price`, `electricity_amount`, `water_amount`, `service_amount`, `other_fees`, `discount`, `total_amount`, `paid_amount`, `remaining_amount`, `due_date`, `status`, `notes`) VALUES
(1, 'HDN-202609-001', 1, 1, 1, 1, '2026-09', 3200000.00, 332500.00, 160000.00, 240000.00, 0.00, 0.00, 3932500.00, 3932500.00, 0.00, '2026-10-05', 'paid', 'Tiền phòng và điện nước tháng 09/2026'),
-- Hóa đơn 2: P101 tháng 10/2026 (Mới tạo, chưa thanh toán)
-- Tiền phòng 3.200.000 + Điện (95 * 3.500 = 332.500) + Nước (9 * 20.000 = 180.000) + Dịch vụ 240.000 = 3.952.500 đ
(2, 'HDN-202610-001', 1, 1, 1, 3, '2026-10', 3200000.00, 332500.00, 180000.00, 240000.00, 0.00, 0.00, 3952500.00, 0.00, 3952500.00, '2026-10-20', 'unpaid', 'Tiền phòng và điện nước kỳ tháng 10/2026'),
-- Hóa đơn 3: P102 tháng 10/2026 (Đã cọc một phần 2.000.000 đ)
-- Tiền phòng 3.500.000 + Điện (108 * 3.500 = 378.000) + Nước (12 * 20.000 = 240.000) + Dịch vụ 240.000 = 4.358.000 đ
(3, 'HDN-202610-002', 2, 2, 2, 4, '2026-10', 3500000.00, 378000.00, 240000.00, 240000.00, 0.00, 0.00, 4358000.00, 2000000.00, 2358000.00, '2026-10-15', 'partially_paid', 'Tiền phòng và dịch vụ tháng 10/2026');

-- Chi tiết hóa đơn
INSERT INTO `invoice_details` (`invoice_id`, `item_name`, `quantity`, `unit`, `unit_price`, `amount`, `note`) VALUES
(1, 'Tiền thuê phòng P101 (Tháng 09/2026)', 1.00, 'Tháng', 3200000.00, 3200000.00, 'Theo hợp đồng'),
(1, 'Tiền điện (95 kWh)', 95.00, 'kWh', 3500.00, 332500.00, 'Số cũ: 100, Số mới: 195'),
(1, 'Tiền nước (8 m³)', 8.00, 'm³', 20000.00, 160000.00, 'Số cũ: 30, Số mới: 38'),
(1, 'Wifi Internet', 1.00, 'Phòng', 100000.00, 100000.00, 'Cố định hàng tháng'),
(1, 'Phí vệ sinh & rác', 1.00, 'Phòng', 40000.00, 40000.00, 'Cố định hàng tháng'),
(1, 'Phí gửi xe máy (1 xe)', 1.00, 'Xe', 100000.00, 100000.00, 'Xe biển số 63B1-999.88'),

(2, 'Tiền thuê phòng P101 (Tháng 10/2026)', 1.00, 'Tháng', 3200000.00, 3200000.00, 'Theo hợp đồng'),
(2, 'Tiền điện (95 kWh)', 95.00, 'kWh', 3500.00, 332500.00, 'Số cũ: 195, Số mới: 290'),
(2, 'Tiền nước (9 m³)', 9.00, 'm³', 20000.00, 180000.00, 'Số cũ: 38, Số mới: 47'),
(2, 'Wifi Internet', 1.00, 'Phòng', 100000.00, 100000.00, 'Cố định hàng tháng'),
(2, 'Phí vệ sinh & rác', 1.00, 'Phòng', 40000.00, 40000.00, 'Cố định hàng tháng'),
(2, 'Phí gửi xe máy', 1.00, 'Xe', 100000.00, 100000.00, 'Xe máy'),

(3, 'Tiền thuê phòng P102 (Tháng 10/2026)', 1.00, 'Tháng', 3500000.00, 3500000.00, 'Theo hợp đồng'),
(3, 'Tiền điện (108 kWh)', 108.00, 'kWh', 3500.00, 378000.00, 'Số cũ: 312, Số mới: 420'),
(3, 'Tiền nước (12 m³)', 12.00, 'm³', 20000.00, 240000.00, 'Số cũ: 66, Số mới: 78'),
(3, 'Wifi Internet', 1.00, 'Phòng', 100000.00, 100000.00, 'Cố định hàng tháng'),
(3, 'Phí vệ sinh & rác', 1.00, 'Phòng', 40000.00, 40000.00, 'Cố định hàng tháng'),
(3, 'Phí gửi xe máy', 1.00, 'Xe', 100000.00, 100000.00, 'Xe máy');

-- Lịch sử thanh toán
INSERT INTO `payments` (`id`, `payment_code`, `invoice_id`, `payment_date`, `amount`, `payment_method`, `transaction_ref`, `notes`, `created_by`) VALUES
(1, 'TT-202610-001', 1, '2026-10-02 09:30:00', 3932500.00, 'bank_transfer', 'MBBANK-FT260902991', 'Chuyển khoản qua App Ngân hàng MB', NULL),
(2, 'TT-202610-002', 3, '2026-10-11 14:15:00', 2000000.00, 'cash', 'TM-P102-DOT1', 'Thanh toán tiền mặt đợt 1', NULL);

-- Yêu cầu bảo trì / sửa chữa
INSERT INTO `maintenance_requests` (`id`, `request_code`, `room_id`, `tenant_id`, `title`, `description`, `priority`, `status`, `admin_notes`, `cost`) VALUES
(1, 'SC-202610-001', 1, 1, 'Vòi xịt vệ sinh bị rỉ nước', 'Vòi xịt bồn cầu trong nhà vệ sinh bị rò rỉ nhẹ ở khớp nối ren, nhờ chủ trọ cho thợ qua kiểm tra giúp.', 'medium', 'completed', 'Đã thay mới bộ dây xịt inox 304 vào ngày 05/10/2026.', 120000.00),
(2, 'SC-202610-002', 2, 2, 'Máy lạnh không lạnh sâu', 'Bật 22 độ nhưng gió thổi ra không mát lắm, khả năng cần bơm thêm gas hoặc vệ sinh lưới lọc.', 'high', 'in_progress', 'Đã liên hệ thợ điện lạnh hẹn chiều mai qua vệ sinh và nạp gas.', 0.00);

-- Thông báo
INSERT INTO `notifications` (`id`, `title`, `content`, `type`, `target_tenant_id`, `created_by`, `created_at`) VALUES
(1, 'Lịch tổng vệ sinh bể nước ngầm và diệt côn trùng định kỳ', 'Ban quản lý nhà trọ xin thông báo: Vào ngày Chủ Nhật tới (18/10), khu trọ sẽ tiến hành súc rửa bể chứa nước sinh hoạt từ 8h00 đến 11h30. Quý khách vui lòng dự trữ nước sinh hoạt trước thời gian trên.', 'general', NULL, NULL, '2026-10-12 08:00:00'),
(2, 'Nhắc nhở đóng tiền phòng tháng 10/2026', 'Hệ thống đã phát hành hóa đơn tiền phòng và dịch vụ tháng 10/2026. Quý khách vui lòng kiểm tra mục Hóa đơn trên ứng dụng và hoàn tất thanh toán trước ngày 20/10.', 'payment', NULL, NULL, '2026-10-12 10:00:00');

-- Chi phí vận hành
INSERT INTO `expenses` (`id`, `expense_code`, `title`, `category`, `amount`, `expense_date`, `recipient`, `description`, `created_by`) VALUES
(1, 'CP-202610-001', 'Bảo dưỡng và thay lọc nước tổng khu trọ Q7', 'Bảo trì', 650000.00, '2026-10-05', 'Công ty Môi Trường Xanh', 'Thay 3 lõi lọc thô đầu nguồn', NULL),
(2, 'CP-202610-002', 'Vệ sinh và thu gom rác tháng 09/2026', 'Vệ sinh', 400000.00, '2026-10-01', 'Đội vệ sinh đô thị', 'Thanh toán tiền rác định kỳ hàng tháng', NULL);

-- Cài đặt hệ thống
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('app_name', 'Hệ Thống Quản Lý Phòng Trọ An Bình', 'Tên hệ thống hiển thị trên tiêu đề'),
('hotline', '0901.234.567', 'Số điện thoại hotline hỗ trợ khẩn cấp'),
('bank_name', 'MB Bank (Ngân hàng Quân Đội)', 'Ngân hàng nhận thanh toán'),
('bank_account_number', '090123456789', 'Số tài khoản nhận chuyển khoản'),
('bank_account_name', 'CHU NHA TRO AN BINH', 'Tên chủ tài khoản'),
('bank_qr_template', 'compact', 'Mẫu mã QR VietQR'),
('address', '123 Huỳnh Tấn Phát, P. Tân Phú, Quận 7, TP. Hồ Chí Minh', 'Địa chỉ văn phòng quản lý'),
('payment_instruction', 'Nội dung chuyển khoản vui lòng ghi: [Mã Hóa Đơn] [Số Phòng] (Ví dụ: HDN-202610-001 P101)', 'Hướng dẫn chuyển khoản ngân hàng');

-- ========================================================
-- HOÀN TẤT KHỞI TẠO CƠ SỞ DỮ LIỆU
-- ========================================================
