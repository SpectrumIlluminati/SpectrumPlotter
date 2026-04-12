-- Migration 044: Add TX/RX beamwidth fields (SFAF 360, 361, 460, 461)
ALTER TABLE frequency_requests
    ADD COLUMN IF NOT EXISTS tx_horiz_beamwidth_deg NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS tx_vert_beamwidth_deg  NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS rx_horiz_beamwidth_deg NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS rx_vert_beamwidth_deg  NUMERIC(6,2);
