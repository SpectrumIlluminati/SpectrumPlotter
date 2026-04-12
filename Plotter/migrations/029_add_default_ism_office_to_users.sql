-- Migration 029: Add default_ism_office to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_ism_office VARCHAR(50);
