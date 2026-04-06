-- Migration: Create geometry tables for circles, polygons, and rectangles
-- Created: 2026-01-03

-- Drop existing tables in correct order (child tables first)
DROP TABLE IF EXISTS geometry_rectangles CASCADE;
DROP TABLE IF EXISTS geometry_polygons CASCADE;
DROP TABLE IF EXISTS geometry_polygon_vertices CASCADE;
DROP TABLE IF EXISTS geometry_circles CASCADE;
DROP TABLE IF EXISTS geometries CASCADE;

-- Main geometries table
CREATE TABLE geometries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marker_id UUID REFERENCES markers(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('circle', 'polygon', 'rectangle')),
    serial VARCHAR(50) NOT NULL,
    color VARCHAR(20) DEFAULT '#FF0000',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Circle-specific properties
CREATE TABLE geometry_circles (
    geometry_id UUID PRIMARY KEY REFERENCES geometries(id) ON DELETE CASCADE,
    radius DOUBLE PRECISION NOT NULL,
    radius_km DOUBLE PRECISION,
    radius_nm DOUBLE PRECISION,
    area DOUBLE PRECISION,
    unit VARCHAR(10) DEFAULT 'km'
);

-- Polygon vertices
CREATE TABLE geometry_polygon_vertices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geometry_id UUID REFERENCES geometries(id) ON DELETE CASCADE,
    vertex_order INTEGER NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    UNIQUE(geometry_id, vertex_order)
);

-- Polygon metadata
CREATE TABLE geometry_polygons (
    geometry_id UUID PRIMARY KEY REFERENCES geometries(id) ON DELETE CASCADE,
    vertices_count INTEGER NOT NULL,
    area DOUBLE PRECISION
);

-- Rectangle bounds
CREATE TABLE geometry_rectangles (
    geometry_id UUID PRIMARY KEY REFERENCES geometries(id) ON DELETE CASCADE,
    sw_lat DOUBLE PRECISION NOT NULL,
    sw_lng DOUBLE PRECISION NOT NULL,
    ne_lat DOUBLE PRECISION NOT NULL,
    ne_lng DOUBLE PRECISION NOT NULL,
    area DOUBLE PRECISION
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_geometries_marker_id ON geometries(marker_id);
CREATE INDEX IF NOT EXISTS idx_geometries_serial ON geometries(serial);
CREATE INDEX IF NOT EXISTS idx_geometries_type ON geometries(type);
CREATE INDEX IF NOT EXISTS idx_polygon_vertices_geometry_id ON geometry_polygon_vertices(geometry_id);
CREATE INDEX IF NOT EXISTS idx_polygon_vertices_order ON geometry_polygon_vertices(geometry_id, vertex_order);
