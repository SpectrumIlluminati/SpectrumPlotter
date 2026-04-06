-- Migration 030: Add service_branch and pay_grade to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS service_branch VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pay_grade VARCHAR(20);
