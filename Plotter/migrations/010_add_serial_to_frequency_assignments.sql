-- Migration: Add serial field to frequency_assignments
-- Created: 2025-12-30
-- Purpose: Add serial field to link frequency assignments to SFAF markers

-- Add serial column to frequency_assignments table
ALTER TABLE frequency_assignments
ADD COLUMN IF NOT EXISTS serial VARCHAR(50);

-- Create index on serial for fast lookups
CREATE INDEX IF NOT EXISTS idx_frequency_assignments_serial ON frequency_assignments(serial);

-- Add comment explaining the field
COMMENT ON COLUMN frequency_assignments.serial IS 'References the serial number from SFAF markers table - primary key linking assignments to specific markers';
