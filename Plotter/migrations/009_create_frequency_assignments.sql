-- Migration: Create frequency assignment tables
-- Created: 2025-12-28
-- Purpose: Track unit frequency assignments and frequency requests

-- Units table - represents military units or organizations
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    unit_code VARCHAR(50) UNIQUE NOT NULL, -- e.g., "1ST-BDE-82ND-ABN"
    parent_unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    unit_type VARCHAR(50), -- brigade, battalion, company, platoon, etc.
    organization VARCHAR(255), -- Army, Navy, Air Force, Marines, etc.
    location VARCHAR(255),
    commander_name VARCHAR(255),
    commander_email VARCHAR(255),
    s6_poc_name VARCHAR(255), -- Signal Officer point of contact
    s6_poc_email VARCHAR(255),
    s6_poc_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Unit assignments - users can belong to multiple units
CREATE TABLE IF NOT EXISTS user_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- commander, s6, member, viewer
    is_primary BOOLEAN DEFAULT false, -- primary unit assignment
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(user_id, unit_id)
);

-- Frequency assignments - frequencies assigned to units
CREATE TABLE IF NOT EXISTS frequency_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
    frequency VARCHAR(15) NOT NULL, -- e.g., "123.456 MHz"
    frequency_mhz NUMERIC(11,6), -- numeric value for sorting/filtering
    assignment_type VARCHAR(50) NOT NULL, -- primary, alternate, emergency, tactical
    purpose VARCHAR(255), -- command_net, admin, medevac, fires, etc.
    net_name VARCHAR(100), -- e.g., "Command Net", "Admin/Log Net"
    callsign VARCHAR(50), -- unit callsign for this frequency
    emission_designator VARCHAR(15), -- e.g., "16K0F3E"
    bandwidth VARCHAR(10), -- e.g., "25 kHz"
    power_watts INTEGER, -- transmitter power
    authorized_radius_km NUMERIC(6,2), -- authorization radius
    assignment_date DATE,
    expiration_date DATE,
    assignment_authority VARCHAR(100), -- who authorized (NTIA, FCC, local frequency manager)
    authorization_number VARCHAR(100), -- reference number
    priority VARCHAR(20) DEFAULT 'routine', -- emergency, urgent, priority, routine
    is_encrypted BOOLEAN DEFAULT false,
    encryption_type VARCHAR(50), -- AES256, TYPE1, etc.
    classification VARCHAR(20) DEFAULT 'UNCLASS', -- UNCLASS, FOUO
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Frequency requests - units requesting new frequencies or changes
CREATE TABLE IF NOT EXISTS frequency_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
    requested_by UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    request_type VARCHAR(50) NOT NULL, -- new_assignment, modification, renewal, cancellation
    status VARCHAR(50) DEFAULT 'pending', -- pending, under_review, approved, denied, cancelled
    priority VARCHAR(20) DEFAULT 'routine', -- emergency, urgent, priority, routine

    -- Requested frequency details
    requested_frequency VARCHAR(15), -- specific frequency requested (if known)
    frequency_range_min NUMERIC(11,6), -- minimum acceptable frequency
    frequency_range_max NUMERIC(11,6), -- maximum acceptable frequency
    purpose VARCHAR(255) NOT NULL, -- why is this frequency needed
    net_name VARCHAR(100),
    callsign VARCHAR(50),
    assignment_type VARCHAR(50), -- primary, alternate, emergency, tactical

    -- Technical requirements
    emission_designator VARCHAR(15),
    bandwidth VARCHAR(10),
    power_watts INTEGER,
    coverage_area VARCHAR(255), -- geographic area needed
    authorized_radius_km NUMERIC(6,2),

    -- Operational details
    start_date DATE NOT NULL, -- when frequency is needed
    end_date DATE, -- when frequency will no longer be needed
    hours_of_operation VARCHAR(100), -- e.g., "24/7", "0600-1800 local"
    num_transmitters INTEGER DEFAULT 1,
    num_receivers INTEGER DEFAULT 1,

    -- Security
    is_encrypted BOOLEAN DEFAULT false,
    encryption_type VARCHAR(50),
    classification VARCHAR(20) DEFAULT 'UNCLASS', -- UNCLASS, FOUO

    -- Coordination
    requires_coordination BOOLEAN DEFAULT false,
    coordination_notes TEXT,

    -- Justification
    justification TEXT NOT NULL, -- detailed justification for request
    mission_impact TEXT, -- impact if request is denied

    -- Review/Approval workflow
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    approval_notes TEXT,
    denied_reason TEXT,

    -- If approved, link to the created assignment
    assignment_id UUID REFERENCES frequency_assignments(id) ON DELETE SET NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Frequency conflicts - track potential interference issues
CREATE TABLE IF NOT EXISTS frequency_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    frequency_assignment_id UUID REFERENCES frequency_assignments(id) ON DELETE CASCADE,
    conflicting_assignment_id UUID REFERENCES frequency_assignments(id) ON DELETE CASCADE,
    conflict_type VARCHAR(50), -- geographic_overlap, frequency_adjacent, co_channel
    distance_km NUMERIC(8,2), -- distance between transmitters
    severity VARCHAR(20), -- critical, high, medium, low
    mitigation_notes TEXT,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Frequency usage logs - track when frequencies are used
