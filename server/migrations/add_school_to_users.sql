-- Migration: Add school column to users table
-- Date: 2025-12-04
-- Description: Adds school column to store user's school affiliation

-- Add school column
-- Note: Use AFTER high_score if high_score exists, otherwise use AFTER is_banned
ALTER TABLE users
ADD COLUMN school VARCHAR(100) NULL DEFAULT NULL AFTER high_score,
ADD INDEX idx_users_school (school);
