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
