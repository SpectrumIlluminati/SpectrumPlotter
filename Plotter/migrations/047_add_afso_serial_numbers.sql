-- Migration 047: Add AFSO serial number range (26000–26999) for AFSOC allocation.
-- Expands prefix column to VARCHAR(5) to accommodate the 4-character prefix.

ALTER TABLE serial_numbers
    ALTER COLUMN prefix TYPE VARCHAR(5);

-- AFSO 26000–26999
INSERT INTO serial_numbers (prefix, number, serial)
SELECT 'AFSO', n, 'AFSO' || n
FROM generate_series(26000, 26999) AS n
ON CONFLICT (prefix, number) DO NOTHING;
