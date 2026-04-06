-- Migration: Create authentication and PKI tables
-- Created: 2025-12-26

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    organization VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'viewer', -- admin, operator, viewer
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    certificate_serial VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client certificates table
CREATE TABLE IF NOT EXISTS client_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    common_name VARCHAR(255) NOT NULL,
    organization VARCHAR(255),
    email_address VARCHAR(255),
    issuer VARCHAR(255),
    not_before TIMESTAMP NOT NULL,
    not_after TIMESTAMP NOT NULL,
    fingerprint VARCHAR(64) UNIQUE NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP,
    revoked_reason TEXT,
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(512) UNIQUE NOT NULL,
    auth_method VARCHAR(50) NOT NULL, -- pki, password, api_key
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(255),
    result VARCHAR(50) NOT NULL, -- success, failure, denied
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_certificate_serial ON users(certificate_serial);
CREATE INDEX IF NOT EXISTS idx_client_certificates_serial ON client_certificates(serial_number);
CREATE INDEX IF NOT EXISTS idx_client_certificates_fingerprint ON client_certificates(fingerprint);
CREATE INDEX IF NOT EXISTS idx_client_certificates_user_id ON client_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Insert demo admin user (for development/testing)
INSERT INTO users (id, username, email, full_name, organization, role, is_active)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin',
    'admin@sfaf-plotter.mil',
    'System Administrator',
    'SFAF Plotter Development',
    'admin',
    true
) ON CONFLICT (username) DO NOTHING;

-- Insert demo operator user
INSERT INTO users (id, username, email, full_name, organization, role, is_active)
VALUES (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'operator',
    'operator@sfaf-plotter.mil',
    'System Operator',
    'SFAF Plotter Development',
    'operator',
    true
) ON CONFLICT (username) DO NOTHING;
