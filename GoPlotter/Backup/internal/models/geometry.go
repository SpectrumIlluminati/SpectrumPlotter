// models/geometry.go
package models

import (
    "time"
)

type GeometryType string

const (
    GeometryTypeCircle    GeometryType = "circle"
    GeometryTypePolygon   GeometryType = "polygon"
    GeometryTypeRectangle GeometryType = "rectangle"
)

type Geometry struct {
    ID        string       `json:"id"`
    Type      GeometryType `json:"type"`
    Serial    string       `json:"serial"`
    Color     string       `json:"color"`
    CreatedAt time.Time    `json:"created_at"`
    UpdatedAt time.Time    `json:"updated_at"`
    
    // Center marker (all geometries have one)
    CenterMarker *Marker `json:"center_marker"`
    
    // Type-specific properties
    CircleProps    *CircleGeometry    `json:"circle_properties,omitempty"`
    PolygonProps   *PolygonGeometry   `json:"polygon_properties,omitempty"`
    RectangleProps *RectangleGeometry `json:"rectangle_properties,omitempty"`
}

type CircleGeometry struct {
    Radius     float64 `json:"radius"`      // in meters
    RadiusKm   float64 `json:"radius_km"`   // in kilometers  
    RadiusNm   float64 `json:"radius_nm"`   // in nautical miles
    Area       float64 `json:"area"`        // in square miles
    Unit       string  `json:"unit"`        // "km" or "nm"
}

type PolygonGeometry struct {
    Points   []Coordinate `json:"points"`
    Vertices int          `json:"vertices"`
    Area     float64      `json:"area"` // in square miles
}

type RectangleGeometry struct {
    Bounds []Coordinate `json:"bounds"` // [SW, NE]
    Area   float64      `json:"area"`   // in square miles
}

// Create requests
type CreateCircleRequest struct {
    Lat        float64 `json:"lat" binding:"required"`
    Lng        float64 `json:"lng" binding:"required"`
    Radius     float64 `json:"radius" binding:"required"`
    Unit       string  `json:"unit"`   // "km" or "nm", defaults to "km"
    Color      string  `json:"color"`
    Frequency  string  `json:"frequency"`
    Notes      string  `json:"notes"`
}

type CreatePolygonRequest struct {
    Points    []Coordinate `json:"points" binding:"required"`
    Color     string       `json:"color"`
    Frequency string       `json:"frequency"`
    Notes     string       `json:"notes"`
}

type CreateRectangleRequest struct {
    SouthWest Coordinate `json:"south_west" binding:"required"`
    NorthEast Coordinate `json:"north_east" binding:"required"`
    Color     string     `json:"color"`
    Frequency string     `json:"frequency"`
    Notes     string     `json:"notes"`
}