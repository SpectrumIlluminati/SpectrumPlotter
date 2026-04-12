// irac_notes_repository.go
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
	query := `INSERT INTO irac_notes (code, title, description, category) VALUES ($1, $2, $3, $4) RETURNING created_at`
	return r.db.QueryRow(query, note.Code, note.Title, note.Description, note.Category).Scan(&note.CreatedAt)
}

func (r *IRACNotesRepository) GetAllNotes() ([]models.IRACNote, error) {
	var notes []models.IRACNote
	query := `SELECT code, title, description, category, created_at FROM irac_notes ORDER BY code`
	err := r.db.Select(&notes, query)
	return notes, err
}

func (r *IRACNotesRepository) GetNotesByCategory(category string) ([]models.IRACNote, error) {
	var notes []models.IRACNote
	query := `SELECT code, title, description, category, created_at FROM irac_notes WHERE category = $1 ORDER BY code`
	err := r.db.Select(&notes, query, category)
	return notes, err
}

func (r *IRACNotesRepository) SearchNotes(searchTerm string) ([]models.IRACNote, error) {
	var notes []models.IRACNote
	query := `SELECT code, title, description, category, created_at FROM irac_notes
              WHERE title ILIKE $1 OR description ILIKE $1 OR code ILIKE $1 ORDER BY code`
	searchPattern := "%" + searchTerm + "%"
	err := r.db.Select(&notes, query, searchPattern)
	return notes, err
}

func (r *IRACNotesRepository) Update(note *models.IRACNote) error {
	query := `UPDATE irac_notes SET title=$1, description=$2, category=$3 WHERE code=$4`
	_, err := r.db.Exec(query, note.Title, note.Description, note.Category, note.Code)
	return err
}

func (r *IRACNotesRepository) Delete(code string) error {
	_, err := r.db.Exec(`DELETE FROM irac_notes WHERE code=$1`, code)
	return err
}
