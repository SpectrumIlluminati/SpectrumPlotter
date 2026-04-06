-- Migration 032: Add antenna specification fields to frequency_requests
ALTER TABLE frequency_requests
    ADD COLUMN IF NOT EXISTS antenna_make_model  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS antenna_gain_dbi    NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS antenna_polarization VARCHAR(20),
    ADD COLUMN IF NOT EXISTS antenna_orientation  VARCHAR(50);
