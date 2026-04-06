-- Migration: Create serial numbers table
-- Prefixes: AF, AR, N, EUR — range 260000–269999
-- Created: 2026-03-29

CREATE TABLE IF NOT EXISTS serial_numbers (
    id           SERIAL PRIMARY KEY,
    prefix       VARCHAR(3)  NOT NULL,
    number       INTEGER     NOT NULL,
    serial       VARCHAR(12) NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'available',
    assigned_to  UUID        REFERENCES frequency_assignments(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (prefix, number)
);

-- AF 260000–269999
INSERT INTO serial_numbers (prefix, number, serial)
SELECT 'AF', n, 'AF  ' || n
FROM generate_series(260000, 269999) AS n
ON CONFLICT (prefix, number) DO NOTHING;

-- AR 260000–269999
INSERT INTO serial_numbers (prefix, number, serial)
SELECT 'AR', n, 'AR  ' || n
FROM generate_series(260000, 269999) AS n
ON CONFLICT (prefix, number) DO NOTHING;

-- N 260000–269999
INSERT INTO serial_numbers (prefix, number, serial)
SELECT 'N', n, 'N   ' || n
FROM generate_series(260000, 269999) AS n
ON CONFLICT (prefix, number) DO NOTHING;

-- EUR 260000–269999
INSERT INTO serial_numbers (prefix, number, serial)
SELECT 'EUR', n, 'EUR ' || n
FROM generate_series(260000, 269999) AS n
ON CONFLICT (prefix, number) DO NOTHING;

-- Index for fast lookups by status and prefix
CREATE INDEX IF NOT EXISTS idx_serial_numbers_prefix_status ON serial_numbers (prefix, status);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_assigned_to   ON serial_numbers (assigned_to);
