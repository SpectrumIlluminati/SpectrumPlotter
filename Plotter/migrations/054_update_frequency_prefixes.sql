-- Migration 054: Update frequency prefixes to MC4EB standard
-- Adds K prefix for HF range (2.000–29.999 MHz stored as KHz) and
-- M prefix for all other frequencies.  Idempotent — only runs on
-- rows that have not already been prefixed.

UPDATE markers
SET frequency = CASE
    -- HF range: 2.000–29.999 MHz stored as decimal MHz → convert to KHz with K prefix
    WHEN CAST(frequency AS FLOAT) >= 2.0 AND CAST(frequency AS FLOAT) < 30.0
        THEN 'K' || CAST((CAST(frequency AS FLOAT) * 1000) AS VARCHAR)
    -- All other frequencies: M prefix
    ELSE 'M' || frequency
END
WHERE frequency !~ '^[KM]';  -- skip rows already prefixed

-- Verify
SELECT COUNT(*) AS prefixed_count FROM markers WHERE frequency ~ '^[KM]';
