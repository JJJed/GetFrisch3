-- Migration: Add client_logs table for remote debugging
-- Purpose: Store client-side logs to debug issues on devices with restricted console access

CREATE TABLE IF NOT EXISTS client_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    data TEXT NULL,
    user_agent VARCHAR(500) NULL,
    url VARCHAR(500) NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_level (level),
    INDEX idx_timestamp (timestamp),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;