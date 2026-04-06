// geometry_service.go
package services

import (
	"fmt"
	"math"
	"time"

	"sfaf-plotter/models"
	"sfaf-plotter/repositories"

	"github.com/google/uuid"
)

type GeometryService struct {
	geometryRepo  *repositories.GeometryRepository
	markerService *MarkerService
	serialService *SerialService
	coordService  *CoordinateService
}

func NewGeometryService(
	geometryRepo *repositories.GeometryRepository,
	markerService *MarkerService,
	serialService *SerialService,
	coordService *CoordinateService,
) *GeometryService {
	return &GeometryService{
		geometryRepo:  geometryRepo,
		markerService: markerService,
		serialService: serialService,
		coordService:  coordService,
	}
}

// CreateCircle matches your handleCircleCreation function
func (gs *GeometryService) CreateCircle(req models.CreateCircleRequest) (*models.Geometry, error) {
	// Create center marker first
	centerMarkerReq := models.CreateMarkerRequest{
		Latitude:   req.Lat,
		Longitude:  req.Lng,
		Frequency:  req.Frequency,
		Notes:      req.Notes,
		MarkerType: "circle-center",
	}

	markerResponse, err := gs.markerService.CreateMarker(centerMarkerReq)
	if err != nil {
		return nil, err
	}

	// Normalize radius to kilometers based on input unit
	var radiusKm float64
	if req.Unit == "nm" || req.Unit == "NM" {
		// Convert nautical miles to kilometers
		radiusKm = req.Radius * 1.852
	} else {
		// Default to kilometers
		radiusKm = req.Radius
	}

	// Convert to all units for storage
	radiusMeters := radiusKm * 1000       // Convert km to meters
	radiusNm := radiusKm * 0.539957       // Convert km to nautical miles

	// Calculate area (π * r²) in square kilometers, then convert to square miles
	areaKm2 := math.Pi * radiusKm * radiusKm
	areaMiles := areaKm2 * 0.386102 // Convert km² to mi²

	// Default color if not specified
	if req.Color == "" {
		req.Color = gs.getRandomColor()
	}

	// FIXED: Set MarkerID when creating geometry
	geometry := &models.Geometry{
		ID:          uuid.New(),
		MarkerID:    markerResponse.Marker.ID, // SET THE MARKER ID
		Type:        models.GeometryTypeCircle,
		Color:       req.Color,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		Latitude:    req.Lat,
		Longitude:   req.Lng,
		CircleProps: &models.CircleGeometry{
			Radius:   radiusMeters,
			RadiusKm: radiusKm,
			RadiusNm: radiusNm,
			Area:     areaMiles,
			Unit:     req.Unit,
		},
	}

	err = gs.geometryRepo.Create(geometry) // Use Create instead of SaveGeometry
	if err != nil {
		return nil, fmt.Errorf("failed to save geometry: %w", err)
	}

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
		Latitude:   center.Lat,
		Longitude:  center.Lng,
		Frequency:  req.Frequency,
		Notes:      req.Notes,
		MarkerType: "polygon-center",
	}

	markerResponse, err := gs.markerService.CreateMarker(centerMarkerReq)
	if err != nil {
		return nil, err
	}

	// Calculate area (simplified - you might want a more accurate method)
	area := gs.calculatePolygonArea(req.Points)

	// Create geometry with MarkerID
	geometry := &models.Geometry{
		ID:        uuid.New(),
		MarkerID:  markerResponse.Marker.ID, // FIXED: Set the MarkerID
		Type:      models.GeometryTypePolygon,
		Color:     req.Color,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Latitude:  center.Lat,
		Longitude: center.Lng,
		PolygonProps: &models.PolygonGeometry{
			Points:   req.Points,
			Vertices: len(req.Points),
			Area:     area,
		},
	}

	// FIXED: Actually save to database
	err = gs.geometryRepo.Create(geometry)
	if err != nil {
		return nil, fmt.Errorf("failed to save geometry: %w", err)
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
		Latitude:   centerLat,
		Longitude:  centerLng,
		Frequency:  req.Frequency,
		Notes:      req.Notes,
		MarkerType: "rectangle-center",
	}

	markerResponse, err := gs.markerService.CreateMarker(centerMarkerReq)
	if err != nil {
		return nil, fmt.Errorf("failed to create center marker: %w", err)
	}

	// Calculate area
	latDiff := math.Abs(req.NorthEast.Lat - req.SouthWest.Lat)
	lngDiff := math.Abs(req.NorthEast.Lng - req.SouthWest.Lng)
	area := latDiff * lngDiff * 3959 // Rough conversion to square miles

	// Create geometry with proper MarkerID
	geometry := &models.Geometry{
		ID:        uuid.New(),
		MarkerID:  markerResponse.Marker.ID, // IMPORTANT: Set the MarkerID
		Type:      models.GeometryTypeRectangle,
		Color:     req.Color,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Latitude:  centerLat,
		Longitude: centerLng,
		RectangleProps: &models.RectangleGeometry{
			Bounds: []models.Coordinate{req.SouthWest, req.NorthEast},
			Area:   area,
		},
	}

	// CRITICAL: Actually save to database
	err = gs.geometryRepo.Create(geometry)
	if err != nil {
		return nil, fmt.Errorf("failed to save geometry: %w", err)
	}

	return geometry, nil
}

