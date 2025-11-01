package models

import (
	"time"
)

type Marker struct {
	ID          string    `json:"id"`
	Serial      string    `json:"serial"`
	Lat         float64   `json:"lat"`
	Lng         float64   `json:"lng"`
	Frequency   string    `json:"frequency"`
	Notes       string    `json:"notes"`
	Type        string    `json:"type"` // "manual", "circle-center", etc.
	IsDraggable bool      `json:"is_draggable"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateMarkerRequest struct {
	Lat       float64 `json:"lat" binding:"required"`
	Lng       float64 `json:"lng" binding:"required"`
	Frequency string  `json:"frequency"`
	Notes     string  `json:"notes"`
	Type      string  `json:"type"`
}

type UpdateMarkerRequest struct {
	Lat       *float64 `json:"lat,omitempty"`
	Lng       *float64 `json:"lng,omitempty"`
	Frequency *string  `json:"frequency,omitempty"`
	Notes     *string  `json:"notes,omitempty"`
}

type MarkerResponse struct {
	Marker      Marker `json:"marker"`
	Coordinates struct {
		Decimal string `json:"decimal"`
		DMS     string `json:"dms"`
		Compact string `json:"compact"`
	} `json:"coordinates"`
}
