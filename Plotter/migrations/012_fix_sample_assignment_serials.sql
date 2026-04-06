-- Migration: Fix sample frequency assignments to use real marker serials
-- Created: 2025-12-30
-- Purpose: Update sample frequency assignments to reference actual markers in the database

-- Update existing sample assignments with real marker serials from the database
-- Using the first three markers we can find

-- First assignment for 1st Brigade - use FREQ100000
UPDATE frequency_assignments
SET serial = 'FREQ100000'
WHERE unit_id = '10000000-0000-0000-0000-000000000001'
  AND frequency = '123.450 MHz'
  AND serial = 'SAMPLE001';

-- Second assignment for 1st Brigade - use FREQ099999
UPDATE frequency_assignments
SET serial = 'FREQ099999'
WHERE unit_id = '10000000-0000-0000-0000-000000000001'
  AND frequency = '123.475 MHz'
  AND serial = 'SAMPLE002';

-- Assignment for 1-504 PIR - use FREQ099998
UPDATE frequency_assignments
SET serial = 'FREQ099998'
WHERE unit_id = '10000000-0000-0000-0000-000000000002'
  AND frequency = '149.350 MHz'
  AND serial = 'SAMPLE003';
