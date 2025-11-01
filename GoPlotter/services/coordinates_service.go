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
