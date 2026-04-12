-- Migration 052: Status log and lateral coordination for pending frequency requests

-- Comment log for pending/under-review frequency requests
CREATE TABLE IF NOT EXISTS request_comments (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID        NOT NULL REFERENCES frequency_requests(id) ON DELETE CASCADE,
    created_by UUID        REFERENCES users(id) ON DELETE SET NULL,
    workbox    TEXT        NOT NULL,
    body       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_comments_request_id ON request_comments(request_id);

-- Lateral coordination workboxes for pending frequency requests
CREATE TABLE IF NOT EXISTS request_coordinations (
    request_id UUID NOT NULL REFERENCES frequency_requests(id) ON DELETE CASCADE,
    workbox    TEXT NOT NULL,
    added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (request_id, workbox)
);
