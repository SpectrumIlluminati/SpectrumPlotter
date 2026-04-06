-- Migration 019: Refactor geometries table to use JSONB columns
-- Replaces separate lat/lng/serial/color columns and child tables
-- with coordinates JSONB and properties JSONB to match repository code.

-- Step 1: Add new JSONB columns
ALTER TABLE geometries ADD COLUMN IF NOT EXISTS coordinates JSONB;
ALTER TABLE geometries ADD COLUMN IF NOT EXISTS properties JSONB;

-- Step 2: Migrate existing latitude/longitude data into coordinates JSONB
UPDATE geometries
SET coordinates = jsonb_build_object('latitude', latitude, 'longitude', longitude)
WHERE coordinates IS NULL;

-- Step 3: Migrate circle child table data into properties JSONB
UPDATE geometries g
SET properties = jsonb_build_object(
    'radius',    gc.radius,
    'radius_km', gc.radius_km,
    'radius_nm', gc.radius_nm,
    'area',      gc.area,
    'unit',      gc.unit
)
FROM geometry_circles gc
WHERE g.id = gc.geometry_id AND g.type = 'circle';

-- Step 4: Migrate polygon child table data into properties JSONB
UPDATE geometries g
SET properties = (
    SELECT jsonb_build_object(
        'points',   COALESCE(
            (SELECT jsonb_agg(jsonb_build_object('lat', v.latitude, 'lng', v.longitude) ORDER BY v.vertex_order)
             FROM geometry_polygon_vertices v WHERE v.geometry_id = g.id),
            '[]'::jsonb
        ),
        'vertices', gp.vertices_count,
        'area',     gp.area
    )
    FROM geometry_polygons gp WHERE gp.geometry_id = g.id
)
WHERE g.type = 'polygon';

-- Step 5: Migrate rectangle child table data into properties JSONB
UPDATE geometries g
SET properties = (
    SELECT jsonb_build_object(
        'bounds', jsonb_build_array(
            jsonb_build_object('lat', gr.sw_lat, 'lng', gr.sw_lng),
            jsonb_build_object('lat', gr.ne_lat, 'lng', gr.ne_lng)
        ),
        'area', gr.area
    )
    FROM geometry_rectangles gr WHERE gr.geometry_id = g.id
)
WHERE g.type = 'rectangle';

-- Step 6: Set NOT NULL constraints now that data is migrated
ALTER TABLE geometries ALTER COLUMN coordinates SET NOT NULL;
ALTER TABLE geometries ALTER COLUMN properties SET DEFAULT '{}'::jsonb;
UPDATE geometries SET properties = '{}'::jsonb WHERE properties IS NULL;
ALTER TABLE geometries ALTER COLUMN properties SET NOT NULL;

-- Step 7: Drop child tables (data is now in JSONB columns)
DROP TABLE IF EXISTS geometry_polygon_vertices CASCADE;
DROP TABLE IF EXISTS geometry_circles CASCADE;
DROP TABLE IF EXISTS geometry_polygons CASCADE;
DROP TABLE IF EXISTS geometry_rectangles CASCADE;

-- Step 8: Drop old separate columns
ALTER TABLE geometries DROP COLUMN IF EXISTS serial;
ALTER TABLE geometries DROP COLUMN IF EXISTS color;
ALTER TABLE geometries DROP COLUMN IF EXISTS latitude;
ALTER TABLE geometries DROP COLUMN IF EXISTS longitude;

-- Step 9: Drop index on serial (no longer exists)
DROP INDEX IF EXISTS idx_geometries_serial;

-- Step 10: Add index on coordinates for potential geospatial queries
CREATE INDEX IF NOT EXISTS idx_geometries_coordinates ON geometries USING gin(coordinates);
