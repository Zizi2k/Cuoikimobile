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
