-- Migration 045: Add MAJCOM allocation tracking to serial_numbers
-- AFSMO (agency role) can allocate blocks of AF serial numbers to MAJCOM units.

ALTER TABLE serial_numbers
    ADD COLUMN IF NOT EXISTS allocated_unit_id UUID REFERENCES units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_serial_numbers_allocated_unit
    ON serial_numbers (allocated_unit_id);
