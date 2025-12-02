-- Migration: Increase move_history and final_board column sizes
-- Date: 2025-12-03
-- Description: Changes move_history and final_board from TEXT to MEDIUMTEXT to support longer games
--              TEXT is limited to 65,535 bytes, MEDIUMTEXT supports up to 16,777,215 bytes (16MB)

-- Modify move_history column from TEXT to MEDIUMTEXT
ALTER TABLE games
MODIFY COLUMN move_history MEDIUMTEXT NOT NULL;

-- Modify final_board column from TEXT to MEDIUMTEXT
ALTER TABLE games
MODIFY COLUMN final_board MEDIUMTEXT NOT NULL;
