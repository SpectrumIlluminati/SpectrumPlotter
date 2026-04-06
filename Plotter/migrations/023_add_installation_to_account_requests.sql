-- Migration 023: Link account requests to an installation (206 inbox)
ALTER TABLE account_requests
    ADD COLUMN IF NOT EXISTS installation_id UUID REFERENCES installations(id) ON DELETE SET NULL;

COMMENT ON COLUMN account_requests.installation_id IS 'The installation whose 206 inbox will receive frequency requests for this user';
