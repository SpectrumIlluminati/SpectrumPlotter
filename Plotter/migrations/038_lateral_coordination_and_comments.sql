-- Migration 038: Lateral coordination workboxes and per-assignment comment log

-- Which workboxes are laterally coordinated on a proposal (advisory; originator keeps edit authority)
CREATE TABLE IF NOT EXISTS assignment_coordinations (
    assignment_id UUID NOT NULL REFERENCES frequency_assignments(id) ON DELETE CASCADE,
    workbox       TEXT NOT NULL,
    added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (assignment_id, workbox)
);

-- Comment log attached to frequency assignment proposals
CREATE TABLE IF NOT EXISTS assignment_comments (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID        NOT NULL REFERENCES frequency_assignments(id) ON DELETE CASCADE,
    created_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
    workbox       TEXT        NOT NULL,
    body          TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_comments_assignment_id ON assignment_comments(assignment_id);
