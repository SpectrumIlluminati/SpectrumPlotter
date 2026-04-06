-- Migration: Create sfaf_field_occurrences table to store multi-occurrence SFAF fields
-- Purpose: Support MC4EB Pub 7 CHG 1 fields with multiple occurrences (e.g., 530, 530/2, 530/3 for polygons)
-- Date: 2025-12-28

-- Drop table if exists (for development/testing)
DROP TABLE IF EXISTS sfaf_field_occurrences CASCADE;

-- Create sfaf_field_occurrences table
CREATE TABLE sfaf_field_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sfaf_id UUID NOT NULL REFERENCES sfafs(id) ON DELETE CASCADE,
    field_number VARCHAR(10) NOT NULL,  -- e.g., "530", "340", "405"
    occurrence INT NOT NULL DEFAULT 1,  -- 1 for base field, 2+ for /2, /3, etc.
    value TEXT,                         -- Field value (can be large for some fields)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure unique combination of sfaf_id, field_number, and occurrence
    CONSTRAINT unique_field_occurrence UNIQUE (sfaf_id, field_number, occurrence)
);

-- Create indexes for efficient querying
CREATE INDEX idx_field_occurrences_sfaf_id ON sfaf_field_occurrences(sfaf_id);
CREATE INDEX idx_field_occurrences_field_number ON sfaf_field_occurrences(field_number);
CREATE INDEX idx_field_occurrences_field_sfaf ON sfaf_field_occurrences(field_number, sfaf_id);

-- Create index specifically for Field 530 polygon queries
CREATE INDEX idx_field_occurrences_530 ON sfaf_field_occurrences(sfaf_id, field_number)
WHERE field_number = '530';

COMMENT ON TABLE sfaf_field_occurrences IS 'Stores multiple occurrences of SFAF fields (e.g., 530, 530/2, 530/3 for polygon coordinates)';
COMMENT ON COLUMN sfaf_field_occurrences.field_number IS 'Base field number without occurrence suffix (e.g., "530" not "530/2")';
COMMENT ON COLUMN sfaf_field_occurrences.occurrence IS 'Occurrence number: 1 for base field, 2 for /2, 3 for /3, etc.';
COMMENT ON COLUMN sfaf_field_occurrences.value IS 'Field value as specified in MC4EB Pub 7 CHG 1';
