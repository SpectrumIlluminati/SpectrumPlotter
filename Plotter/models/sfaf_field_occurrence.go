// models/sfaf_field_occurrence.go
package models

import (
	"time"

	"github.com/google/uuid"
)

// SFAFFieldOccurrence represents a single occurrence of an SFAF field
// Used to store multi-occurrence fields like 530, 530/2, 530/3 for polygons
type SFAFFieldOccurrence struct {
	ID          uuid.UUID `db:"id" json:"id"`
	SFAFID      uuid.UUID `db:"sfaf_id" json:"sfaf_id"`
	FieldNumber string    `db:"field_number" json:"field_number"` // e.g., "530", "340"
	Occurrence  int       `db:"occurrence" json:"occurrence"`      // 1, 2, 3, etc.
	Value       string    `db:"value" json:"value"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

// Field530Coordinate represents a parsed polygon coordinate from Field 530
// Format: ART,450000N0050000E (code, latitude, longitude)
type Field530Coordinate struct {
	Code      string  `json:"code"`      // ART (transmit), ARR (receive), ARB (both)
	Latitude  float64 `json:"latitude"`  // Decimal degrees
	Longitude float64 `json:"longitude"` // Decimal degrees
	RawValue  string  `json:"raw_value"` // Original SFAF format
}

// Field530Polygon represents a complete polygon from Field 530 occurrences
type Field530Polygon struct {
	SFAFID      uuid.UUID            `json:"sfaf_id"`
	Type        string               `json:"type"`        // "transmit", "receive", "both"
	Coordinates []Field530Coordinate `json:"coordinates"` // Ordered list of polygon vertices
	IsValid     bool                 `json:"is_valid"`    // Whether polygon is valid (3+ points)
}

// CreateFieldOccurrenceRequest is used when creating/updating field occurrences
type CreateFieldOccurrenceRequest struct {
	SFAFID      uuid.UUID `json:"sfaf_id" binding:"required"`
	FieldNumber string    `json:"field_number" binding:"required"`
	Occurrence  int       `json:"occurrence" binding:"required,min=1"`
	Value       string    `json:"value"`
}

// Field530PolygonResponse is the API response for Field 530 polygons
type Field530PolygonResponse struct {
	MarkerID    string               `json:"marker_id"`
	SerialNumber string              `json:"serial_number"`
	Polygon     Field530Polygon      `json:"polygon"`
	RawOccurrences []SFAFFieldOccurrence `json:"raw_occurrences"` // For debugging
}
