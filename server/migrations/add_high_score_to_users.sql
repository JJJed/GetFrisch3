-- Migration: Add high_score column to users table
-- Date: 2025-12-04
-- Description: Adds high_score column to store user's best score directly on the user record for efficient queries

-- Add high_score column
ALTER TABLE users
ADD COLUMN high_score INT NOT NULL DEFAULT 0 AFTER is_banned,
ADD INDEX idx_users_high_score (high_score);

-- Backfill high_score from existing validated, non-flagged games only
UPDATE users u
SET high_score = (
    SELECT COALESCE(MAX(g.score), 0)
    FROM games g
    WHERE g.user_id = u.id
    AND g.is_validated = 1
    AND g.is_flagged = 0
);
