// models/sfaf_model.go
package models

import (
	"time"

	"github.com/google/uuid"
)

type SFAF struct {
	ID        uuid.UUID         `json:"id"`
	MarkerID  uuid.UUID         `json:"marker_id"`
	Fields    map[string]string `json:"fields"`
	CreatedAt time.Time         `json:"created_at"`
	UpdatedAt time.Time         `json:"updated_at"`
}

type SFAFFormDefinition struct {
	FieldNumber string   `json:"field_number"`
	Label       string   `json:"label"`
	Required    bool     `json:"required"`
	FieldType   string   `json:"field_type"`
	Options     []string `json:"options,omitempty"`
	Validation  string   `json:"validation,omitempty"`
	Help        string   `json:"help,omitempty"`
}

// Request/Response types
type CreateSFAFRequest struct {
	MarkerID string            `json:"marker_id" binding:"required"`
	Fields   map[string]string `json:"fields"`
}

type UpdateSFAFRequest struct {
	Fields map[string]string `json:"fields" binding:"required"`
}

type ValidateSFAFRequest struct {
	Fields map[string]string `json:"fields" binding:"required"`
}

type ValidationResult struct {
	IsValid bool                          `json:"is_valid"`
	Errors  map[string]string             `json:"errors,omitempty"`
	Fields  map[string]SFAFFormDefinition `json:"fields"`
}

// Export format
type SFAFExportFormat string

const (
	SFAFExportCSV  SFAFExportFormat = "csv"
	SFAFExportJSON SFAFExportFormat = "json"
	SFAFExportXML  SFAFExportFormat = "xml"
)
