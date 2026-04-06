// models/sfaf_lookup_model.go
package models

import (
	"time"

	"github.com/google/uuid"
)

// SFAFFieldLookup holds reference values for SFAF form fields (200, 201, 202, 204, 205, 206, 300, 400).
type SFAFFieldLookup struct {
	ID        uuid.UUID `json:"id" db:"id"`
	FieldCode string    `json:"field_code" db:"field_code"`
	Value     string    `json:"value" db:"value"`
	Label     *string   `json:"label,omitempty" db:"label"`
	SortOrder int       `json:"sort_order" db:"sort_order"`
	IsActive  bool      `json:"is_active" db:"is_active"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type CreateSFAFLookupRequest struct {
	FieldCode string  `json:"field_code" binding:"required"`
	Value     string  `json:"value" binding:"required"`
	Label     *string `json:"label"`
	SortOrder int     `json:"sort_order"`
}

type UpdateSFAFLookupRequest struct {
	Value     string  `json:"value" binding:"required"`
	Label     *string `json:"label"`
	SortOrder int     `json:"sort_order"`
	IsActive  bool    `json:"is_active"`
}
