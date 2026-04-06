// marker_repository.go
package repositories

import (
	"fmt"
	"sfaf-plotter/models"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type MarkerRepository struct {
	db *sqlx.DB
}

func NewMarkerRepository(db *sqlx.DB) *MarkerRepository {
	return &MarkerRepository{db: db}
}

func (r *MarkerRepository) Create(marker *models.Marker) error {
	query := `
        INSERT INTO markers (id, serial, latitude, longitude, frequency, notes, marker_type, is_draggable)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING created_at, updated_at`

	err := r.db.QueryRow(query,
		marker.ID, marker.Serial, marker.Latitude, marker.Longitude,
		marker.Frequency, marker.Notes, marker.MarkerType, marker.IsDraggable,
	).Scan(&marker.CreatedAt, &marker.UpdatedAt)

	return err
}

func (r *MarkerRepository) GetAll() ([]models.Marker, error) {
	query := `
        SELECT id, serial, latitude, longitude, frequency, notes,
               marker_type, is_draggable, created_at, updated_at
        FROM markers
        ORDER BY created_at DESC`

	var markers []models.Marker
	err := r.db.Select(&markers, query)
	return markers, err
}

func (r *MarkerRepository) GetByID(id uuid.UUID) (*models.Marker, error) {
	query := `
        SELECT id, serial, latitude, longitude, frequency, notes,
               marker_type, is_draggable, created_at, updated_at
        FROM markers
        WHERE id = $1`

	var marker models.Marker
	err := r.db.Get(&marker, query, id)
	if err != nil {
		return nil, err
	}

	// Load associated IRAC notes
	marker.IRACNotes, err = r.getIRACNotesByMarkerID(id)
	if err != nil {
		return nil, err
	}

	// Load associated SFAF fields
	marker.SFAFFields, err = r.getSFAFFieldsByMarkerID(id)
	if err != nil {
		return nil, err
	}

	return &marker, nil
}

func (r *MarkerRepository) GetBySerial(serial string) (*models.Marker, error) {
	query := `
        SELECT id, serial, latitude, longitude, frequency, notes,
               marker_type, is_draggable, created_at, updated_at
        FROM markers
        WHERE serial = $1`

	var marker models.Marker
	err := r.db.Get(&marker, query, serial)
	if err != nil {
		return nil, err
	}

	return &marker, nil
}

func (r *MarkerRepository) Update(id uuid.UUID, updates map[string]interface{}) error {
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	for field, value := range updates {
		setParts = append(setParts, fmt.Sprintf("%s = $%d", field, argIndex))
		args = append(args, value)
		argIndex++
	}

	setParts = append(setParts, "updated_at = CURRENT_TIMESTAMP")

	query := fmt.Sprintf(`
        UPDATE markers
        SET %s
        WHERE id = $%d`,
		strings.Join(setParts, ", "), argIndex)

	args = append(args, id)

	_, err := r.db.Exec(query, args...)
	return err
}

func (r *MarkerRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM markers WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func (r *MarkerRepository) DeleteAll() error {
	query := `DELETE FROM markers`
	_, err := r.db.Exec(query)
	return err
}

// Helper methods for IRAC notes and SFAF fields
func (r *MarkerRepository) getIRACNotesByMarkerID(markerID uuid.UUID) ([]models.IRACNoteAssociation, error) {
	query := `
        SELECT mia.id, mia.marker_id, mia.irac_note_code, mia.field_number,
               mia.occurrence_number, mia.created_at,
               in_.code, in_.title, in_.description, in_.category
        FROM marker_irac_notes mia
        JOIN irac_notes in_ ON mia.irac_note_code = in_.code
        WHERE mia.marker_id = $1
        ORDER BY mia.field_number, mia.occurrence_number`

	rows, err := r.db.Query(query, markerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var associations []models.IRACNoteAssociation
	for rows.Next() {
		var assoc models.IRACNoteAssociation
		var note models.IRACNote

		err := rows.Scan(
			&assoc.ID, &assoc.MarkerID, &assoc.IRACNoteCode,
			&assoc.FieldNumber, &assoc.OccurrenceNumber, &assoc.CreatedAt,
			&note.Code, &note.Title, &note.Description, &note.Category,
		)
		if err != nil {
			return nil, err
		}

		assoc.IRACNote = &note
		associations = append(associations, assoc)
	}

	return associations, nil
}

func (r *MarkerRepository) getSFAFFieldsByMarkerID(markerID uuid.UUID) ([]models.SFAFField, error) {
	query := `
        SELECT id, marker_id, field_number, field_value, occurrence_number, created_at
        FROM sfaf_fields
        WHERE marker_id = $1
        ORDER BY field_number, occurrence_number`

	var fields []models.SFAFField
	err := r.db.Select(&fields, query, markerID)
	return fields, err
}

// IRAC Notes management
func (r *MarkerRepository) AddIRACNote(markerID uuid.UUID, noteCode string, fieldNumber, occurrenceNumber int) error {
	query := `
        INSERT INTO marker_irac_notes (marker_id, irac_note_code, field_number, occurrence_number)
        VALUES ($1, $2, $3, $4)`

	_, err := r.db.Exec(query, markerID, noteCode, fieldNumber, occurrenceNumber)
	return err
}

func (r *MarkerRepository) RemoveIRACNote(markerID uuid.UUID, noteCode string, fieldNumber, occurrenceNumber int) error {
	query := `
        DELETE FROM marker_irac_notes
        WHERE marker_id = $1 AND irac_note_code = $2 AND field_number = $3 AND occurrence_number = $4`

	_, err := r.db.Exec(query, markerID, noteCode, fieldNumber, occurrenceNumber)
	return err
}

// UpdateImportedMarkersDraggable updates all imported markers to be non-draggable
func (r *MarkerRepository) UpdateImportedMarkersDraggable() error {
	query := `
        UPDATE markers
        SET is_draggable = false, updated_at = CURRENT_TIMESTAMP
        WHERE marker_type = 'imported' AND is_draggable = true`

	_, err := r.db.Exec(query)
	return err
}

// GetByBounds retrieves markers within geographic bounds for viewport-based loading
func (r *MarkerRepository) GetByBounds(minLat, maxLat, minLng, maxLng float64) ([]models.Marker, error) {
	query := `
        SELECT id, serial, latitude, longitude, frequency, notes,
               marker_type, is_draggable, created_at, updated_at
        FROM markers
        WHERE latitude BETWEEN $1 AND $2
          AND longitude BETWEEN $3 AND $4
        ORDER BY created_at DESC
        LIMIT 2000`

	var markers []models.Marker
	err := r.db.Select(&markers, query, minLat, maxLat, minLng, maxLng)
	return markers, err
}

// BatchCreate creates multiple markers in a single transaction
func (r *MarkerRepository) BatchCreate(markers []*models.Marker) error {
	if len(markers) == 0 {
		return nil
	}

	tx, err := r.db.Beginx()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	now := time.Now()
	for _, marker := range markers {
		if marker.ID == uuid.Nil {
			marker.ID = uuid.New()
		}
		marker.CreatedAt = now
		marker.UpdatedAt = now

		// Use ON CONFLICT to handle duplicate serials gracefully
		// If a marker with the same serial exists, update its location and frequency
		query := `
			INSERT INTO markers (id, serial, latitude, longitude, frequency, notes, marker_type, is_draggable, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			ON CONFLICT (serial) DO UPDATE SET
				latitude = EXCLUDED.latitude,
				longitude = EXCLUDED.longitude,
				frequency = EXCLUDED.frequency,
				notes = EXCLUDED.notes,
				marker_type = EXCLUDED.marker_type,
				updated_at = EXCLUDED.updated_at
		`
		_, err := tx.Exec(query, marker.ID, marker.Serial, marker.Latitude, marker.Longitude, marker.Frequency, marker.Notes, marker.MarkerType, marker.IsDraggable, marker.CreatedAt, marker.UpdatedAt)
		if err != nil {
			return fmt.Errorf("failed to upsert marker %s: %w", marker.Serial, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}
