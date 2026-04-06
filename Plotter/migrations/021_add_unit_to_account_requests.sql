-- Migration 021: Add unit selection to account requests
ALTER TABLE account_requests
    ADD COLUMN IF NOT EXISTS unit_id             UUID REFERENCES units(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS requested_unit_name VARCHAR(255);

COMMENT ON COLUMN account_requests.unit_id             IS 'Existing unit the user wants to join';
COMMENT ON COLUMN account_requests.requested_unit_name IS 'Name of a new unit the user is requesting to be created';
