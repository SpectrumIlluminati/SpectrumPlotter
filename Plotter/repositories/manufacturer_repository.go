// repositories/manufacturer_repository.go
package repositories

import (
	"database/sql"
	"fmt"

	"sfaf-plotter/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type ManufacturerRepository struct {
	db *sqlx.DB
}

func NewManufacturerRepository(db *sqlx.DB) *ManufacturerRepository {
	return &ManufacturerRepository{db: db}
}

func (r *ManufacturerRepository) GetAll() ([]models.Manufacturer, error) {
	var manufacturers []models.Manufacturer
	query := `SELECT * FROM manufacturers ORDER BY code ASC`
	err := r.db.Select(&manufacturers, query)
	return manufacturers, err
}

func (r *ManufacturerRepository) GetByID(id uuid.UUID) (*models.Manufacturer, error) {
	var m models.Manufacturer
	query := `SELECT * FROM manufacturers WHERE id = $1`
	err := r.db.Get(&m, query, id)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("manufacturer not found")
	}
	return &m, err
}

func (r *ManufacturerRepository) Create(m *models.Manufacturer) error {
	query := `
		INSERT INTO manufacturers (code, name, country)
		VALUES ($1, $2, $3)
		RETURNING id, is_active, created_at, updated_at`
	return r.db.QueryRowx(query, m.Code, m.Name, m.Country).
		Scan(&m.ID, &m.IsActive, &m.CreatedAt, &m.UpdatedAt)
}

func (r *ManufacturerRepository) Update(m *models.Manufacturer) error {
	query := `
		UPDATE manufacturers
		SET code = $1, name = $2, country = $3, is_active = $4, updated_at = NOW()
		WHERE id = $5
		RETURNING updated_at`
	return r.db.QueryRowx(query, m.Code, m.Name, m.Country, m.IsActive, m.ID).
		Scan(&m.UpdatedAt)
}

func (r *ManufacturerRepository) Delete(id uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM manufacturers WHERE id = $1`, id)
	return err
}
