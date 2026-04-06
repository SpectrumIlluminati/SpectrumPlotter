// repositories/sfaf_field_occurrence_repository.go
package repositories

import (
	"fmt"
	"sfaf-plotter/models"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type SFAFFieldOccurrenceRepository struct {
	db *sqlx.DB
}

func NewSFAFFieldOccurrenceRepository(db *sqlx.DB) *SFAFFieldOccurrenceRepository {
	return &SFAFFieldOccurrenceRepository{db: db}
}

// Create saves a single field occurrence
func (r *SFAFFieldOccurrenceRepository) Create(occurrence *models.SFAFFieldOccurrence) error {
	occurrence.ID = uuid.New()
	occurrence.CreatedAt = time.Now()
	occurrence.UpdatedAt = time.Now()

	query := `
		INSERT INTO sfaf_field_occurrences (id, sfaf_id, field_number, occurrence, value, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.db.Exec(query, occurrence.ID, occurrence.SFAFID, occurrence.FieldNumber,
		occurrence.Occurrence, occurrence.Value, occurrence.CreatedAt, occurrence.UpdatedAt)
	return err
}

// CreateBatch saves multiple field occurrences in a single transaction
func (r *SFAFFieldOccurrenceRepository) CreateBatch(occurrences []models.SFAFFieldOccurrence) error {
	if len(occurrences) == 0 {
		return nil
	}

	tx, err := r.db.Beginx()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	query := `
		INSERT INTO sfaf_field_occurrences (id, sfaf_id, field_number, occurrence, value, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (sfaf_id, field_number, occurrence)
		DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
	`

	stmt, err := tx.Prepare(query)
	if err != nil {
		return fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	now := time.Now()
	for i := range occurrences {
		if occurrences[i].ID == uuid.Nil {
			occurrences[i].ID = uuid.New()
		}
		occurrences[i].CreatedAt = now
		occurrences[i].UpdatedAt = now

		_, err = stmt.Exec(
			occurrences[i].ID,
			occurrences[i].SFAFID,
			occurrences[i].FieldNumber,
			occurrences[i].Occurrence,
			occurrences[i].Value,
			occurrences[i].CreatedAt,
			occurrences[i].UpdatedAt,
		)
		if err != nil {
			return fmt.Errorf("failed to insert occurrence %d: %w", i, err)
		}
	}

	return tx.Commit()
}

// BatchCreate is an alias for CreateBatch to match naming pattern with other repositories
func (r *SFAFFieldOccurrenceRepository) BatchCreate(occurrences []*models.SFAFFieldOccurrence) error {
	if len(occurrences) == 0 {
		return nil
	}

	// Convert pointer slice to value slice for CreateBatch
	valueOccs := make([]models.SFAFFieldOccurrence, len(occurrences))
	for i, occ := range occurrences {
		valueOccs[i] = *occ
	}

	return r.CreateBatch(valueOccs)
}

// GetBySFAFID retrieves all field occurrences for a given SFAF record
func (r *SFAFFieldOccurrenceRepository) GetBySFAFID(sfafID uuid.UUID) ([]models.SFAFFieldOccurrence, error) {
	var occurrences []models.SFAFFieldOccurrence
	query := `
		SELECT id, sfaf_id, field_number, occurrence, value, created_at, updated_at
		FROM sfaf_field_occurrences
		WHERE sfaf_id = $1
		ORDER BY field_number, occurrence
	`
	err := r.db.Select(&occurrences, query, sfafID)
	return occurrences, err
}

// GetByFieldNumber retrieves all occurrences of a specific field for an SFAF record
func (r *SFAFFieldOccurrenceRepository) GetByFieldNumber(sfafID uuid.UUID, fieldNumber string) ([]models.SFAFFieldOccurrence, error) {
	var occurrences []models.SFAFFieldOccurrence
	query := `
		SELECT id, sfaf_id, field_number, occurrence, value, created_at, updated_at
		FROM sfaf_field_occurrences
		WHERE sfaf_id = $1 AND field_number = $2
		ORDER BY occurrence
	`
	err := r.db.Select(&occurrences, query, sfafID, fieldNumber)
	return occurrences, err
}

// GetField530Occurrences retrieves all Field 530 occurrences (for polygon coordinates)
func (r *SFAFFieldOccurrenceRepository) GetField530Occurrences(sfafID uuid.UUID) ([]models.SFAFFieldOccurrence, error) {
	return r.GetByFieldNumber(sfafID, "530")
}

// DeleteBySFAFID deletes all field occurrences for a given SFAF record
func (r *SFAFFieldOccurrenceRepository) DeleteBySFAFID(sfafID uuid.UUID) error {
	query := `DELETE FROM sfaf_field_occurrences WHERE sfaf_id = $1`
	_, err := r.db.Exec(query, sfafID)
	return err
}

// DeleteByFieldNumber deletes all occurrences of a specific field for an SFAF record
func (r *SFAFFieldOccurrenceRepository) DeleteByFieldNumber(sfafID uuid.UUID, fieldNumber string) error {
	query := `DELETE FROM sfaf_field_occurrences WHERE sfaf_id = $1 AND field_number = $2`
	_, err := r.db.Exec(query, sfafID, fieldNumber)
	return err
}

// Update updates a specific field occurrence
func (r *SFAFFieldOccurrenceRepository) Update(occurrence *models.SFAFFieldOccurrence) error {
	occurrence.UpdatedAt = time.Now()
	query := `
		UPDATE sfaf_field_occurrences
		SET value = $1, updated_at = $2
		WHERE sfaf_id = $3 AND field_number = $4 AND occurrence = $5
	`
	_, err := r.db.Exec(query, occurrence.Value, occurrence.UpdatedAt,
		occurrence.SFAFID, occurrence.FieldNumber, occurrence.Occurrence)
	return err
}

// GetAllField530Polygons retrieves all SFAF records that have Field 530 polygon data
func (r *SFAFFieldOccurrenceRepository) GetAllField530Polygons() (map[uuid.UUID][]models.SFAFFieldOccurrence, error) {
	var occurrences []models.SFAFFieldOccurrence
	query := `
		SELECT id, sfaf_id, field_number, occurrence, value, created_at, updated_at
		FROM sfaf_field_occurrences
		WHERE field_number = '530'
		ORDER BY sfaf_id, occurrence
	`
	err := r.db.Select(&occurrences, query)
	if err != nil {
		return nil, err
	}

	// Group by SFAF ID
	polygonMap := make(map[uuid.UUID][]models.SFAFFieldOccurrence)
	for _, occ := range occurrences {
		polygonMap[occ.SFAFID] = append(polygonMap[occ.SFAFID], occ)
	}

	return polygonMap, nil
}
