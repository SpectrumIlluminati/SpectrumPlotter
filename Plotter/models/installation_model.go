package models

import (
	"time"

	"github.com/google/uuid"
)

type Installation struct {
	ID           uuid.UUID `json:"id" db:"id"`
	Name         string    `json:"name" db:"name"`
	Code         *string   `json:"code,omitempty" db:"code"`
	Organization *string   `json:"organization,omitempty" db:"organization"`
	State        *string   `json:"state,omitempty" db:"state"`
	Country      string    `json:"country" db:"country"`
	IsActive     bool      `json:"is_active" db:"is_active"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

type CreateInstallationRequest struct {
	Name         string  `json:"name" binding:"required"`
	Code         *string `json:"code"`
	Organization *string `json:"organization"`
	State        *string `json:"state"`
	Country      string  `json:"country"`
}

type UpdateInstallationRequest struct {
	Name         string  `json:"name" binding:"required"`
	Code         *string `json:"code"`
	Organization *string `json:"organization"`
	State        *string `json:"state"`
	Country      string  `json:"country"`
	IsActive     bool    `json:"is_active"`
}
