// sfaf_service.go
package services

import (
	"bufio"
	"fmt"
	"io"
	"log"
	"sfaf-plotter/models"
	"sfaf-plotter/storage"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

type SFAFService struct {
	storage      storage.Storage
	coordService *CoordinateService
	fieldDefs    map[string]models.SFAFFormDefinition
}

func (ss *SFAFService) ImportSFAFFile(file io.Reader, filename string) ([]models.Marker, []models.SFAF, error) {
	scanner := bufio.NewScanner(file)
	var allMarkers []models.Marker
	var allSfafRecords []models.SFAF

	// Parse multiple SFAF records in one file
	currentSfafData := make(map[string]string)
	currentField := ""

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// Empty line or "---" might indicate new record
		if line == "" || line == "---" || line == "END" {
			// Process current record if it has coordinates
			if coords := currentSfafData["field303"]; coords != "" {
				marker, sfaf := ss.processSingleSFAFRecord(currentSfafData)
				if marker != nil && sfaf != nil {
					allMarkers = append(allMarkers, *marker)
					allSfafRecords = append(allSfafRecords, *sfaf)
				}
			}
			// Reset for next record
			currentSfafData = make(map[string]string)
			currentField = ""
			continue
		}

		// Parse fields (same logic as before)
		if strings.Contains(line, ".") && !strings.HasPrefix(line, " ") {
			parts := strings.SplitN(line, ".", 2)
			if len(parts) == 2 {
				fieldID := strings.TrimSpace(parts[0])
				value := strings.TrimSpace(parts[1])

				currentField = "field" + fieldID

				if value != "" && value != "$" {
					if existing, exists := currentSfafData[currentField]; exists && (fieldID == "502" || fieldID == "520") {
						currentSfafData[currentField] = existing + " " + value
					} else {
						currentSfafData[currentField] = value
					}
				}
			}
		} else if currentField != "" && (strings.HasPrefix(currentField, "field502") || strings.HasPrefix(currentField, "field520")) {
			if line != "$" {
				currentSfafData[currentField] += " " + line
			}
		}
	}

	// Process final record
	if coords := currentSfafData["field303"]; coords != "" {
		marker, sfaf := ss.processSingleSFAFRecord(currentSfafData)
		if marker != nil && sfaf != nil {
			allMarkers = append(allMarkers, *marker)
			allSfafRecords = append(allSfafRecords, *sfaf)
		}
	}

	return allMarkers, allSfafRecords, nil
}

// Helper method to process a single SFAF record WITHOUT saving
func (ss *SFAFService) processSingleSFAFRecord(sfafData map[string]string) (*models.Marker, *models.SFAF) {
	coords := sfafData["field303"]
	if coords != "" {
		lat, lng, err := ss.parseCoordinates(coords)
		if err == nil {
			// Create marker object (don't save yet)
			marker := models.Marker{
				ID:          uuid.New(),
				Serial:      sfafData["field102"],
				Latitude:    lat,
				Longitude:   lng,
				Frequency:   sfafData["field110"], // Keep full frequency
				Notes:       ss.buildComprehensiveNotes(sfafData),
				MarkerType:  "imported",
				IsDraggable: false,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			}

			// Create SFAF object (don't save yet)
			sfaf := models.SFAF{
				ID:        uuid.New(),
				MarkerID:  marker.ID, // Use the SAME ID as the marker
				Fields:    sfafData,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}

			return &marker, &sfaf
		}
	}

	return nil, nil
}

func (ss *SFAFService) GetCoordinateFormats(lat, lng float64) models.CoordinateResponse {
	return ss.coordService.GetAllFormats(lat, lng)
}

