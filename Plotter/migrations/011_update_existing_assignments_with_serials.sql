-- Migration: Update existing frequency assignments with placeholder serials
-- Created: 2025-12-30
-- Purpose: Add serial values to existing frequency assignments so they can be displayed

-- Update existing frequency assignments with placeholder serial values
-- In a real deployment, these would be actual SFAF marker serials from the database

-- First assignment for 1st Brigade
UPDATE frequency_assignments
SET serial = 'SAMPLE001'
WHERE unit_id = '10000000-0000-0000-0000-000000000001'
  AND frequency = '123.450 MHz'
  AND serial IS NULL;

-- Second assignment for 1st Brigade
UPDATE frequency_assignments
SET serial = 'SAMPLE002'
WHERE unit_id = '10000000-0000-0000-0000-000000000001'
  AND frequency = '123.475 MHz'
  AND serial IS NULL;

-- Assignment for 1-504 PIR
UPDATE frequency_assignments
SET serial = 'SAMPLE003'
WHERE unit_id = '10000000-0000-0000-0000-000000000002'
  AND frequency = '149.350 MHz'
  AND serial IS NULL;

-- Any other NULL serials get a generic placeholder
UPDATE frequency_assignments
SET serial = 'PLACEHOLDER-' || SUBSTRING(id::text, 1, 8)
WHERE serial IS NULL;
