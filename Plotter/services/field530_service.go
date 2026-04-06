// services/field530_service.go
package services

import (
	"fmt"
	"regexp"
	"sfaf-plotter/models"
	"sfaf-plotter/repositories"
	"strconv"
	"strings"

	"github.com/google/uuid"
)

type Field530Service struct {
	sfafRepo   *repositories.SFAFRepository
	coordService *CoordinateService
}

func NewField530Service(sfafRepo *repositories.SFAFRepository, coordService *CoordinateService) *Field530Service {
	return &Field530Service{
		sfafRepo:   sfafRepo,
		coordService: coordService,
	}
}

// ParseField530Coordinate parses a single Field 530 line
// Format: "ART,450000N0050000E" or "ARR,S OF 33N" or "ART,SW WY,NE UT,NW CO"
func (s *Field530Service) ParseField530Coordinate(value string) (*models.Field530Coordinate, error) {
	value = strings.TrimSpace(value)

	// Split by comma to get code and coordinate
	parts := strings.SplitN(value, ",", 2)
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid field 530 format: expected CODE,VALUE")
	}

	code := strings.TrimSpace(parts[0])
	coordPart := strings.TrimSpace(parts[1])

	// Validate code
	if code != "ART" && code != "ARR" && code != "ARB" {
		return nil, fmt.Errorf("invalid field 530 code: %s (expected ART, ARR, or ARB)", code)
	}

	// Try to parse as coordinate (DDMMSSN/SDDDMMSSE/W format)
	lat, lng, err := s.parseCoordinateString(coordPart)
	if err != nil {
		// Not a coordinate format - might be descriptive text like "SW WY,NE UT"
		// Return with zero coordinates for now (descriptive areas don't have exact coords)
		return &models.Field530Coordinate{
			Code:      code,
			Latitude:  0,
			Longitude: 0,
			RawValue:  value,
		}, nil
	}

	return &models.Field530Coordinate{
		Code:      code,
		Latitude:  lat,
		Longitude: lng,
		RawValue:  value,
	}, nil
}

// parseCoordinateString parses MC4EB Pub 7 CHG 1 coordinate format: DDMMSSN/SDDDMMSSE/W
// Example: 450000N0050000E = 45°00'00"N, 005°00'00"E
func (s *Field530Service) parseCoordinateString(coordStr string) (float64, float64, error) {
	coordStr = strings.TrimSpace(coordStr)

	// Regex pattern for DDMMSSN/SDDDMMSSE/W format
	// Latitude: 6-7 digits + N/S
	// Longitude: 7-8 digits + E/W
	pattern := `^(\d{6})([NS])(\d{7})([EW])$`
	re := regexp.MustCompile(pattern)
	matches := re.FindStringSubmatch(coordStr)

	if len(matches) != 5 {
		return 0, 0, fmt.Errorf("invalid coordinate format: %s", coordStr)
	}

	latStr := matches[1]      // DDMMSS
	latDir := matches[2]       // N or S
	lngStr := matches[3]       // DDDMMSS
	lngDir := matches[4]       // E or W

	// Parse latitude (DDMMSS)
	latDeg, _ := strconv.Atoi(latStr[0:2])
	latMin, _ := strconv.Atoi(latStr[2:4])
	latSec, _ := strconv.Atoi(latStr[4:6])
	lat := float64(latDeg) + float64(latMin)/60.0 + float64(latSec)/3600.0
	if latDir == "S" {
		lat = -lat
	}

	// Parse longitude (DDDMMSS)
	lngDeg, _ := strconv.Atoi(lngStr[0:3])
	lngMin, _ := strconv.Atoi(lngStr[3:5])
	lngSec, _ := strconv.Atoi(lngStr[5:7])
	lng := float64(lngDeg) + float64(lngMin)/60.0 + float64(lngSec)/3600.0
	if lngDir == "W" {
		lng = -lng
	}

	return lat, lng, nil
}

// GetField530PolygonByMarkerID retrieves and parses all Field 530 occurrences for a marker
func (s *Field530Service) GetField530PolygonByMarkerID(markerID uuid.UUID) (*models.Field530Polygon, error) {
	// Get all SFAF fields for this marker with field_number = "530"
	fields, err := s.sfafRepo.GetSFAFFieldsByMarkerAndField(markerID, "530")
	if err != nil {
		return nil, fmt.Errorf("failed to get field 530 occurrences: %w", err)
	}

	if len(fields) == 0 {
		return nil, fmt.Errorf("no field 530 data found for marker %s", markerID)
	}

	// Parse each occurrence
	coordinates := []models.Field530Coordinate{}
	polygonType := ""

	for _, field := range fields {
		coord, err := s.ParseField530Coordinate(field.FieldValue)
		if err != nil {
			fmt.Printf("⚠️ Warning: Failed to parse Field 530 occurrence %d: %v\n", field.OccurrenceNumber, err)
			continue
		}

		// Determine polygon type from first valid coordinate
		if polygonType == "" {
			switch coord.Code {
			case "ART":
				polygonType = "transmit"
			case "ARR":
				polygonType = "receive"
			case "ARB":
				polygonType = "both"
			}
		}

		// Only include coordinates with actual lat/lng values (skip descriptive entries)
		if coord.Latitude != 0 || coord.Longitude != 0 {
			coordinates = append(coordinates, *coord)
		}
	}

	polygon := &models.Field530Polygon{
		SFAFID:      uuid.Nil, // Will be populated if needed
		Type:        polygonType,
		Coordinates: coordinates,
		IsValid:     len(coordinates) >= 3, // Polygon needs at least 3 points
	}

	return polygon, nil
}

// GetAllField530Polygons retrieves all markers that have Field 530 polygon data
func (s *Field530Service) GetAllField530Polygons() ([]models.Field530PolygonResponse, error) {
	// Get all markers with Field 530 data
	// This requires querying the sfaf_fields table for field_number = "530"
	markerIDs, err := s.sfafRepo.GetMarkersWithField("530")
	if err != nil {
		return nil, fmt.Errorf("failed to get markers with field 530: %w", err)
	}

	results := []models.Field530PolygonResponse{}

	for _, markerID := range markerIDs {
		// Get polygon for this marker
		polygon, err := s.GetField530PolygonByMarkerID(markerID)
		if err != nil {
			fmt.Printf("⚠️ Warning: Failed to parse polygon for marker %s: %v\n", markerID, err)
			continue
		}

		// Get marker details (serial number, etc.)
		marker, err := s.sfafRepo.GetMarkerByID(markerID)
		if err != nil {
			fmt.Printf("⚠️ Warning: Failed to get marker details for %s: %v\n", markerID, err)
			continue
		}

		results = append(results, models.Field530PolygonResponse{
			MarkerID:       markerID.String(),
			SerialNumber:   marker.Serial,
			Polygon:        *polygon,
			RawOccurrences: []models.SFAFFieldOccurrence{}, // Optionally populate if needed
		})
	}

	return results, nil
}

// ValidateField530Format validates a Field 530 coordinate string
func (s *Field530Service) ValidateField530Format(value string) error {
	_, err := s.ParseField530Coordinate(value)
	return err
}