// UpdateCircle updates an existing circle geometry
func (gs *GeometryService) UpdateCircle(id string, req models.CreateCircleRequest) (*models.Geometry, error) {
	// Get existing geometry
	geometry, err := gs.geometryRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get geometry: %w", err)
	}

	if geometry == nil {
		return nil, fmt.Errorf("geometry not found")
	}

	// Normalize radius to kilometers based on input unit
	var radiusKm float64
	if req.Unit == "nm" || req.Unit == "NM" {
		radiusKm = req.Radius * 1.852
	} else {
		radiusKm = req.Radius
	}

	// Convert to all units for storage
	radiusMeters := radiusKm * 1000
	radiusNm := radiusKm * 0.539957

	// Calculate area
	areaKm2 := math.Pi * radiusKm * radiusKm
	areaMiles := areaKm2 * 0.386102

	// Update geometry
	geometry.Latitude = req.Lat
	geometry.Longitude = req.Lng
	geometry.CircleProps = &models.CircleGeometry{
		Radius:   radiusMeters,
		RadiusKm: radiusKm,
		RadiusNm: radiusNm,
		Area:     areaMiles,
		Unit:     req.Unit,
	}
	geometry.UpdatedAt = time.Now()

	err = gs.geometryRepo.Update(geometry)
	if err != nil {
		return nil, fmt.Errorf("failed to update geometry: %w", err)
	}

	return geometry, nil
}

// UpdatePolygon updates an existing polygon geometry
func (gs *GeometryService) UpdatePolygon(id string, req models.CreatePolygonRequest) (*models.Geometry, error) {
	if len(req.Points) < 3 {
		return nil, fmt.Errorf("polygon must have at least 3 points")
	}

	// Get existing geometry
	geometry, err := gs.geometryRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get geometry: %w", err)
	}

	if geometry == nil {
		return nil, fmt.Errorf("geometry not found")
	}

	// Calculate centroid
	center := gs.calculateCentroid(req.Points)

	// Calculate area
	area := gs.calculatePolygonArea(req.Points)

	// Update geometry
	geometry.Latitude = center.Lat
	geometry.Longitude = center.Lng
	geometry.PolygonProps = &models.PolygonGeometry{
		Points:   req.Points,
		Vertices: len(req.Points),
		Area:     area,
	}
	geometry.UpdatedAt = time.Now()

	err = gs.geometryRepo.Update(geometry)
	if err != nil {
		return nil, fmt.Errorf("failed to update geometry: %w", err)
	}

	return geometry, nil
}

// UpdateRectangle updates an existing rectangle geometry
func (gs *GeometryService) UpdateRectangle(id string, req models.CreateRectangleRequest) (*models.Geometry, error) {
	// Get existing geometry
	geometry, err := gs.geometryRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get geometry: %w", err)
	}

	if geometry == nil {
		return nil, fmt.Errorf("geometry not found")
	}

	// Calculate center point
	centerLat := (req.SouthWest.Lat + req.NorthEast.Lat) / 2
	centerLng := (req.SouthWest.Lng + req.NorthEast.Lng) / 2

	// Calculate area
	latDiff := math.Abs(req.NorthEast.Lat - req.SouthWest.Lat)
	lngDiff := math.Abs(req.NorthEast.Lng - req.SouthWest.Lng)
	area := latDiff * lngDiff * 3959

	// Update geometry
	geometry.Latitude = centerLat
	geometry.Longitude = centerLng
	geometry.RectangleProps = &models.RectangleGeometry{
		Bounds: []models.Coordinate{req.SouthWest, req.NorthEast},
		Area:   area,
	}
	geometry.UpdatedAt = time.Now()

	err = gs.geometryRepo.Update(geometry)
	if err != nil {
		return nil, fmt.Errorf("failed to update geometry: %w", err)
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

// GetAllGeometries returns all geometries from the database
func (gs *GeometryService) GetAllGeometries() ([]*models.Geometry, error) {
	return gs.geometryRepo.GetAll()
}

// DeleteGeometry deletes a geometry by ID
func (gs *GeometryService) DeleteGeometry(id string) error {
	return gs.geometryRepo.Delete(id)
}
