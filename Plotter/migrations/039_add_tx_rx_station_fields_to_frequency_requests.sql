-- Migration 039: Add Tx/Rx station type, elevation, and feedpoint height to frequency_requests
-- Tx fields (transmitter station)
ALTER TABLE frequency_requests
    ADD COLUMN IF NOT EXISTS tx_station_type        VARCHAR(10),   -- 'fixed' or 'mobile'
    ADD COLUMN IF NOT EXISTS tx_elevation_m         NUMERIC(10,2), -- Field 358: site elevation AMSL (meters)
    ADD COLUMN IF NOT EXISTS tx_feedpoint_height_m  NUMERIC(10,2), -- Field 359: antenna feedpoint height AGL (meters)
-- Rx fields (receiver station, when different from Tx)
    ADD COLUMN IF NOT EXISTS rx_same_as_tx          BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS rx_make_model          VARCHAR(200),  -- receiver equipment make/model
    ADD COLUMN IF NOT EXISTS rx_antenna_type        VARCHAR(100),  -- receiver antenna type (Field 354)
    ADD COLUMN IF NOT EXISTS rx_station_type        VARCHAR(10),   -- 'fixed' or 'mobile'
    ADD COLUMN IF NOT EXISTS rx_elevation_m         NUMERIC(10,2), -- Field 358: Rx site elevation AMSL (meters)
    ADD COLUMN IF NOT EXISTS rx_feedpoint_height_m  NUMERIC(10,2); -- Field 359: Rx antenna feedpoint height AGL (meters)
