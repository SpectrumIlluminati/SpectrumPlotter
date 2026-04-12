-- Migration 049: Pre-allocate all AFSO serials directly to AFSOC.
-- AFSO serials are owned and allocated by AFSOC, not managed through AFSMO.

UPDATE serial_numbers
SET allocated_unit_id = (SELECT id FROM units WHERE unit_code = 'AFSOC' LIMIT 1),
    updated_at = NOW()
WHERE prefix = 'AFSO'
  AND allocated_unit_id IS NULL;
