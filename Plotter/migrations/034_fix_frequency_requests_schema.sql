-- Migration 034: Reconcile frequency_requests schema with model
-- Fixes column name mismatches between migration 004 and the FrequencyRequest model,
-- adds missing columns, and removes unused technical_specs column.

-- Rename mismatched columns (guarded — skip if already renamed)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'frequency_requests' AND column_name = 'reviewer_notes') THEN
        ALTER TABLE frequency_requests RENAME COLUMN reviewer_notes TO review_notes;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'frequency_requests' AND column_name = 'rejected_reason') THEN
        ALTER TABLE frequency_requests RENAME COLUMN rejected_reason TO denied_reason;
    END IF;
END $$;

-- Add columns present in model but missing from DB
ALTER TABLE frequency_requests ADD COLUMN IF NOT EXISTS mission_impact TEXT;
ALTER TABLE frequency_requests ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES frequency_assignments(id) ON DELETE SET NULL;

-- Drop unused column that has no model mapping (causes sqlx scan errors)
ALTER TABLE frequency_requests DROP COLUMN IF EXISTS technical_specs;
