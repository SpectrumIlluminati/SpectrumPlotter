-- Migration 027: Link users to their installation
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS installation_id UUID REFERENCES installations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_installation_id ON users(installation_id);
