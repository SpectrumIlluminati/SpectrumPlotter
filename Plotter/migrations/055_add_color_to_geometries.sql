-- Migration 055: Restore color column to geometries table
--
-- Migration 019 dropped the color column when refactoring to JSONB, but the
-- geometry service continued to accept and assign colors on every create/update
-- request.  Colors were silently discarded — circles and polygons always
-- rendered with a default color after page reload.
--
-- Color belongs on the parent geometries row (not inside the type-specific
-- JSONB blob) because it applies uniformly to all geometry types.

ALTER TABLE geometries
    ADD COLUMN IF NOT EXISTS color VARCHAR(20) NOT NULL DEFAULT '#3388FF';

COMMENT ON COLUMN geometries.color IS
    'Leaflet rendering color for this geometry (CSS hex or named color).  '
    'Defaults to Leaflet''s default blue (#3388FF).';
