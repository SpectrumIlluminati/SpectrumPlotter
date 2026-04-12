-- Migration 033: Add operating area GeoJSON to frequency_requests
-- Stores the user-drawn polygon/circle/rectangle from the map widget as JSONB.
ALTER TABLE frequency_requests
    ADD COLUMN IF NOT EXISTS operating_area_geojson JSONB;

CREATE INDEX IF NOT EXISTS idx_frequency_requests_operating_area
    ON frequency_requests USING GIN (operating_area_geojson);
