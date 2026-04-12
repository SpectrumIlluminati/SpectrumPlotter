-- Migration 025: Link units to their home installation (206 inbox)
ALTER TABLE units
    ADD COLUMN IF NOT EXISTS installation_id UUID REFERENCES installations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_units_installation ON units(installation_id);

COMMENT ON COLUMN units.installation_id IS 'The installation this unit is assigned to; determines which 206 inbox routes their frequency requests';
