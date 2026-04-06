-- Migration: Add password_hash column to users table for password authentication
-- Created: 2026-01-03

-- Add password_hash column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Create index on password_hash for faster lookups (though we primarily use username)
CREATE INDEX IF NOT EXISTS idx_users_password_hash ON users(password_hash);
