// repositories/session_repository.go
package repositories

import (
	"database/sql"
	"sfaf-plotter/models"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type SessionRepository struct {
	db *sqlx.DB
}

func NewSessionRepository(db *sqlx.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

// CreateSession creates a new session
func (r *SessionRepository) CreateSession(session *models.Session) error {
	query := `
		INSERT INTO sessions (id, user_id, token, auth_method, ip_address, user_agent, expires_at, last_activity, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	_, err := r.db.Exec(query,
		session.ID,
		session.UserID,
		session.Token,
		session.AuthMethod,
		session.IPAddress,
		session.UserAgent,
		session.ExpiresAt,
		session.LastActivity,
		session.CreatedAt,
	)

	return err
}

// GetByToken retrieves a session by token
func (r *SessionRepository) GetByToken(token string) (*models.Session, error) {
	var session models.Session
	query := `SELECT * FROM sessions WHERE token = $1`
	err := r.db.Get(&session, query, token)
	if err == sql.ErrNoRows {
		return nil, sql.ErrNoRows
	}
	return &session, err
}

// UpdateLastActivity updates the last activity timestamp
func (r *SessionRepository) UpdateLastActivity(id uuid.UUID, lastActivity time.Time) error {
	query := `UPDATE sessions SET last_activity = $1 WHERE id = $2`
	_, err := r.db.Exec(query, lastActivity, id)
	return err
}

// DeleteSession deletes a session by ID
func (r *SessionRepository) DeleteSession(id uuid.UUID) error {
	query := `DELETE FROM sessions WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

// DeleteExpiredSessions removes all expired sessions
func (r *SessionRepository) DeleteExpiredSessions() error {
	query := `DELETE FROM sessions WHERE expires_at < $1`
	_, err := r.db.Exec(query, time.Now())
	return err
}
