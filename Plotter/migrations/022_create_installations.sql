-- Migration 022: Installations table for 206 inbox routing
CREATE TABLE IF NOT EXISTS installations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(255) NOT NULL,
    code         VARCHAR(50),
    organization VARCHAR(100),
    state        VARCHAR(100),
    country      VARCHAR(100) NOT NULL DEFAULT 'USA',
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE installations IS 'Military installations that act as 206 (Form 206) inbox routing destinations for frequency requests';

CREATE INDEX IF NOT EXISTS idx_installations_is_active ON installations(is_active);
CREATE INDEX IF NOT EXISTS idx_installations_code      ON installations(code);
