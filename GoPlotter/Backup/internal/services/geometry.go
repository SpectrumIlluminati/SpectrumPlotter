// services/geometry.go
package services

import (
	"fmt"
	"math"
	"time"

	"sfaf-plotter/internal/models"
	"sfaf-plotter/internal/storage"

	"github.com/google/uuid"
)

type GeometryService struct {
	storage             storage.Storage
	marker_modelService *MarkerService
	serialService       *SerialService
}

func NewGeometryService(storage storage.Storage, marker_modelService *MarkerService, serialService *SerialService) *GeometryService {
	return &GeometryService{
		storage:             storage,
		marker_modelService: marker_modelService,
		serialService:       serialService,
	}
}

// CreateCircle matches your handleCircleCreation function
func (gs *GeometryService) CreateCircle(req models.CreateCircleRequest) (*models.Geometry, error) {
	// Default unit to km if not specified
	if req.Unit == "" {
		req.Unit = "km"
	}

	// Default color if not specified
	if req.Color == "" {
		req.Color = gs.getRandomColor()
	}

	// Convert radius to meters
	radiusMeters := req.Radius * 1000 // km to meters
	if req.Unit == "nm" {
		radiusMeters = req.Radius * 1852 // nautical miles to meters
	}

	// Calculate area in square miles
	areaM2 := math.Pi * math.Pow(radiusMeters, 2)
	areaSqMi := areaM2 / 2.59e6

	// Create center marker
	centerMarkerReq := models.CreateMarkerRequest{
		Lat:       req.Lat,
		Lng:       req.Lng,
		Frequency: req.Frequency,
		Notes:     req.Notes,
		Type:      "circle-center",
	}

	centerMarkerResp, err := gs.marker_modelService.CreateMarker(centerMarkerReq)
	if err != nil {
		return nil, err
	}

	// Create geometry
	geometry := &models.Geometry{
		ID:           uuid.New().String(),
		Type:         models.GeometryTypeCircle,
		Serial:       gs.serialService.GenerateSerial(),
		Color:        req.Color,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		CenterMarker: &centerMarkerResp.Marker,
		CircleProps: &models.CircleGeometry{
			Radius:   radiusMeters,
			RadiusKm: radiusMeters / 1000,
			RadiusNm: radiusMeters / 1852,
			Area:     areaSqMi,
			Unit:     req.Unit,
		},
	}

	// Note: We would need to add geometry storage methods
	// For now, we'll store in the same storage with a different key pattern

	return geometry, nil
}

// CreatePolygon matches your handlePolygonCreation function
func (gs *GeometryService) CreatePolygon(req models.CreatePolygonRequest) (*models.Geometry, error) {
	if len(req.Points) < 3 {
		return nil, fmt.Errorf("polygon must have at least 3 points")
	}

	// Default color if not specified
	if req.Color == "" {
		req.Color = gs.getRandomColor()
	}

	// Calculate centroid (center point)
	center := gs.calculateCentroid(req.Points)

	// Create center marker
	centerMarkerReq := models.CreateMarkerRequest{
		Lat:       center.Lat,
		Lng:       center.Lng,
		Frequency: req.Frequency,
		Notes:     req.Notes,
		Type:      "polygon-center",
	}

	centerMarkerResp, err := gs.marker_modelService.CreateMarker(centerMarkerReq)
	if err != nil {
		return nil, err
	}

	// Calculate area (simplified - you might want a more accurate method)
	area := gs.calculatePolygonArea(req.Points)

	// Create geometry
	geometry := &models.Geometry{
		ID:           uuid.New().String(),
		Type:         models.GeometryTypePolygon,
		Serial:       gs.serialService.GenerateSerial(),
		Color:        req.Color,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		CenterMarker: &centerMarkerResp.Marker,
		PolygonProps: &models.PolygonGeometry{
			Points:   req.Points,
			Vertices: len(req.Points),
			Area:     area,
		},
	}

	return geometry, nil
}

// CreateRectangle matches your handleRectangleCreation function
func (gs *GeometryService) CreateRectangle(req models.CreateRectangleRequest) (*models.Geometry, error) {
	// Default color if not specified
	if req.Color == "" {
		req.Color = gs.getRandomColor()
	}

	// Calculate center point
	centerLat := (req.SouthWest.Lat + req.NorthEast.Lat) / 2
	centerLng := (req.SouthWest.Lng + req.NorthEast.Lng) / 2

	// Create center marker
	centerMarkerReq := models.CreateMarkerRequest{
		Lat:       centerLat,
		Lng:       centerLng,
		Frequency: req.Frequency,
		Notes:     req.Notes,
		Type:      "rectangle-center",
	}

	centerMarkerResp, err := gs.marker_modelService.CreateMarker(centerMarkerReq)
	if err != nil {
		return nil, err
	}

	// Calculate area (simplified)
	latDiff := math.Abs(req.NorthEast.Lat - req.SouthWest.Lat)
	lngDiff := math.Abs(req.NorthEast.Lng - req.SouthWest.Lng)
	area := latDiff * lngDiff * 3959 // Rough conversion to square miles

	// Create geometry
	geometry := &models.Geometry{
		ID:           uuid.New().String(),
		Type:         models.GeometryTypeRectangle,
		Serial:       gs.serialService.GenerateSerial(),
		Color:        req.Color,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		CenterMarker: &centerMarkerResp.Marker,
		RectangleProps: &models.RectangleGeometry{
			Bounds: []models.Coordinate{req.SouthWest, req.NorthEast},
			Area:   area,
		},
	}

	return geometry, nil
}

// Helper functions
func (gs *GeometryService) getRandomColor() string {
	colors := []string{"#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FCEA2B", "#FF9FF3", "#54A0FF"}
	return colors[time.Now().UnixNano()%int64(len(colors))]
}

func (gs *GeometryService) calculateCentroid(points []models.Coordinate) models.Coordinate {
	var sumLat, sumLng float64
	for _, point := range points {
		sumLat += point.Lat
		sumLng += point.Lng
	}
	return models.Coordinate{
		Lat: sumLat / float64(len(points)),
		Lng: sumLng / float64(len(points)),
	}
}

func (gs *GeometryService) calculatePolygonArea(points []models.Coordinate) float64 {
	// Simplified area calculation - you might want to use a more accurate method
	// This is a rough approximation
	if len(points) < 3 {
		return 0
	}

	var area float64
	n := len(points)

	for i := 0; i < n; i++ {
		j := (i + 1) % n
		area += points[i].Lat * points[j].Lng
		area -= points[j].Lat * points[i].Lng
	}

	area = math.Abs(area) / 2.0
	return area * 3959 // Rough conversion to square miles
}
