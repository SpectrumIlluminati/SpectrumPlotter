package repositories

import (
	"sfaf-plotter/models"

	"github.com/jmoiron/sqlx"
)

type SystemConfigRepository struct {
	db *sqlx.DB
}

func NewSystemConfigRepository(db *sqlx.DB) *SystemConfigRepository {
	return &SystemConfigRepository{db: db}
}

func (r *SystemConfigRepository) GetAll() ([]models.SystemConfig, error) {
	var configs []models.SystemConfig
	query := `SELECT id, key, value, value_type, category, description, is_readonly, updated_at
              FROM system_config ORDER BY category, key`
	err := r.db.Select(&configs, query)
	return configs, err
}

func (r *SystemConfigRepository) GetByKey(key string) (*models.SystemConfig, error) {
	var cfg models.SystemConfig
	query := `SELECT id, key, value, value_type, category, description, is_readonly, updated_at
              FROM system_config WHERE key = $1`
	err := r.db.Get(&cfg, query, key)
	if err != nil {
		return nil, err
	}
	return &cfg, nil
}

func (r *SystemConfigRepository) Update(key, value string) error {
	_, err := r.db.Exec(
		`UPDATE system_config SET value = $1, updated_at = NOW() WHERE key = $2 AND is_readonly = false`,
		value, key,
	)
	return err
}
