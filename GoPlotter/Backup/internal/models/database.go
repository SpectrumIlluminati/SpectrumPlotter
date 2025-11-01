package models

import (
    "time"
    // Remove this line: "gorm.io/gorm"
)

// Database models that correspond to your existing models

type DBMarker struct {
    ID          string    `gorm:"primaryKey" json:"id"`
    Serial      string    `gorm:"unique;not null" json:"serial"`
    Lat         float64   `gorm:"not null" json:"lat"`
    Lng         float64   `gorm:"not null" json:"lng"`
    Frequency   string    `json:"frequency"`
    Notes       string    `json:"notes"`
    Type        string    `gorm:"default:manual" json:"type"`
    IsDraggable bool      `gorm:"default:true" json:"is_draggable"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

func (DBMarker) TableName() string {
    return "markers"
}

// Convert to API model
func (dm *DBMarker) ToMarker() *Marker {
    return &Marker{
        ID:          dm.ID,
        Serial:      dm.Serial,
        Lat:         dm.Lat,
        Lng:         dm.Lng,
        Frequency:   dm.Frequency,
        Notes:       dm.Notes,
        Type:        dm.Type,
        IsDraggable: dm.IsDraggable,
        CreatedAt:   dm.CreatedAt,
        UpdatedAt:   dm.UpdatedAt,
    }
}

// Convert from API model
func (dm *DBMarker) FromMarker(m *Marker) {
    dm.ID = m.ID
    dm.Serial = m.Serial
    dm.Lat = m.Lat
    dm.Lng = m.Lng
    dm.Frequency = m.Frequency
    dm.Notes = m.Notes
    dm.Type = m.Type
    dm.IsDraggable = m.IsDraggable
    dm.CreatedAt = m.CreatedAt
    dm.UpdatedAt = m.UpdatedAt
}

type DBGeometry struct {
    ID            string    `gorm:"primaryKey" json:"id"`
    Type          string    `gorm:"not null" json:"type"` // circle, polygon, rectangle
    Serial        string    `gorm:"unique;not null" json:"serial"`
    Color         string    `json:"color"`
    CenterLat     float64   `json:"center_lat"`
    CenterLng     float64   `json:"center_lng"`
    CenterMarkerID string   `json:"center_marker_id"`
    
    // Circle properties
    CircleRadius   *float64 `json:"circle_radius,omitempty"`
    CircleUnit     *string  `json:"circle_unit,omitempty"`
    CircleArea     *float64 `json:"circle_area,omitempty"`
    
    // Polygon properties (stored as JSON)
    PolygonPoints *string `json:"polygon_points,omitempty"` // JSON array of coordinates
    PolygonArea   *float64 `json:"polygon_area,omitempty"`
    
    // Rectangle properties (stored as JSON)
    RectangleBounds *string  `json:"rectangle_bounds,omitempty"` // JSON array of [SW, NE]
    RectangleArea   *float64 `json:"rectangle_area,omitempty"`
    
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

func (DBGeometry) TableName() string {
    return "geometries"
}

type DBSFAF struct {
    ID        string    `gorm:"primaryKey" json:"id"`
    MarkerID  string    `gorm:"not null" json:"marker_id"`
    FieldData string    `json:"field_data"` // JSON blob of all form fields
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

func (DBSFAF) TableName() string {
    return "sfaf_forms"
}