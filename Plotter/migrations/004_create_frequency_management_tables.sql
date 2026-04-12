-- Migration: Create frequency management tables
-- Created: 2026-01-03

-- Units table (military organizations)
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    unit_code VARCHAR(50) UNIQUE NOT NULL,
    parent_unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    unit_type VARCHAR(100),
    organization VARCHAR(255),
    location VARCHAR(255),
    commander_name VARCHAR(255),
    commander_email VARCHAR(255),
    s6_poc_name VARCHAR(255),
    s6_poc_email VARCHAR(255),
    s6_poc_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Unit assignments
CREATE TABLE IF NOT EXISTS user_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(user_id, unit_id)
);

-- Frequency requests table
CREATE TABLE IF NOT EXISTS frequency_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
    request_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority VARCHAR(50) NOT NULL DEFAULT 'routine',
    requested_frequency VARCHAR(50),
    frequency_range_min DOUBLE PRECISION,
    frequency_range_max DOUBLE PRECISION,
    purpose TEXT NOT NULL,
    net_name VARCHAR(255),
    callsign VARCHAR(50),
    assignment_type VARCHAR(50),
    emission_designator VARCHAR(50),
    bandwidth VARCHAR(50),
    power_watts INTEGER,
    coverage_area TEXT,
    authorized_radius_km DOUBLE PRECISION,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    hours_of_operation VARCHAR(255),
    num_transmitters INTEGER,
    num_receivers INTEGER,
    is_encrypted BOOLEAN DEFAULT false,
    encryption_type VARCHAR(100),
    classification VARCHAR(50) NOT NULL DEFAULT 'UNCLASSIFIED',
    requires_coordination BOOLEAN DEFAULT false,
    coordination_notes TEXT,
    justification TEXT NOT NULL,
    technical_specs JSONB,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    reviewer_notes TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    approval_notes TEXT,
    rejected_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_units_code ON units(unit_code);
CREATE INDEX IF NOT EXISTS idx_units_parent ON units(parent_unit_id);
CREATE INDEX IF NOT EXISTS idx_user_units_user ON user_units(user_id);
CREATE INDEX IF NOT EXISTS idx_user_units_unit ON user_units(unit_id);
CREATE INDEX IF NOT EXISTS idx_frequency_requests_unit ON frequency_requests(unit_id);
CREATE INDEX IF NOT EXISTS idx_frequency_requests_status ON frequency_requests(status);
CREATE INDEX IF NOT EXISTS idx_frequency_requests_requested_by ON frequency_requests(requested_by);
