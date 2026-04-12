// models/manufacturer_model.go
package models

import (
	"time"

	"github.com/google/uuid"
)

// Manufacturer represents an equipment manufacturer from MC4EB Publication 7
type Manufacturer struct {
	ID        uuid.UUID `json:"id" db:"id"`
	Code      string    `json:"code" db:"code"`
	Name      string    `json:"name" db:"name"`
	Country   *string   `json:"country,omitempty" db:"country"`
	IsActive  bool      `json:"is_active" db:"is_active"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// CreateManufacturerRequest is used for POST/PUT requests
type CreateManufacturerRequest struct {
	Code    string  `json:"code" binding:"required"`
	Name    string  `json:"name" binding:"required"`
	Country *string `json:"country"`
}

// UpdateManufacturerRequest is used for PUT requests
type UpdateManufacturerRequest struct {
	Code     string  `json:"code" binding:"required"`
	Name     string  `json:"name" binding:"required"`
	Country  *string `json:"country"`
	IsActive bool    `json:"is_active"`
}
