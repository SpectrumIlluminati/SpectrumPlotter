// models/user_models.go
package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a system user
type User struct {
	ID                uuid.UUID  `json:"id" db:"id"`
	Username          string     `json:"username" db:"username"`
	Email             string     `json:"email" db:"email"`
	PasswordHash      *string    `json:"-" db:"password_hash"` // Never expose in JSON
	FullName          string     `json:"full_name" db:"full_name"`
	Organization      string     `json:"organization" db:"organization"`
	Role              string     `json:"role" db:"role"` // admin, operator, viewer
	IsActive          bool       `json:"is_active" db:"is_active"`
	InstallationID    *uuid.UUID `json:"installation_id,omitempty" db:"installation_id"`
	Phone             *string    `json:"phone,omitempty" db:"phone"`
	PhoneDSN          *string    `json:"phone_dsn,omitempty" db:"phone_dsn"`
	UnifiedCommand    *string    `json:"unified_command,omitempty" db:"unified_command"`
	LastLogin         *time.Time `json:"last_login" db:"last_login"`
	DefaultISMOffice  *string    `json:"default_ism_office,omitempty" db:"default_ism_office"`
	ServiceBranch     *string    `json:"service_branch,omitempty" db:"service_branch"`
	PayGrade          *string    `json:"pay_grade,omitempty" db:"pay_grade"`
	CertificateSerial *string    `json:"certificate_serial,omitempty" db:"certificate_serial"`
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
}

// ClientCertificate represents a PKI client certificate
type ClientCertificate struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	UserID         uuid.UUID  `json:"user_id" db:"user_id"`
	SerialNumber   string     `json:"serial_number" db:"serial_number"`
	CommonName     string     `json:"common_name" db:"common_name"`
	Organization   string     `json:"organization" db:"organization"`
	EmailAddress   string     `json:"email_address" db:"email_address"`
	Issuer         string     `json:"issuer" db:"issuer"`
	NotBefore      time.Time  `json:"not_before" db:"not_before"`
	NotAfter       time.Time  `json:"not_after" db:"not_after"`
	Fingerprint    string     `json:"fingerprint" db:"fingerprint"`
	IsRevoked      bool       `json:"is_revoked" db:"is_revoked"`
	RevokedAt      *time.Time `json:"revoked_at,omitempty" db:"revoked_at"`
	RevokedReason  string     `json:"revoked_reason,omitempty" db:"revoked_reason"`
	LastUsed       *time.Time `json:"last_used,omitempty" db:"last_used"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
}

// Session represents an authenticated user session
type Session struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	UserID          uuid.UUID  `json:"user_id" db:"user_id"`
	Token           string     `json:"token" db:"token"`
	AuthMethod      string     `json:"auth_method" db:"auth_method"` // pki, password, api_key
	IPAddress       *string    `json:"ip_address" db:"ip_address"` // nullable in DB
	UserAgent       *string    `json:"user_agent" db:"user_agent"` // nullable in DB
	ExpiresAt       time.Time  `json:"expires_at" db:"expires_at"`
	LastActivity    time.Time  `json:"last_activity" db:"last_activity"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
}

// AuditLog represents authentication and activity audit log
type AuditLog struct {
	ID          uuid.UUID              `json:"id" db:"id"`
	UserID      *uuid.UUID             `json:"user_id,omitempty" db:"user_id"`
	Action      string                 `json:"action" db:"action"`
	Resource    *string                `json:"resource,omitempty" db:"resource"` // nullable in DB
	Result      string                 `json:"result" db:"result"` // success, failure, denied
	IPAddress   *string                `json:"ip_address" db:"ip_address"` // nullable in DB
	UserAgent   *string                `json:"user_agent" db:"user_agent"` // nullable in DB
	Details     map[string]interface{} `json:"details,omitempty"`
	CreatedAt   time.Time              `json:"created_at" db:"created_at"`
}

// AccountRequest represents a self-service account registration request
type AccountRequest struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	Username      string     `json:"username" db:"username"`
	Email         string     `json:"email" db:"email"`
	FullName      string     `json:"full_name" db:"full_name"`
	Organization     string     `json:"organization" db:"organization"`
	UnifiedCommand   string     `json:"unified_command" db:"unified_command"`
	Unit             string     `json:"unit" db:"unit"`
	Phone         string     `json:"phone" db:"phone"`
	Justification string     `json:"justification" db:"justification"`
	RequestedRole     string     `json:"requested_role" db:"requested_role"`
	UnitID            *uuid.UUID `json:"unit_id,omitempty" db:"unit_id"`
	RequestedUnitName *string    `json:"requested_unit_name,omitempty" db:"requested_unit_name"`
	InstallationID    *uuid.UUID `json:"installation_id,omitempty" db:"installation_id"`
	Status            string     `json:"status" db:"status"` // pending, approved, denied
	ReviewedBy        *uuid.UUID `json:"reviewed_by,omitempty" db:"reviewed_by"`
	ReviewNotes   *string    `json:"review_notes,omitempty" db:"review_notes"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
}

// Request/Response models
type PKILoginRequest struct {
	CertificatePEM string `json:"certificate_pem" binding:"required"`
}

type PKILoginResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Token   string `json:"token,omitempty"`
	User    *User  `json:"user,omitempty"`
}

type PasswordLoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type PasswordLoginResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Token   string `json:"token,omitempty"`
	User    *User  `json:"user,omitempty"`
}

type VerifySessionRequest struct {
	Token string `json:"token" binding:"required"`
}

type VerifySessionResponse struct {
	Valid bool  `json:"valid"`
	User  *User `json:"user,omitempty"`
}
