package models

import (
    "time"
)

// SFAF represents a complete Spectrum Frequency Authorization Form
type SFAF struct {
    ID        string            `json:"id"`
    MarkerID  string            `json:"marker_id"`
    Fields    map[string]string `json:"fields"`
    CreatedAt time.Time         `json:"created_at"`
    UpdatedAt time.Time         `json:"updated_at"`
}

// SFAFField represents a single form field with validation
type SFAFField struct {
    ID          string   `json:"id"`
    Label       string   `json:"label"`
    Value       string   `json:"value"`
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
    IsValid bool                         `json:"is_valid"`
    Errors  map[string]string            `json:"errors,omitempty"`
    Fields  map[string]SFAFField         `json:"fields"`
}

// Export format
type SFAFExportFormat string

const (
    SFAFExportCSV  SFAFExportFormat = "csv"
    SFAFExportJSON SFAFExportFormat = "json"
    SFAFExportXML  SFAFExportFormat = "xml"
)