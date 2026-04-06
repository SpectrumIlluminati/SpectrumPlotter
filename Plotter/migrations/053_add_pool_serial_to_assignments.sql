-- Migration 053: add pool_serial column to frequency_assignments
-- Stores the pool assignment serial (SFAF field 105) selected during approval

ALTER TABLE frequency_assignments
    ADD COLUMN IF NOT EXISTS pool_serial TEXT;