CREATE TABLE IF NOT EXISTS frequency_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    frequency_assignment_id UUID REFERENCES frequency_assignments(id) ON DELETE CASCADE,
    used_by UUID REFERENCES users(id) ON DELETE SET NULL,
    usage_start TIMESTAMP NOT NULL,
    usage_end TIMESTAMP,
    location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_units_unit_code ON units(unit_code);
CREATE INDEX IF NOT EXISTS idx_units_organization ON units(organization);
CREATE INDEX IF NOT EXISTS idx_units_parent_unit_id ON units(parent_unit_id);

CREATE INDEX IF NOT EXISTS idx_user_units_user_id ON user_units(user_id);
CREATE INDEX IF NOT EXISTS idx_user_units_unit_id ON user_units(unit_id);

CREATE INDEX IF NOT EXISTS idx_frequency_assignments_unit_id ON frequency_assignments(unit_id);
CREATE INDEX IF NOT EXISTS idx_frequency_assignments_frequency_mhz ON frequency_assignments(frequency_mhz);
CREATE INDEX IF NOT EXISTS idx_frequency_assignments_is_active ON frequency_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_frequency_assignments_expiration_date ON frequency_assignments(expiration_date);

CREATE INDEX IF NOT EXISTS idx_frequency_requests_unit_id ON frequency_requests(unit_id);
CREATE INDEX IF NOT EXISTS idx_frequency_requests_requested_by ON frequency_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_frequency_requests_status ON frequency_requests(status);
CREATE INDEX IF NOT EXISTS idx_frequency_requests_priority ON frequency_requests(priority);

CREATE INDEX IF NOT EXISTS idx_frequency_conflicts_assignment ON frequency_conflicts(frequency_assignment_id);
CREATE INDEX IF NOT EXISTS idx_frequency_conflicts_resolved ON frequency_conflicts(resolved);

CREATE INDEX IF NOT EXISTS idx_frequency_usage_logs_assignment ON frequency_usage_logs(frequency_assignment_id);
CREATE INDEX IF NOT EXISTS idx_frequency_usage_logs_used_by ON frequency_usage_logs(used_by);

-- Insert demo units for development/testing
INSERT INTO units (id, name, unit_code, organization, location, is_active)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    '1st Brigade, 82nd Airborne Division',
    '1ST-BDE-82ND-ABN',
    'Army',
    'Fort Bragg, NC',
    true
) ON CONFLICT (unit_code) DO NOTHING;

INSERT INTO units (id, name, unit_code, organization, location, parent_unit_id, is_active)
VALUES (
    '10000000-0000-0000-0000-000000000002',
    '1st Battalion, 504th Parachute Infantry Regiment',
    '1-504-PIR',
    'Army',
    'Fort Bragg, NC',
    '10000000-0000-0000-0000-000000000001',
    true
) ON CONFLICT (unit_code) DO NOTHING;

INSERT INTO units (id, name, unit_code, organization, location, is_active)
VALUES (
    '10000000-0000-0000-0000-000000000003',
    'Naval Special Warfare Group 1',
    'NSWG-1',
    'Navy',
    'Coronado, CA',
    true
) ON CONFLICT (unit_code) DO NOTHING;

-- Assign demo users to units
INSERT INTO user_units (user_id, unit_id, role, is_primary)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- admin user
    '10000000-0000-0000-0000-000000000001', -- 1st Brigade
    's6',
    true
) ON CONFLICT (user_id, unit_id) DO NOTHING;

INSERT INTO user_units (user_id, unit_id, role, is_primary)
VALUES (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', -- operator user
    '10000000-0000-0000-0000-000000000002', -- 1-504 PIR
    'member',
    true
) ON CONFLICT (user_id, unit_id) DO NOTHING;

-- Insert demo frequency assignments
INSERT INTO frequency_assignments (
    unit_id, frequency, frequency_mhz, assignment_type, purpose, net_name,
    callsign, assignment_date, expiration_date, is_active
)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    '123.450 MHz',
    123.450000,
    'primary',
    'command_net',
    'Command Net',
    'DRAGON 6',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 year',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO frequency_assignments (
    unit_id, frequency, frequency_mhz, assignment_type, purpose, net_name,
    callsign, assignment_date, expiration_date, is_active
)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    '123.475 MHz',
    123.475000,
    'alternate',
    'command_net',
    'Alternate Command Net',
    'DRAGON 6 ALT',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 year',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO frequency_assignments (
    unit_id, frequency, frequency_mhz, assignment_type, purpose, net_name,
    callsign, assignment_date, expiration_date, is_active
)
VALUES (
    '10000000-0000-0000-0000-000000000002',
    '149.350 MHz',
    149.350000,
    'primary',
    'admin',
    'Admin/Log Net',
    'DEVIL 3',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 year',
    true
) ON CONFLICT DO NOTHING;