func (ss *SFAFService) CreateSFAFWithoutValidation(req models.CreateSFAFRequest) (*models.SFAF, error) {
	// Convert string MarkerID to UUID
	markerUUID, err := uuid.Parse(req.MarkerID)
	if err != nil {
		return nil, fmt.Errorf("invalid marker ID format: %v", err)
	}

	sfaf := &models.SFAF{
		ID:        uuid.New(), // ✅ Direct UUID
		MarkerID:  markerUUID, // ✅ Converted UUID variable
		Fields:    req.Fields,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Save to storage
	if err := ss.storage.SaveSFAF(sfaf); err != nil {
		return nil, err
	}

	return sfaf, nil
}

// Helper method to process a single SFAF record
func (ss *SFAFService) processSingleSFAF(sfafData map[string]string) ([]models.Marker, []models.SFAF) {
	var markers []models.Marker
	var sfafRecords []models.SFAF

	coords := sfafData["field303"]
	if coords != "" {
		lat, lng, err := ss.parseCoordinates(coords)
		if err == nil {
			marker := models.Marker{
				ID:          uuid.New(),
				Serial:      sfafData["field102"],
				Latitude:    lat,
				Longitude:   lng,
				Frequency:   sfafData["field110"], // Keep FULL frequency with K prefix
				Notes:       ss.buildComprehensiveNotes(sfafData),
				MarkerType:  "imported",
				IsDraggable: false,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			}

			sfaf := &models.SFAF{
				ID:        uuid.New(),
				MarkerID:  marker.ID,
				Fields:    sfafData,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}

			if err := ss.storage.SaveSFAF(sfaf); err == nil {
				markers = append(markers, marker)
				sfafRecords = append(sfafRecords, *sfaf)
			}
		}
	}

	return markers, sfafRecords
}

func (ss *SFAFService) parseCoordinates(coords string) (float64, float64, error) {
	// Parse format: DDMMSSXDDDMMSSZ (e.g., 302521N0864150W)
	if len(coords) < 15 {
		return 0, 0, fmt.Errorf("invalid coordinate format: %s", coords)
	}

	// Extract latitude: DDMMSS + N/S (first 7 chars)
	latStr := coords[:6]  // DDMMSS
	latDir := coords[6:7] // N or S

	// Extract longitude: DDDMMSS + E/W (remaining chars)
	lngStr := coords[7:14]  // DDDMMSS (note: 7 digits for longitude)
	lngDir := coords[14:15] // E or W

	fmt.Printf("🔍 Parsing coords: %s -> lat:%s%s lng:%s%s\n", coords, latStr, latDir, lngStr, lngDir)

	lat, err := ss.dmsToDecimal(latStr, latDir)
	if err != nil {
		return 0, 0, fmt.Errorf("latitude error: %v", err)
	}

	lng, err := ss.dmsToDecimal(lngStr, lngDir)
	if err != nil {
		return 0, 0, fmt.Errorf("longitude error: %v", err)
	}

	fmt.Printf("🌍 Final coordinates: lat=%.6f, lng=%.6f\n", lat, lng)
	return lat, lng, nil
}

func (ss *SFAFService) dmsToDecimal(dmsStr, direction string) (float64, error) {
	if len(dmsStr) < 6 {
		return 0, fmt.Errorf("invalid DMS format: %s", dmsStr)
	}

	var degrees, minutes, seconds float64

	if len(dmsStr) == 6 {
		// Latitude format: DDMMSS (2 digits degrees)
		degrees, _ = strconv.ParseFloat(dmsStr[:2], 64)
		minutes, _ = strconv.ParseFloat(dmsStr[2:4], 64)
		seconds, _ = strconv.ParseFloat(dmsStr[4:6], 64)
	} else if len(dmsStr) == 7 {
		// Longitude format: DDDMMSS (3 digits degrees)
		degrees, _ = strconv.ParseFloat(dmsStr[:3], 64)
		minutes, _ = strconv.ParseFloat(dmsStr[3:5], 64)
		seconds, _ = strconv.ParseFloat(dmsStr[5:7], 64)
	} else {
		return 0, fmt.Errorf("invalid DMS length: %s", dmsStr)
	}

	fmt.Printf("   DMS parts: %s -> D:%.0f M:%.0f S:%.0f Dir:%s\n", dmsStr, degrees, minutes, seconds, direction)

	decimal := degrees + (minutes / 60.0) + (seconds / 3600.0)

	if direction == "S" || direction == "W" {
		decimal = -decimal
	}

	fmt.Printf("   Result: %.6f\n", decimal)
	return decimal, nil
}

// Update your existing extractFrequency method or add if it doesn't exist
func (ss *SFAFService) extractFrequency(freqField string) string {
	return freqField
}

func (ss *SFAFService) buildComprehensiveNotes(sfafData map[string]string) string {
	var notes []string

	// Primary identification - preserve exact formatting
	if agency := sfafData["field200"]; agency != "" {
		notes = append(notes, "Agency: "+agency)
	}

	if location := sfafData["field301"]; location != "" {
		notes = append(notes, "Location: "+location)
	}

	if equipment := sfafData["field340"]; equipment != "" {
		notes = append(notes, "Equipment: "+equipment)
	}

	// Purpose (truncated for notes but preserve original formatting)
	if purpose := sfafData["field502"]; purpose != "" {
		truncated := purpose
		if len(purpose) > 100 {
			truncated = purpose[:100] + "..."
		}
		notes = append(notes, "Purpose: "+truncated)
	}

	return strings.Join(notes, " | ")
}

func NewSFAFService(storage storage.Storage, coordService *CoordinateService) *SFAFService {
	service := &SFAFService{
		storage:      storage,
		coordService: coordService,
		fieldDefs:    make(map[string]models.SFAFFormDefinition),
	}

	service.initializeFieldDefinitions()
	return service
}

// Auto-populate SFAF fields from marker data

func (ss *SFAFService) AutoPopulateFromMarker(marker *models.Marker) map[string]string {
	fields := make(map[string]string)

	if marker.Latitude != 0 && marker.Longitude != 0 {
		compactCoords := ss.coordService.ConvertLatLngToCompactDMS(marker.Latitude, marker.Longitude)
		fields["field303"] = compactCoords // Transmitter coordinates
		fields["field403"] = compactCoords // Receiver coordinates
	}

	if marker.Frequency != "" {
		fields["field400"] = marker.Frequency
	}

	if marker.Serial != "" {
		fields["field101"] = marker.Serial
	}

	return fields
}

func (ss *SFAFService) GetFieldDefinitions() map[string]models.SFAFFormDefinition {
	return ss.fieldDefs
}

// Validate SFAF fields
func (ss *SFAFService) ValidateFields(fields map[string]string) models.ValidationResult {
	result := models.ValidationResult{
		IsValid: true,
		Errors:  make(map[string]string),
		Fields:  make(map[string]models.SFAFFormDefinition),
	}

	// Check all defined fields
	for fieldID, fieldDef := range ss.fieldDefs {
		value, exists := fields[fieldID]

		// Copy field definition and add current value
		resultField := fieldDef
		resultField.Validation = value
		result.Fields[fieldID] = resultField

		// Validate required fields
		if fieldDef.Required && (!exists || strings.TrimSpace(value) == "") {
			result.IsValid = false
			result.Errors[fieldID] = fmt.Sprintf("%s is required", fieldDef.Label)
			continue
		}

		// Validate field-specific rules
		if exists && value != "" {
			if err := ss.validateField(fieldID, value, fieldDef); err != nil {
				result.IsValid = false
				result.Errors[fieldID] = err.Error()
			}
		}
	}

	return result
}

// Validate individual field
func (ss *SFAFService) validateField(fieldID, value string, fieldDef models.SFAFFormDefinition) error {
	switch fieldDef.FieldType {
	case "number":
		if _, err := strconv.ParseFloat(value, 64); err != nil {
			return fmt.Errorf("%s must be a valid number", fieldDef.Label)
		}
	case "email":
		if !strings.Contains(value, "@") {
			return fmt.Errorf("%s must be a valid email address", fieldDef.Label)
		}
	case "date":
		if _, err := time.Parse("2006-01-02", value); err != nil {
			return fmt.Errorf("%s must be a valid date (YYYY-MM-DD)", fieldDef.Label)
		}
	}

	// Field-specific validation
	switch fieldID {
	case "field303", "field403": // Coordinate fields
		if !ss.isValidCoordinateFormat(value) {
			return fmt.Errorf("invalid coordinate format (expected: DDMMSSXDDDMMSSZ)")
		}
	case "field306": // Authorization radius
		if !ss.isValidRadiusFormat(value) {
			return fmt.Errorf("invalid radius format (expected: number optionally followed by B or T)")
		}
	case "field400", "field401": // Frequency fields
		if val, err := strconv.ParseFloat(value, 64); err != nil || val <= 0 {
			return fmt.Errorf("frequency must be a positive number")
		}
	}

	// Validate select options
	if fieldDef.FieldType == "select" && len(fieldDef.Options) > 0 {
		valid := false
		for _, option := range fieldDef.Options {
			if value == option {
				valid = true
				break
			}
		}
		if !valid {
			return fmt.Errorf("invalid option for %s", fieldDef.Label)
		}
	}

	return nil
}

// Create SFAF
func (ss *SFAFService) CreateSFAF(req models.CreateSFAFRequest) (*models.SFAF, error) {
	// Validate fields first
	validation := ss.ValidateFields(req.Fields)
	if !validation.IsValid {
		return nil, fmt.Errorf("validation failed")
	}

	// Convert string MarkerID to UUID - THIS IS THE FIX
	markerUUID, err := uuid.Parse(req.MarkerID)
	if err != nil {
		return nil, fmt.Errorf("invalid marker ID format: %v", err)
	}

	sfaf := &models.SFAF{
		ID:        uuid.New(), // ✅ Generates new UUID value
		MarkerID:  markerUUID, // ✅ Uses converted UUID value
		Fields:    req.Fields,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Save to storage
	if err := ss.storage.SaveSFAF(sfaf); err != nil {
		return nil, err
	}

	return sfaf, nil
}

// Update SFAF
func (ss *SFAFService) UpdateSFAF(sfafID string, req models.UpdateSFAFRequest) (*models.SFAF, error) {
	// Get existing SFAF
	sfaf, err := ss.storage.GetSFAF(sfafID)
	if err != nil {
		return nil, err
	}

	// Update fields
	sfaf.Fields = req.Fields
	sfaf.UpdatedAt = time.Now()

	// Validate updated fields
	validation := ss.ValidateFields(sfaf.Fields)
	if !validation.IsValid {
		return nil, fmt.Errorf("validation failed")
	}

	// Save updated SFAF
	if err := ss.storage.SaveSFAF(sfaf); err != nil {
		return nil, err
	}

	return sfaf, nil
}

// Helper validation functions
func (ss *SFAFService) isValidCoordinateFormat(coord string) bool {
	// Basic validation for coordinate format like "302521N0864150W"
	if len(coord) < 13 || len(coord) > 15 {
		return false
	}

	// Check for valid direction letters
	hasValidDir := strings.ContainsAny(coord, "NSEW")
	return hasValidDir
}

func (ss *SFAFService) isValidRadiusFormat(radius string) bool {
	if radius == "" {
		return true // Optional field
	}

	// Remove B or T suffix
	cleanRadius := strings.TrimRight(radius, "BTbt")
	_, err := strconv.ParseFloat(cleanRadius, 64)
	return err == nil
}

func (ss *SFAFService) GetSFAFByMarkerID(markerID string) (*models.SFAF, error) {
	log.Printf("🔍 Looking for SFAF data for marker: %s", markerID)

	// Use the storage method that already exists
	sfaf, err := ss.storage.GetSFAFByMarkerID(markerID)
	if err != nil {
		log.Printf("❌ Storage GetSFAFByMarkerID failed: %v", err)
		return nil, err
	}

	log.Printf("✅ Found SFAF with %d fields for marker %s", len(sfaf.Fields), markerID)
	return sfaf, nil // ✅ Return the full SFAF object
}

// Export SFAF data in various formats
func (ss *SFAFService) ExportSFAF(sfafID string, format models.SFAFExportFormat) ([]byte, error) {
	sfaf, err := ss.storage.GetSFAF(sfafID)
	if err != nil {
		return nil, err
	}

	switch format {
	case models.SFAFExportJSON:
		return ss.exportToJSON(sfaf)
	case models.SFAFExportCSV:
		return ss.exportToCSV(sfaf)
	case models.SFAFExportXML:
		return ss.exportToXML(sfaf)
	default:
		return nil, fmt.Errorf("unsupported export format: %s", format)
	}
}

// Export helper functions
func (ss *SFAFService) exportToJSON(sfaf *models.SFAF) ([]byte, error) {
	// Create structured export data
	exportData := map[string]interface{}{
		"sfaf_id":    sfaf.ID,
		"marker_id":  sfaf.MarkerID,
		"created_at": sfaf.CreatedAt,
		"updated_at": sfaf.UpdatedAt,
		"fields":     sfaf.Fields,
		"field_defs": ss.fieldDefs,
	}

	return []byte(fmt.Sprintf("%+v", exportData)), nil
}

func (ss *SFAFService) exportToCSV(sfaf *models.SFAF) ([]byte, error) {
	csv := "Field,Label,Value\n"
	for fieldID, value := range sfaf.Fields {
		if fieldDef, exists := ss.fieldDefs[fieldID]; exists {
			csv += fmt.Sprintf("%s,%s,%s\n", fieldID, fieldDef.Label, value)
		}
	}
	return []byte(csv), nil
}

func (ss *SFAFService) exportToXML(sfaf *models.SFAF) ([]byte, error) {
	xml := "<sfaf>\n"
	for fieldID, value := range sfaf.Fields {
		if fieldDef, exists := ss.fieldDefs[fieldID]; exists {
			xml += fmt.Sprintf("  <%s label=\"%s\">%s</%s>\n", fieldID, fieldDef.Label, value, fieldID)
		}
	}
	xml += "</sfaf>"
	return []byte(xml), nil
}

func (ss *SFAFService) DeleteSFAF(id string) error {
	return ss.storage.DeleteSFAF(id)
}

// Initialize complete SFAF field definitions based on MCEBPub7.csv
func (ss *SFAFService) initializeFieldDefinitions() {
	ss.fieldDefs = map[string]models.SFAFFormDefinition{
		// 100 Series - Agency Information
		"field100": {
			FieldNumber: "field100", Label: "Agency Code", Required: true, FieldType: "select",
			Options: []string{"DOD", "DHS", "DOJ", "NASA", "NOAA", "FAA", "FCC", "Other"},
			Help:    "Federal agency requesting frequency assignment",
		},
		"field101": {
			FieldNumber: "field101", Label: "Agency Serial Number", Required: true, FieldType: "text",
			Help: "Unique identifier assigned by requesting agency",
		},
		"field102": {
			FieldNumber: "field102", Label: "Date of Application", Required: true, FieldType: "date",
			Help: "Date application was submitted",
		},
		"field103": {
			FieldNumber: "field103", Label: "Expiration Date", Required: false, FieldType: "date",
			Help: "Requested expiration date for assignment",
		},
		"field104": {
			FieldNumber: "field104", Label: "Previous Assignment", Required: false, FieldType: "text",
			Help: "Reference to previous related assignment",
		},

		// 200 Series - System Information
		"field200": {
			FieldNumber: "field200", Label: "System Name", Required: true, FieldType: "text",
			Help: "Name or designation of the radio system",
		},
		"field201": {
			FieldNumber: "field201", Label: "System Type", Required: true, FieldType: "select",
			Options: []string{"Fixed", "Mobile", "Portable", "Aeronautical", "Maritime", "Satellite"},
			Help:    "Type of radio system",
		},
		"field202": {
			FieldNumber: "field202", Label: "Service Type", Required: true, FieldType: "select",
			Options: []string{"Government Fixed", "Government Mobile", "Radiolocation", "Radionavigation", "Satellite", "Broadcasting"},
			Help:    "ITU radio service classification",
		},
		"field203": {
			FieldNumber: "field203", Label: "Purpose", Required: true, FieldType: "textarea",
			Help: "Detailed description of system purpose and mission",
		},

		// 300 Series - Location Information
		"field300": {
			FieldNumber: "field300", Label: "State/Country", Required: true, FieldType: "select",
			Options: []string{"AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"},
			Help:    "State or country where transmitter is located",
		},
		"field301": {
			FieldNumber: "field301", Label: "Antenna Location", Required: true, FieldType: "text",
			Help: "Physical description of antenna location",
		},
		"field302": {
			FieldNumber: "field302", Label: "Site Name", Required: false, FieldType: "text",
			Help: "Name of the site or facility",
		},
		"field303": {
			FieldNumber: "field303", Label: "Antenna Coordinates", Required: true, FieldType: "text",
			Help: "Format: DDMMSSXDDDMMSSZ (e.g., 302521N0864150W)",
		},
		"field304": {
			FieldNumber: "field304", Label: "Ground Elevation (m)", Required: false, FieldType: "number",
			Help: "Antenna site elevation above mean sea level in meters",
		},
		"field305": {
			FieldNumber: "field305", Label: "Antenna Height AGL (m)", Required: false, FieldType: "number",
			Help: "Antenna height above ground level in meters",
		},
		"field306": {
			FieldNumber: "field306", Label: "Authorization Radius (km)", Required: false, FieldType: "text",
			Help: "Coordination radius in kilometers (append B for basic, T for tactical)",
		},
		"field307": {
			FieldNumber: "field307", Label: "Area of Operation", Required: false, FieldType: "textarea",
			Help: "Geographic description of operational area",
		},

		// 400 Series - Technical Parameters
		"field400": {
			FieldNumber: "field400", Label: "Frequency (MHz)", Required: true, FieldType: "number",
			Help: "Operating frequency in megahertz",
		},
		"field401": {
			FieldNumber: "field401", Label: "Alternate Frequency (MHz)", Required: false, FieldType: "number",
			Help: "Backup or alternate operating frequency",
		},
		"field402": {
			FieldNumber: "field402", Label: "Power (Watts)", Required: false, FieldType: "number",
			Help: "Transmitter power output in watts",
		},
		"field403": {
			FieldNumber: "field403", Label: "ERP (Watts)", Required: false, FieldType: "number",
			Help: "Effective radiated power in watts",
		},
		"field404": {
			FieldNumber: "field404", Label: "Emission Designator", Required: false, FieldType: "text",
			Help: "ITU emission designation (e.g., 16K0F3E)",
		},
		"field405": {
			FieldNumber: "field405", Label: "Bandwidth (kHz)", Required: false, FieldType: "number",
			Help: "Occupied bandwidth in kilohertz",
		},
		"field406": {
			FieldNumber: "field406", Label: "Modulation", Required: false, FieldType: "select",
			Options: []string{"AM", "FM", "PM", "DSB", "SSB", "CW", "FSK", "PSK", "QAM", "OFDM", "Digital"},
			Help:    "Type of modulation employed",
		},
		"field407": {
			FieldNumber: "field407", Label: "Tolerance (Hz)", Required: false, FieldType: "number",
			Help: "Frequency tolerance in hertz",
		},
		"field408": {
			FieldNumber: "field408", Label: "Stability", Required: false, FieldType: "text",
			Help: "Frequency stability specification",
		},
		"field409": {
			FieldNumber: "field409", Label: "Spurious Emissions", Required: false, FieldType: "text",
			Help: "Spurious emission compliance standard",
		},

		// 500 Series - Equipment Information
		"field500": {
			FieldNumber: "field500", Label: "Transmitter Make", Required: false, FieldType: "text",
			Help: "Manufacturer of transmitter equipment",
		},
		"field501": {
			FieldNumber: "field501", Label: "Transmitter Model", Required: false, FieldType: "text",
			Help: "Model number of transmitter",
		},
		"field502": {
			FieldNumber: "field502", Label: "Transmitter S/N", Required: false, FieldType: "text",
			Help: "Serial number of transmitter",
		},
		"field503": {
			FieldNumber: "field503", Label: "Receiver Make", Required: false, FieldType: "text",
			Help: "Manufacturer of receiver equipment",
		},
		"field504": {
			FieldNumber: "field504", Label: "Receiver Model", Required: false, FieldType: "text",
			Help: "Model number of receiver",
		},
		"field505": {
			FieldNumber: "field505", Label: "Receiver S/N", Required: false, FieldType: "text",
			Help: "Serial number of receiver",
		},
		"field506": {
			FieldNumber: "field506", Label: "Antenna Make/Model", Required: false, FieldType: "text",
			Help: "Antenna manufacturer and model number",
		},
		"field507": {
			FieldNumber: "field507", Label: "Antenna Type", Required: false, FieldType: "select",
			Options: []string{"Omnidirectional", "Directional", "Yagi", "Parabolic", "Helical", "Loop", "Whip", "Other"},
			Help:    "Type of antenna used",
		},
		"field508": {
			FieldNumber: "field508", Label: "Antenna Gain (dBi)", Required: false, FieldType: "number",
			Help: "Antenna gain in decibels relative to isotropic",
		},
		"field509": {
			FieldNumber: "field509", Label: "Antenna Pattern", Required: false, FieldType: "text",
			Help: "Antenna radiation pattern description",
		},
		"field510": {
			FieldNumber: "field510", Label: "Antenna Polarization", Required: false, FieldType: "select",
			Options: []string{"Horizontal", "Vertical", "Circular", "Elliptical"},
			Help:    "Antenna polarization type",
		},
		"field511": {
			FieldNumber: "field511", Label: "Feeder Loss (dB)", Required: false, FieldType: "number",
			Help: "Transmission line loss in decibels",
		},

		// 600 Series - Operational Information
		"field600": {
			FieldNumber: "field600", Label: "Hours of Operation", Required: false, FieldType: "text",
			Help: "Operating schedule (e.g., 24/7, 0800-1700 EST)",
		},
		"field601": {
			FieldNumber: "field601", Label: "Days of Operation", Required: false, FieldType: "text",
			Help: "Days when system operates (e.g., Mon-Fri, Daily)",
		},
		"field602": {
			FieldNumber: "field602", Label: "Months of Operation", Required: false, FieldType: "text",
			Help: "Seasonal operation months",
		},
		"field603": {
			FieldNumber: "field603", Label: "Number of Transmitters", Required: false, FieldType: "number",
			Help: "Total number of transmitters in system",
		},
		"field604": {
			FieldNumber: "field604", Label: "Number of Receivers", Required: false, FieldType: "number",
			Help: "Total number of receivers in system",
		},
		"field605": {
			FieldNumber: "field605", Label: "Traffic Volume", Required: false, FieldType: "text",
			Help: "Expected traffic volume or duty cycle",
		},
		"field606": {
			FieldNumber: "field606", Label: "Critical Infrastructure", Required: false, FieldType: "select",
			Options: []string{"Yes", "No"},
			Help:    "Is this system critical infrastructure?",
		},
		"field607": {
			FieldNumber: "field607", Label: "Emergency Communications", Required: false, FieldType: "select",
			Options: []string{"Yes", "No"},
			Help:    "Used for emergency communications?",
		},

		// 700 Series - Coordination Information
		"field700": {
			FieldNumber: "field700", Label: "Coordination Required", Required: false, FieldType: "select",
			Options: []string{"Yes", "No", "Unknown"},
			Help:    "Is frequency coordination required?",
		},
		"field701": {
			FieldNumber: "field701", Label: "Coordination Agency", Required: false, FieldType: "text",
			Help: "Agency responsible for coordination",
		},
		"field702": {
			FieldNumber: "field702", Label: "International Coordination", Required: false, FieldType: "select",
			Options: []string{"Yes", "No"},
			Help:    "International coordination required?",
		},
		"field703": {
			FieldNumber: "field703", Label: "Border Distance (km)", Required: false, FieldType: "number",
			Help: "Distance to nearest international border",
		},
		"field704": {
			FieldNumber: "field704", Label: "Satellite Coordination", Required: false, FieldType: "select",
			Options: []string{"Yes", "No"},
			Help:    "Satellite coordination required?",
		},

		// 800 Series - Administrative Information
		"field800": {
			FieldNumber: "field800", Label: "POC Name", Required: false, FieldType: "text",
			Help: "Primary point of contact name",
		},
		"field801": {
			FieldNumber: "field801", Label: "POC Title", Required: false, FieldType: "text",
			Help: "Point of contact title/position",
		},
		"field802": {
			FieldNumber: "field802", Label: "POC Phone", Required: false, FieldType: "text",
			Help: "Point of contact phone number",
		},
		"field803": {
			FieldNumber: "field803", Label: "POC Email", Required: false, FieldType: "email",
			Help: "Point of contact email address",
		},
		"field804": {
			FieldNumber: "field804", Label: "Organization", Required: false, FieldType: "text",
			Help: "Requesting organization or unit",
		},
		"field805": {
			FieldNumber: "field805", Label: "Address Line 1", Required: false, FieldType: "text",
			Help: "Organization address",
		},
		"field806": {
			FieldNumber: "field806", Label: "Address Line 2", Required: false, FieldType: "text",
			Help: "Additional address information",
		},
		"field807": {
			FieldNumber: "field807", Label: "City", Required: false, FieldType: "text",
			Help: "City",
		},
		"field808": {
			FieldNumber: "field808", Label: "State/Province", Required: false, FieldType: "text",
			Help: "State or province",
		},
		"field809": {
			FieldNumber: "field809", Label: "Postal Code", Required: false, FieldType: "text",
			Help: "ZIP or postal code",
		},

		// 900 Series - Comments and Special Requirements
		"field900": {
			FieldNumber: "field900", Label: "IRAC Notes", Required: false, FieldType: "textarea",
			Help: "Notes for IRAC review and coordination",
		},
		"field901": {
			FieldNumber: "field901", Label: "Technical Comments", Required: false, FieldType: "textarea",
			Help: "Technical notes and specifications",
		},
		"field902": {
			FieldNumber: "field902", Label: "Operational Comments", Required: false, FieldType: "textarea",
			Help: "Operational requirements and constraints",
		},
		"field903": {
			FieldNumber: "field903", Label: "Regulatory Comments", Required: false, FieldType: "textarea",
			Help: "Regulatory compliance notes",
		},
		"field904": {
			FieldNumber: "field904", Label: "General Comments", Required: false, FieldType: "textarea",
			Help: "Additional comments and information",
		},
	}
}
