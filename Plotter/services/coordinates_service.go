// coordinates_service.go

package services

import (
	"fmt"
	"math"
	"sfaf-plotter/models"
)

type CoordinateService struct{}

func NewCoordinateService() *CoordinateService {
	return &CoordinateService{}
}

func (cs *CoordinateService) ConvertToDMS(decimal float64, isLongitude bool) string {
	absDecimal := math.Abs(decimal)
	degrees := int(absDecimal)
	minutesFloat := (absDecimal - float64(degrees)) * 60
	minutes := int(minutesFloat)
	seconds := int((minutesFloat - float64(minutes)) * 60) // Convert to int for 0 decimal places

	var direction string
	if isLongitude {
		if decimal < 0 {
			direction = "W"
		} else {
			direction = "E"
		}
	} else {
		if decimal < 0 {
			direction = "S"
		} else {
			direction = "N"
		}
	}

	return fmt.Sprintf("%d°%d'%d\" %s", degrees, minutes, seconds, direction)
}

func (cs *CoordinateService) DecimalToCompactDMS(decimal float64, isLongitude bool) string {
	absDecimal := math.Abs(decimal)
	degrees := int(absDecimal)
	minutesFloat := (absDecimal - float64(degrees)) * 60
	minutes := int(minutesFloat)
	seconds := int((minutesFloat - float64(minutes)) * 60)

	var direction string
	var degreesPadLength int

	if isLongitude {
		degreesPadLength = 3
		if decimal < 0 {
			direction = "W"
		} else {
			direction = "E"
		}
	} else {
		degreesPadLength = 2
		if decimal < 0 {
			direction = "S"
		} else {
			direction = "N"
		}
	}

	return fmt.Sprintf("%0*d%02d%02d%s",
		degreesPadLength, degrees, minutes, seconds, direction)
}

func (cs *CoordinateService) ConvertLatLngToCompactDMS(lat, lng float64) string {
	latDMS := cs.DecimalToCompactDMS(lat, false)
	lngDMS := cs.DecimalToCompactDMS(lng, true)
	return latDMS + lngDMS
}

func (cs *CoordinateService) GetAllFormats(lat, lng float64) models.CoordinateResponse {
	return models.CoordinateResponse{
		Decimal: fmt.Sprintf("%.4f, %.4f", lat, lng), // Always 4 decimal places
		DMS:     cs.ConvertToDMS(lat, false) + ", " + cs.ConvertToDMS(lng, true),
		Compact: cs.ConvertLatLngToCompactDMS(lat, lng),
	}
}

// ParseCompactDMS parses compact DMS strings into decimal lat/lng.
//
// Three formats are supported:
//
//  15-char standard  "302521N0864150W"
//    DDMMSS + N/S + DDDMMSS (3-digit lon degrees) + E/W
//
//  13-char SXXI/E    "492627E073541"
//    DDMMSS + E or W (lon direction) + DDMMSS (2-digit lon degrees)
//    Latitude sign assumed positive (North). Used in SXXI DOTS European exports.
//
//  13-char SXXI/N    "492627N073541"
//    DDMMSS + N or S + DDMMSS (2-digit lon degrees)
//    Longitude direction assumed East.
func (cs *CoordinateService) ParseCompactDMS(compactDMS string) (lat, lng float64, err error) {
	// Strip leading/trailing spaces without importing strings
	for len(compactDMS) > 0 && (compactDMS[0] == ' ' || compactDMS[0] == '\t') {
		compactDMS = compactDMS[1:]
	}
	for len(compactDMS) > 0 && (compactDMS[len(compactDMS)-1] == ' ' || compactDMS[len(compactDMS)-1] == '\t') {
		compactDMS = compactDMS[:len(compactDMS)-1]
	}

	n := len(compactDMS)
	if n < 13 {
		return 0, 0, fmt.Errorf("invalid compact DMS: too short (%d chars, need ≥13)", n)
	}

	dirChar := compactDMS[6] // direction character at position 6

	var latStr, lngStr string
	var latDir, lngDir byte

	switch {
	case n == 15:
		// Standard: DDMMSSN DDDMMSSW
		latStr = compactDMS[0:6]
		latDir = dirChar
		lngStr = compactDMS[7:14]
		lngDir = compactDMS[14]

	case n == 13 && (dirChar == 'E' || dirChar == 'W'):
		// SXXI DOTS European: DDMMSS + lon-dir + DDMMSS (2-digit lon degrees)
		// Latitude has no explicit direction; assumed positive (North).
		latStr = compactDMS[0:6]
		latDir = 'N'
		lngStr = compactDMS[7:13]
		lngDir = dirChar

	case n == 13 && (dirChar == 'N' || dirChar == 'S'):
		// SXXI DOTS with lat direction: DDMMSSN + DDMMSS (2-digit lon degrees, E assumed)
		latStr = compactDMS[0:6]
		latDir = dirChar
		lngStr = compactDMS[7:13]
		lngDir = 'E'

	default:
		return 0, 0, fmt.Errorf("invalid compact DMS: unrecognised format (len=%d, dir=%q)", n, string(dirChar))
	}

	// Parse latitude DDMMSS
	var latDeg, latMin, latSec int
	if _, err = fmt.Sscanf(latStr, "%2d%2d%2d", &latDeg, &latMin, &latSec); err != nil {
		return 0, 0, fmt.Errorf("failed to parse latitude %q: %v", latStr, err)
	}
	lat = float64(latDeg) + float64(latMin)/60.0 + float64(latSec)/3600.0
	if latDir == 'S' {
		lat = -lat
	}

	// Parse longitude — 3-digit degrees for 15-char format, 2-digit for 13-char
	var lngDeg, lngMin, lngSec int
	if n == 15 {
		if _, err = fmt.Sscanf(lngStr, "%3d%2d%2d", &lngDeg, &lngMin, &lngSec); err != nil {
			return 0, 0, fmt.Errorf("failed to parse longitude %q: %v", lngStr, err)
		}
	} else {
		if _, err = fmt.Sscanf(lngStr, "%2d%2d%2d", &lngDeg, &lngMin, &lngSec); err != nil {
			return 0, 0, fmt.Errorf("failed to parse longitude %q: %v", lngStr, err)
		}
	}
	lng = float64(lngDeg) + float64(lngMin)/60.0 + float64(lngSec)/3600.0
	if lngDir == 'W' {
		lng = -lng
	}

	return lat, lng, nil
}
