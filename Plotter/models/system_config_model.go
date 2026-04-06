package models

import (
	"time"

	"github.com/google/uuid"
)

type SystemConfig struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	Key         string     `json:"key" db:"key"`
	Value       string     `json:"value" db:"value"`
	Type        string     `json:"type" db:"value_type"`
	Category    string     `json:"category" db:"category"`
	Description *string    `json:"description,omitempty" db:"description"`
	IsReadonly  bool       `json:"is_readonly" db:"is_readonly"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

type UpdateSystemConfigRequest struct {
	Value string `json:"value" binding:"required"`
}
