-- Migration 037: Add routed_to_workbox for organizational workbox routing
-- replaces the per-user routed_to with a named-workbox destination.
ALTER TABLE frequency_assignments
    ADD COLUMN IF NOT EXISTS routed_to_workbox VARCHAR(100);

COMMENT ON COLUMN frequency_assignments.routed_to_workbox IS
    'When sfaf_record_type is P or S, this is the named workbox (e.g. GAFC, Barksdale ISM, AFSOC) the proposal is routed to. NULL means visible to all ISM workboxes.';
