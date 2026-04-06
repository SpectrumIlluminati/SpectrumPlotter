-- Migration: Create system configuration table
-- Created: 2026-03-07

DROP TABLE IF EXISTS system_config;

CREATE TABLE system_config (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         VARCHAR(100) UNIQUE NOT NULL,
    value       TEXT NOT NULL,
    value_type  VARCHAR(20) NOT NULL DEFAULT 'string',
    category    VARCHAR(50) NOT NULL,
    description TEXT,
    is_readonly BOOLEAN DEFAULT false,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_config_key      ON system_config(key);
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);

INSERT INTO system_config (key, value, value_type, category, description) VALUES
    ('sfaf.default_classification',  'UNCLASS',   'string',  'SFAF Processing',     'Default classification level pre-filled on import'),
    ('sfaf.import_strict_validation','false',      'boolean', 'SFAF Processing',     'Reject records with missing required fields during import'),
    ('sfaf.serial_auto_generate',    'true',       'boolean', 'SFAF Processing',     'Auto-assign serial numbers when blank'),
    ('map.default_lat',              '38.8951',    'float',   'Map',                 'Default map center latitude on load'),
    ('map.default_lng',              '-77.0364',   'float',   'Map',                 'Default map center longitude on load'),
    ('map.default_zoom',             '6',          'integer', 'Map',                 'Default zoom level'),
    ('map.cluster_radius',           '80',         'integer', 'Map',                 'Marker clustering radius in pixels (0 to disable)'),
    ('map.default_layer',            'satellite',  'string',  'Map',                 'Default base map layer (satellite, street, topo)'),
    ('freq.default_assignment_days', '365',        'integer', 'Frequency Management','Default expiration duration for new frequency assignments'),
    ('freq.expiration_warn_days',    '30',         'integer', 'Frequency Management','Days before expiration to flag a warning'),
    ('freq.default_priority',        'routine',    'string',  'Frequency Management','Default priority for new assignments (routine, priority, urgent, emergency)'),
    ('auth.session_timeout_minutes', '480',        'integer', 'Auth & Session',      'Idle session expiry in minutes (480 = 8 hours)'),
    ('auth.max_login_attempts',      '5',          'integer', 'Auth & Session',      'Failed login attempts before account lockout'),
    ('ui.records_per_page',          '50',         'integer', 'UI',                  'Default number of records per page in tables'),
    ('ui.default_tab',               'units',      'string',  'UI',                  'Default tab shown when opening the Table Manager')
ON CONFLICT (key) DO NOTHING;
