-- Migration: Add Google OAuth support to users table
-- Date: 2025-12-02
-- Description: Adds google_id and google_profile_picture columns to support Google Sign-In

-- Add google_id column
ALTER TABLE users
ADD COLUMN google_id VARCHAR(255) NULL AFTER last_login,
ADD UNIQUE INDEX idx_users_google_id (google_id);

-- Add google_profile_picture column
ALTER TABLE users
ADD COLUMN google_profile_picture VARCHAR(500) NULL AFTER google_id;

-- Update existing users: set is_verified = true for users with google_id
-- (This will be handled by the application logic)
