-- Migration 041: Add TX antenna type to frequency_requests for SFAF field 354
ALTER TABLE frequency_requests
    ADD COLUMN IF NOT EXISTS antenna_type  VARCHAR(100);  -- TX antenna type (SFAF Field 354)
