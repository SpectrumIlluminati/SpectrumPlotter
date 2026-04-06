// repositories/sfaf_lookup_repository.go
package repositories

import (
	"database/sql"
	"fmt"

	"sfaf-plotter/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type SFAFLookupRepository struct {
	db *sqlx.DB
}

func NewSFAFLookupRepository(db *sqlx.DB) *SFAFLookupRepository {
	return &SFAFLookupRepository{db: db}
}

func (r *SFAFLookupRepository) GetAll() ([]models.SFAFFieldLookup, error) {
	var rows []models.SFAFFieldLookup
	err := r.db.Select(&rows, `SELECT * FROM sfaf_field_lookup ORDER BY field_code, sort_order, value`)
	return rows, err
}

func (r *SFAFLookupRepository) GetByFieldCode(fieldCode string) ([]models.SFAFFieldLookup, error) {
	var rows []models.SFAFFieldLookup
	err := r.db.Select(&rows,
		`SELECT * FROM sfaf_field_lookup WHERE field_code = $1 ORDER BY sort_order, value`,
		fieldCode)
	return rows, err
}

func (r *SFAFLookupRepository) GetByID(id uuid.UUID) (*models.SFAFFieldLookup, error) {
	var row models.SFAFFieldLookup
	err := r.db.Get(&row, `SELECT * FROM sfaf_field_lookup WHERE id = $1`, id)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("lookup entry not found")
	}
	return &row, err
}

func (r *SFAFLookupRepository) Create(entry *models.SFAFFieldLookup) error {
	return r.db.QueryRowx(`
		INSERT INTO sfaf_field_lookup (field_code, value, label, sort_order)
		VALUES ($1, $2, $3, $4)
		RETURNING id, is_active, created_at`,
		entry.FieldCode, entry.Value, entry.Label, entry.SortOrder,
	).Scan(&entry.ID, &entry.IsActive, &entry.CreatedAt)
}

func (r *SFAFLookupRepository) Update(entry *models.SFAFFieldLookup) error {
	_, err := r.db.Exec(`
		UPDATE sfaf_field_lookup
		SET value = $1, label = $2, sort_order = $3, is_active = $4
		WHERE id = $5`,
		entry.Value, entry.Label, entry.SortOrder, entry.IsActive, entry.ID)
	return err
}

func (r *SFAFLookupRepository) Delete(id uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM sfaf_field_lookup WHERE id = $1`, id)
	return err
}
