// repositories/account_request_repository.go
package repositories

import (
	"database/sql"
	"sfaf-plotter/models"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type AccountRequestRepository struct {
	db *sqlx.DB
}

func NewAccountRequestRepository(db *sqlx.DB) *AccountRequestRepository {
	return &AccountRequestRepository{db: db}
}

func (r *AccountRequestRepository) Create(req *models.AccountRequest) error {
	req.ID = uuid.New()
	req.Status = "pending"
	req.CreatedAt = time.Now()
	req.UpdatedAt = time.Now()

	query := `
		INSERT INTO account_requests
			(id, username, email, full_name, organization, unified_command, unit, phone, justification, requested_role, unit_id, requested_unit_name, installation_id, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
		RETURNING id`
	return r.db.QueryRow(query,
		req.ID, req.Username, req.Email, req.FullName, req.Organization, req.UnifiedCommand,
		req.Unit, req.Phone, req.Justification, req.RequestedRole,
		req.UnitID, req.RequestedUnitName, req.InstallationID,
		req.Status, req.CreatedAt, req.UpdatedAt,
	).Scan(&req.ID)
}

func (r *AccountRequestRepository) List(status string) ([]*models.AccountRequest, error) {
	var reqs []*models.AccountRequest
	var query string
	var args []interface{}

	if status != "" {
		query = `SELECT * FROM account_requests WHERE status = $1 ORDER BY created_at DESC`
		args = []interface{}{status}
	} else {
		query = `SELECT * FROM account_requests ORDER BY created_at DESC`
	}

	err := r.db.Select(&reqs, query, args...)
	return reqs, err
}

func (r *AccountRequestRepository) GetByID(id uuid.UUID) (*models.AccountRequest, error) {
	var req models.AccountRequest
	err := r.db.Get(&req, `SELECT * FROM account_requests WHERE id = $1`, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &req, err
}

func (r *AccountRequestRepository) UpdateStatus(id uuid.UUID, status string, reviewedBy *uuid.UUID, notes string) error {
	query := `
		UPDATE account_requests
		SET status = $1, reviewed_by = $2, review_notes = $3, updated_at = $4
		WHERE id = $5`
	_, err := r.db.Exec(query, status, reviewedBy, notes, time.Now(), id)
	return err
}
