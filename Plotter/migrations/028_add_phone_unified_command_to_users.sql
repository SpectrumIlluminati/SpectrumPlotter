-- Migration 028: Add phone and unified_command to users
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone VARCHAR(100),
    ADD COLUMN IF NOT EXISTS unified_command VARCHAR(50);
