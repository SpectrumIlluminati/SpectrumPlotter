-- Migration: Create core database tables
-- Created: 2026-01-03

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Markers table
CREATE TABLE IF NOT EXISTS markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial VARCHAR(50) UNIQUE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    frequency VARCHAR(50),
    notes TEXT,
    marker_type VARCHAR(50) NOT NULL DEFAULT 'manual',
    is_draggable BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IRAC Notes reference table
CREATE TABLE IF NOT EXISTS irac_notes (
    code VARCHAR(10) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    field_placement INTEGER,
    agency TEXT[],
    technical_specs JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IRAC Note Associations (many-to-many between markers and IRAC notes)
CREATE TABLE IF NOT EXISTS marker_irac_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marker_id UUID REFERENCES markers(id) ON DELETE CASCADE,
    irac_note_code VARCHAR(10) REFERENCES irac_notes(code) ON DELETE CASCADE,
    field_number INTEGER,
    occurrence_number INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(marker_id, irac_note_code, field_number, occurrence_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_markers_serial ON markers(serial);
CREATE INDEX IF NOT EXISTS idx_markers_created_at ON markers(created_at);
CREATE INDEX IF NOT EXISTS idx_marker_irac_notes_marker_id ON marker_irac_notes(marker_id);
CREATE INDEX IF NOT EXISTS idx_marker_irac_notes_code ON marker_irac_notes(irac_note_code);
