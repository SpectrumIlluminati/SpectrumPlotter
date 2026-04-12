-- Migration 020: Account request queue for self-service registration
CREATE TABLE IF NOT EXISTS account_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    organization    VARCHAR(255),
    unit            VARCHAR(255),
    phone           VARCHAR(50),
    justification   TEXT,
    requested_role  VARCHAR(50) NOT NULL DEFAULT 'operator',
    status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, denied
    reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    review_notes    TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_requests_status ON account_requests(status);
CREATE INDEX IF NOT EXISTS idx_account_requests_email  ON account_requests(email);
