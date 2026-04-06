-- Migration 036: Add routed_to field to frequency_assignments for proposal routing workflow
ALTER TABLE frequency_assignments
    ADD COLUMN IF NOT EXISTS routed_to UUID REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN frequency_assignments.routed_to IS
    'When sfaf_record_type is P or S (proposal), this is the user the ISM routed the record to for review/elevation. NULL means visible to all command-and-above accounts.';
