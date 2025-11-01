// models/marker_models.go
package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type Marker struct {
	ID          uuid.UUID             `json:"id" db:"id"`
	Serial      string                `json:"serial" db:"serial"`
	Latitude    float64               `json:"lat" db:"latitude"`
	Longitude   float64               `json:"lng" db:"longitude"`
	Frequency   string                `json:"frequency" db:"frequency"`
	Notes       string                `json:"notes" db:"notes"`
	MarkerType  string                `json:"type" db:"marker_type"`
	IsDraggable bool                  `json:"is_draggable" db:"is_draggable"`
	CreatedAt   time.Time             `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time             `json:"updated_at" db:"updated_at"`
	IRACNotes   []IRACNoteAssociation `json:"irac_notes,omitempty"`
	SFAFFields  []SFAFField           `json:"sfaf_fields,omitempty"`
}

type IRACNote struct {
	Code           string          `json:"code" db:"code"`
	Title          string          `json:"title" db:"title"`
	Description    string          `json:"description" db:"description"`
	Category       string          `json:"category" db:"category"`
	FieldPlacement int             `json:"field_placement" db:"field_placement"`
	Agency         pq.StringArray  `json:"agency" db:"agency"`
	TechnicalSpecs json.RawMessage `json:"technical_specs" db:"technical_specs"`
	CreatedAt      time.Time       `json:"created_at" db:"created_at"`
}

type IRACNoteAssociation struct {
	ID               uuid.UUID `json:"id" db:"id"`
	MarkerID         uuid.UUID `json:"marker_id" db:"marker_id"`
	IRACNoteCode     string    `json:"irac_note_code" db:"irac_note_code"`
	FieldNumber      int       `json:"field_number" db:"field_number"`
	OccurrenceNumber int       `json:"occurrence_number" db:"occurrence_number"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	IRACNote         *IRACNote `json:"irac_note,omitempty"`
}

type SFAFField struct {
	ID               uuid.UUID `json:"id" db:"id"`
	MarkerID         uuid.UUID `json:"marker_id" db:"marker_id"`
	FieldNumber      string    `json:"field_number" db:"field_number"`
	FieldValue       string    `json:"field_value" db:"field_value"`
	OccurrenceNumber int       `json:"occurrence_number" db:"occurrence_number"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
}

// Request/Response models for API
type CreateMarkerRequest struct {
	Latitude   float64 `json:"lat" binding:"required"`
	Longitude  float64 `json:"lng" binding:"required"`
	Frequency  string  `json:"frequency"`
	Notes      string  `json:"notes"`
	MarkerType string  `json:"type"`
}

type UpdateMarkerRequest struct {
	Latitude    *float64 `json:"lat,omitempty"`
	Longitude   *float64 `json:"lng,omitempty"`
	Frequency   *string  `json:"frequency,omitempty"`
	Notes       *string  `json:"notes,omitempty"`
	MarkerType  *string  `json:"type,omitempty"`
	IsDraggable *bool    `json:"is_draggable,omitempty"`
}

type MarkerResponse struct {
	Success bool    `json:"success"`
	Message string  `json:"message"`
	Marker  *Marker `json:"marker,omitempty"`
}

type MarkersResponse struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
	Markers []Marker `json:"markers,omitempty"`
}
