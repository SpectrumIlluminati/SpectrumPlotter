-- Migration 035: Add SFAF record type to frequency_assignments
-- A = Permanent Assignment  (only Admin/NTIA/Agency may create)
-- P = Permanent Proposal    (ISM+ may create)
-- S = Temporary Proposal    (ISM+ may create)
-- T = Temporary Assignment  (only Admin/NTIA/Agency may create)

ALTER TABLE frequency_assignments
    ADD COLUMN IF NOT EXISTS sfaf_record_type CHAR(1) NOT NULL DEFAULT 'A'
        CHECK (sfaf_record_type IN ('A','P','S','T'));

COMMENT ON COLUMN frequency_assignments.sfaf_record_type IS
    'SFAF record type: A=Permanent Assignment, P=Permanent Proposal, S=Temporary Proposal, T=Temporary Assignment';

-- Back-fill existing rows: assume all existing records without an end_date are
-- permanent assignments (A) and those with an end_date are temporary assignments (T).
UPDATE frequency_assignments
   SET sfaf_record_type = CASE WHEN expiration_date IS NULL THEN 'A' ELSE 'T' END
 WHERE sfaf_record_type = 'A';  -- only rows that still have the default
