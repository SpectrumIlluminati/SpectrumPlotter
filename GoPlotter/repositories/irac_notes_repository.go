package repositories

import (
	"sfaf-plotter/models" // Import your models

	"github.com/jmoiron/sqlx"
)

type IRACNotesRepository struct {
	db *sqlx.DB
}

func NewIRACNotesRepository(db *sqlx.DB) *IRACNotesRepository {
	return &IRACNotesRepository{db: db}
}

// Use models.IRACNote instead of local type
func (r *IRACNotesRepository) Create(note *models.IRACNote) error {
	query := `
        INSERT INTO irac_notes (code, title, description, category, field_placement, agency, technical_specs)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING created_at`

	return r.db.QueryRow(query, note.Code, note.Title, note.Description,
		note.Category, note.FieldPlacement, note.Agency, note.TechnicalSpecs).
		Scan(&note.CreatedAt)
}

func (r *IRACNotesRepository) GetAllNotes() ([]models.IRACNote, error) {
	var notes []models.IRACNote
	query := `SELECT code, title, description, category, field_placement, agency, technical_specs, created_at FROM irac_notes`

	err := r.db.Select(&notes, query)
	return notes, err
}

func (r *IRACNotesRepository) GetNotesByCategory(category string) ([]models.IRACNote, error) {
	var notes []models.IRACNote
	query := `SELECT code, title, description, category, field_placement, agency, technical_specs, created_at FROM irac_notes WHERE category = $1`

	err := r.db.Select(&notes, query, category)
	return notes, err
}

func (r *IRACNotesRepository) SearchNotes(searchTerm string) ([]models.IRACNote, error) {
	var notes []models.IRACNote
	query := `SELECT code, title, description, category, field_placement, agency, technical_specs, created_at 
              FROM irac_notes 
              WHERE title ILIKE $1 OR description ILIKE $1 OR code ILIKE $1`

	searchPattern := "%" + searchTerm + "%"
	err := r.db.Select(&notes, query, searchPattern, searchPattern, searchPattern)
	return notes, err
}
