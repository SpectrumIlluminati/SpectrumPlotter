-- Migration 051: Add stop_buzzer contact field to frequency_requests.
-- This appends to SFAF field 520 (Description of Use / Justification).
ALTER TABLE frequency_requests
    ADD COLUMN IF NOT EXISTS stop_buzzer TEXT;
