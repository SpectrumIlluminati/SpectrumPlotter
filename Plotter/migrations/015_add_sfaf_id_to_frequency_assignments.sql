-- Migration: Add SFAF ID reference to frequency_assignments
-- Created: 2026-01-15
-- Purpose: Make frequency assignments directly reference SFAF records

-- Add sfaf_id column to frequency_assignments table
ALTER TABLE frequency_assignments
ADD COLUMN IF NOT EXISTS sfaf_id UUID REFERENCES sfafs(id) ON DELETE CASCADE;

-- Create index on sfaf_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_frequency_assignments_sfaf_id ON frequency_assignments(sfaf_id);

-- Add comment explaining the field
COMMENT ON COLUMN frequency_assignments.sfaf_id IS 'Direct reference to the SFAF record that this frequency assignment is based on';

-- Update existing records to link them to their SFAF records via serial/marker
UPDATE frequency_assignments fa
SET sfaf_id = s.id
FROM markers m
JOIN sfafs s ON m.id = s.marker_id
WHERE fa.serial = m.serial
  AND fa.sfaf_id IS NULL;
