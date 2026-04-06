-- Migration 050: Add operating_area_applies_to to frequency_requests.
-- Values: 'T' = Transmitter only, 'R' = Receiver only, 'B' = Both.
-- Defaults to 'B' (both) for backward compatibility.
ALTER TABLE frequency_requests
    ADD COLUMN IF NOT EXISTS operating_area_applies_to VARCHAR(1) NOT NULL DEFAULT 'B'
    CHECK (operating_area_applies_to IN ('T', 'R', 'B'));
