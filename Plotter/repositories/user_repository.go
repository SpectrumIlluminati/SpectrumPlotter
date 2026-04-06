// repositories/user_repository.go
package repositories

import (
	"database/sql"
	"sfaf-plotter/models"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type UserRepository struct {
	db *sqlx.DB
}

func NewUserRepository(db *sqlx.DB) *UserRepository {
	return &UserRepository{db: db}
}

// DB exposes the underlying database connection for raw queries
func (r *UserRepository) DB() *sqlx.DB {
	return r.db
}

// GetUserByID retrieves a user by ID
func (r *UserRepository) GetUserByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	query := `SELECT * FROM users WHERE id = $1 AND is_active = true`
	err := r.db.Get(&user, query, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &user, err
}

// GetByID retrieves a user by ID (alias for compatibility)
func (r *UserRepository) GetByID(id uuid.UUID) (*models.User, error) {
	return r.GetUserByID(id)
}

// GetByUsername retrieves a user by username (alias for compatibility)
func (r *UserRepository) GetByUsername(username string) (*models.User, error) {
	return r.GetUserByUsername(username)
}

// GetUserByUsername retrieves a user by username
func (r *UserRepository) GetUserByUsername(username string) (*models.User, error) {
	var user models.User
	query := `SELECT * FROM users WHERE username = $1 AND is_active = true`
	err := r.db.Get(&user, query, username)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &user, err
}

// GetUserByCertificateSerial retrieves a user by certificate serial number
func (r *UserRepository) GetUserByCertificateSerial(serial string) (*models.User, error) {
	var user models.User
	query := `SELECT * FROM users WHERE certificate_serial = $1 AND is_active = true`
	err := r.db.Get(&user, query, serial)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &user, err
}

// CreateUser creates a new user
func (r *UserRepository) CreateUser(user *models.User) error {
	query := `
		INSERT INTO users (id, username, email, password_hash, full_name, organization, role, is_active, installation_id, certificate_serial, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, created_at, updated_at`

	user.ID = uuid.New()
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	return r.db.QueryRow(query,
		user.ID, user.Username, user.Email, user.PasswordHash, user.FullName,
		user.Organization, user.Role, user.IsActive, user.InstallationID, user.CertificateSerial,
		user.CreatedAt, user.UpdatedAt,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}

// ListAllUsers retrieves all users ordered by creation date
func (r *UserRepository) ListAllUsers() ([]*models.User, error) {
	var users []*models.User
	query := `SELECT * FROM users ORDER BY created_at DESC`
	err := r.db.Select(&users, query)
	return users, err
}

// UserWithDetails extends User with joined installation and unit names for admin display.
type UserWithDetails struct {
	models.User
	InstallationName *string `json:"installation_name" db:"installation_name"`
	PrimaryUnitName  *string `json:"primary_unit_name" db:"primary_unit_name"`
	PrimaryUnitCode  *string `json:"primary_unit_code" db:"primary_unit_code"`
}

// ListUsersWithDetails returns all users joined with installation and primary unit names.
func (r *UserRepository) ListUsersWithDetails() ([]*UserWithDetails, error) {
	var users []*UserWithDetails
	query := `
		SELECT u.*,
		       i.name  AS installation_name,
		       un.name AS primary_unit_name,
		       un.unit_code AS primary_unit_code
		FROM users u
		LEFT JOIN installations i ON i.id = u.installation_id
		LEFT JOIN user_units uu ON uu.user_id = u.id AND uu.is_primary = true
		LEFT JOIN units un ON un.id = uu.unit_id
		ORDER BY u.created_at DESC`
	err := r.db.Select(&users, query)
	return users, err
}

// UpdateUser updates editable user fields (admin use)
func (r *UserRepository) UpdateUser(user *models.User) error {
	user.UpdatedAt = time.Now()
	query := `
		UPDATE users
		SET email = $1, full_name = $2, organization = $3, role = $4, is_active = $5,
		    password_hash = COALESCE($6, password_hash),
		    phone = $7, phone_dsn = $8, unified_command = $9, installation_id = $10,
		    default_ism_office = $11, service_branch = $12, pay_grade = $13, updated_at = $14
		WHERE id = $15`
	_, err := r.db.Exec(query, user.Email, user.FullName, user.Organization, user.Role, user.IsActive,
		user.PasswordHash, user.Phone, user.PhoneDSN, user.UnifiedCommand, user.InstallationID,
		user.DefaultISMOffice, user.ServiceBranch, user.PayGrade, user.UpdatedAt, user.ID)
	return err
}

// UpdateUserProfile updates the fields a user can edit themselves (no role/active changes)
func (r *UserRepository) UpdateUserProfile(user *models.User) error {
	user.UpdatedAt = time.Now()
	query := `
		UPDATE users
		SET email = $1, full_name = $2, organization = $3,
		    phone = $4, phone_dsn = $5, unified_command = $6, installation_id = $7,
		    default_ism_office = $8, service_branch = $9, pay_grade = $10, updated_at = $11
		WHERE id = $12`
	_, err := r.db.Exec(query, user.Email, user.FullName, user.Organization,
		user.Phone, user.PhoneDSN, user.UnifiedCommand, user.InstallationID,
		user.DefaultISMOffice, user.ServiceBranch, user.PayGrade, user.UpdatedAt, user.ID)
	return err
}

// SetUserActive activates or deactivates a user
func (r *UserRepository) SetUserActive(id uuid.UUID, active bool) error {
	query := `UPDATE users SET is_active = $1, updated_at = $2 WHERE id = $3`
	_, err := r.db.Exec(query, active, time.Now(), id)
	return err
}

// UpdateLastLogin updates user's last login time
func (r *UserRepository) UpdateLastLogin(userID uuid.UUID, loginTime time.Time) error {
	query := `UPDATE users SET last_login = $1, updated_at = $2 WHERE id = $3`
	now := time.Now()
	_, err := r.db.Exec(query, loginTime, now, userID)
	return err
}

// GetUsersByRoles returns all active users whose role is in the given list,
// ordered by full_name. Used to populate the proposal routing dropdown.
func (r *UserRepository) GetUsersByRoles(roles []string) ([]*models.User, error) {
	if len(roles) == 0 {
		return nil, nil
	}
	query, args, err := sqlx.In(
		`SELECT * FROM users WHERE role IN (?) AND is_active = true ORDER BY full_name`,
		roles,
	)
	if err != nil {
		return nil, err
	}
	query = r.db.Rebind(query)
	var users []*models.User
	err = r.db.Select(&users, query, args...)
	return users, err
}

// CertificateRepository handles client certificate operations
type CertificateRepository struct {
	db *sqlx.DB
}

func NewCertificateRepository(db *sqlx.DB) *CertificateRepository {
	return &CertificateRepository{db: db}
}

// GetCertificateBySerial retrieves a certificate by serial number
func (r *CertificateRepository) GetCertificateBySerial(serial string) (*models.ClientCertificate, error) {
	var cert models.ClientCertificate
	query := `SELECT * FROM client_certificates WHERE serial_number = $1 AND is_revoked = false`
	err := r.db.Get(&cert, query, serial)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &cert, err
}

// GetCertificateByFingerprint retrieves a certificate by fingerprint
func (r *CertificateRepository) GetCertificateByFingerprint(fingerprint string) (*models.ClientCertificate, error) {
	var cert models.ClientCertificate
	query := `SELECT * FROM client_certificates WHERE fingerprint = $1 AND is_revoked = false`
	err := r.db.Get(&cert, query, fingerprint)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &cert, err
}

// CreateCertificate registers a new client certificate
func (r *CertificateRepository) CreateCertificate(cert *models.ClientCertificate) error {
	query := `
		INSERT INTO client_certificates
		(id, user_id, serial_number, common_name, organization, email_address,
		 issuer, not_before, not_after, fingerprint, is_revoked, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, created_at, updated_at`

	cert.ID = uuid.New()
	cert.CreatedAt = time.Now()
	cert.UpdatedAt = time.Now()
	cert.IsRevoked = false

	return r.db.QueryRow(query,
		cert.ID, cert.UserID, cert.SerialNumber, cert.CommonName,
		cert.Organization, cert.EmailAddress, cert.Issuer,
		cert.NotBefore, cert.NotAfter, cert.Fingerprint, cert.IsRevoked,
		cert.CreatedAt, cert.UpdatedAt,
	).Scan(&cert.ID, &cert.CreatedAt, &cert.UpdatedAt)
}

// UpdateCertificateLastUsed updates the last used timestamp
func (r *CertificateRepository) UpdateCertificateLastUsed(certID uuid.UUID) error {
	query := `UPDATE client_certificates SET last_used = $1, updated_at = $2 WHERE id = $3`
	now := time.Now()
	_, err := r.db.Exec(query, now, now, certID)
	return err
}

// RevokeCertificate revokes a certificate
func (r *CertificateRepository) RevokeCertificate(certID uuid.UUID, reason string) error {
	query := `
		UPDATE client_certificates
		SET is_revoked = true, revoked_at = $1, revoked_reason = $2, updated_at = $3
		WHERE id = $4`
	now := time.Now()
	_, err := r.db.Exec(query, now, reason, now, certID)
	return err
}
