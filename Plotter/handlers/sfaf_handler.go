// handlers/sfaf_handler.go
package handlers

import (
	"encoding/csv"
	"encoding/xml"
	"fmt"
	"net/http"
	"sfaf-plotter/models"
	"sfaf-plotter/services"
	"sfaf-plotter/utils"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SFAFHandler struct {
	sfafService     *services.SFAFService
	markerService   *services.MarkerService
	field530Service *services.Field530Service
}

func NewSFAFHandler(sfafService *services.SFAFService, markerService *services.MarkerService, field530Service *services.Field530Service) *SFAFHandler {
	return &SFAFHandler{
		sfafService:     sfafService,
		markerService:   markerService,
		field530Service: field530Service,
	}
}

// ===== CORE CRUD OPERATIONS =====

// CreateSFAF handles SFAF record creation with full validation (Source: handlers.txt)
func (sh *SFAFHandler) CreateSFAF(c *gin.Context) {
	var req models.CreateSFAFRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse("Invalid request format: "+err.Error()))
		return
	}

	// Validate required fields (Source: handlers.txt shows validation)
	if req.MarkerID == "" {
		c.JSON(http.StatusBadRequest, NewErrorResponse("marker_id is required"))
		return
	}

	// Verify marker exists (Source: main.txt shows marker integration)
	_, err := sh.markerService.GetMarker(req.MarkerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse("Invalid marker ID: "+err.Error()))
		return
	}

	// Create SFAF with validation (Source: services.txt shows CreateSFAF)
	sfaf, err := sh.sfafService.CreateSFAF(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, NewErrorResponse("Failed to create SFAF: "+err.Error()))
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "SFAF created successfully",
		"sfaf":    sfaf,
		"fields":  sfaf.ToFieldMap(), // (Source: models.txt)
	})
}

// CreateSFAFWithoutValidation handles rapid SFAF creation bypassing validation (Source: handlers.txt)
func (sh *SFAFHandler) CreateSFAFWithoutValidation(c *gin.Context) {
	var req models.CreateSFAFRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse("Invalid request format: "+err.Error()))
		return
	}

	// Create SFAF without validation (Source: services.txt)
	sfaf, err := sh.sfafService.CreateSFAFWithoutValidation(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, NewErrorResponse("Failed to create SFAF: "+err.Error()))
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "SFAF created successfully (no validation)",
		"sfaf":    sfaf,
		"fields":  sfaf.ToFieldMap(),
	})
}

// GetSFAF retrieves SFAF record by ID (Source: handlers.txt)
func (sh *SFAFHandler) GetSFAF(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, NewErrorResponse("SFAF ID is required"))
		return
	}

	// Use repository to get SFAF (Source: repositories.txt shows GetByID)
	sfaf, err := sh.sfafService.GetSFAFByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, NewErrorResponse("Failed to retrieve SFAF: "+err.Error()))
		return
	}

	if sfaf == nil {
		c.JSON(http.StatusNotFound, NewErrorResponse("SFAF not found"))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "SFAF retrieved successfully",
		"sfaf":    sfaf,
		"fields":  sfaf.ToFieldMap(),
	})
}

// GetSFAFByMarkerID retrieves SFAF record associated with a marker (Source: handlers.txt)
func (sh *SFAFHandler) GetSFAFByMarkerID(c *gin.Context) {
	markerID := c.Param("marker_id")
	if markerID == "" {
		c.JSON(http.StatusBadRequest, NewErrorResponse("Marker ID is required"))
		return
	}

	// Use repository to get SFAF by marker ID (Source: repositories.txt shows GetByMarkerID)
	sfaf, err := sh.sfafService.GetSFAFByMarkerID(markerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, NewErrorResponse("Failed to retrieve SFAF: "+err.Error()))
		return
	}

	if sfaf == nil {
		c.JSON(http.StatusNotFound, NewErrorResponse("No SFAF found for this marker"))
		return
	}

	fieldMap := sfaf.ToFieldMap()
	fmt.Printf("🔍 GetSFAFByMarkerID - Returning fields:\n")
	fmt.Printf("   Field102 in struct: '%s'\n", sfaf.Field102)
	fmt.Printf("   Field110 in struct: '%s'\n", sfaf.Field110)
	fmt.Printf("   Field200 in struct: '%s'\n", sfaf.Field200)
	fmt.Printf("   Field300 in struct: '%s'\n", sfaf.Field300)
	fmt.Printf("   ToFieldMap() returned %d fields\n", len(fieldMap))
	fmt.Printf("   Field102 in map: '%s'\n", fieldMap["field102"])
	fmt.Printf("   Field110 in map: '%s'\n", fieldMap["field110"])

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"message":     "SFAF retrieved successfully",
		"sfaf":        sfaf,
		"sfaf_fields": fieldMap,
	})
}

// GetAllSFAFs retrieves all SFAF records with pagination (Source: handlers.txt)
func (sh *SFAFHandler) GetAllSFAFs(c *gin.Context) {
	// Handle pagination parameters
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "50")

	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 1000 {
		limit = 50
	}

	offset := (page - 1) * limit

	// Get paginated results (Source: repositories.txt shows GetPaginated)
	sfafs, err := sh.sfafService.GetPaginated(offset, limit)
	if err != nil {
		fmt.Printf("❌ GetPaginated failed: %v\n", err)
		c.JSON(http.StatusInternalServerError, NewErrorResponse("Failed to retrieve SFAFs: "+err.Error()))
		return
	}

	// Get total count for pagination (Source: repositories.txt shows GetCount)
	total, err := sh.sfafService.GetCount()
	if err != nil {
		fmt.Printf("❌ GetCount failed: %v\n", err)
		c.JSON(http.StatusInternalServerError, NewErrorResponse("Failed to get total count: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "SFAFs retrieved successfully",
		"sfafs":   sfafs,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + limit - 1) / limit,
		},
	})
}

// GetPoolAssignments returns SFAF records that are pool assignments.
// Pool assignments lack geographic constraints: fields 306, 406, 530, and 531 are all empty.
// GET /api/sfaf/pool-assignments
func (sh *SFAFHandler) GetPoolAssignments(c *gin.Context) {
	all, err := sh.sfafService.GetAllSFAFs()
	if err != nil {
		c.JSON(http.StatusInternalServerError, NewErrorResponse("Failed to retrieve SFAF records: "+err.Error()))
		return
	}

	type PoolRecord struct {
		ID                  string  `json:"id"`
		Serial              string  `json:"serial"`
		FrequencyMHz        float64 `json:"frequency_mhz"`
		Field110            string  `json:"field110"`
		Field114            string  `json:"field114"`
		Field115            string  `json:"field115"`
		EmissionBandwidthKHz float64 `json:"emission_bandwidth_khz"`
		EmissionType        string  `json:"emission_type"`
		PowerWatts          float64 `json:"power_watts"`
		CoverageArea        string  `json:"coverage_area"`
	}

	pools := make([]PoolRecord, 0)
	for _, sfaf := range all {
		// Pool assignments have no geographic constraints
		if strings.TrimSpace(sfaf.Field306) != "" ||
			strings.TrimSpace(sfaf.Field406) != "" ||
			strings.TrimSpace(sfaf.Field530) != "" ||
			strings.TrimSpace(sfaf.Field531) != "" {
			continue
		}

		pa, err := models.NewPoolAssignment(*sfaf)
		if err != nil {
			// Record is a pool candidate but failed to parse — include with zero values
			pools = append(pools, PoolRecord{
				ID:           sfaf.ID.String(),
				Serial:       sfaf.Field102,
				Field110:     sfaf.Field110,
				Field114:     sfaf.Field114,
				Field115:     sfaf.Field115,
				CoverageArea: string(models.CoverageUSA),
			})
			continue
		}

		pools = append(pools, PoolRecord{
			ID:                   sfaf.ID.String(),
			Serial:               sfaf.Field102,
			FrequencyMHz:         pa.FrequencyMHz,
			Field110:             sfaf.Field110,
			Field114:             sfaf.Field114,
			Field115:             sfaf.Field115,
			EmissionBandwidthKHz: pa.EmissionBandwidth,
			EmissionType:         pa.EmissionType,
			PowerWatts:           pa.PowerWatts,
			CoverageArea:         string(pa.CoverageArea),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success":          true,
		"pool_assignments": pools,
		"count":            len(pools),
	})
}

// UpdateSFAF handles SFAF record updates (Source: handlers.txt)
func (sh *SFAFHandler) UpdateSFAF(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, NewErrorResponse("SFAF ID is required"))
		return
	}

	var req models.UpdateSFAFRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse("Invalid request format: "+err.Error()))
		return
	}

	// Update SFAF using repository (Source: repositories.txt shows Update method)
	sfaf, err := sh.sfafService.UpdateSFAF(id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, NewErrorResponse("Failed to update SFAF: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "SFAF updated successfully",
		"sfaf":    sfaf,
		"fields":  sfaf.ToFieldMap(),
	})
}

// DeleteSFAF handles SFAF record deletion (Source: handlers.txt)
func (sh *SFAFHandler) DeleteSFAF(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, NewErrorResponse("SFAF ID is required"))
		return
	}

	// Delete SFAF using repository (Source: repositories.txt shows Delete method)
	err := sh.sfafService.DeleteSFAF(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, NewErrorResponse("Failed to delete SFAF: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "SFAF deleted successfully",
	})
}

// DeleteAllSFAFs deletes all SFAF records from the database
func (sh *SFAFHandler) DeleteAllSFAFs(c *gin.Context) {
	// Delete all SFAFs
	count, err := sh.sfafService.DeleteAllSFAFs()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to delete all SFAFs: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"message":       "All SFAF records deleted successfully",
		"deleted_count": count,
	})
}

// ===== COMPREHENSIVE OBJECT DATA HANDLER =====

// GetObjectData provides comprehensive marker and SFAF data for display (Source: handlers.txt)
func (sh *SFAFHandler) GetObjectData(c *gin.Context) {
	markerID := c.Param("marker_id")
	if markerID == "" {
		c.JSON(http.StatusBadRequest, NewErrorResponse("Marker ID is required"))
		return
	}

	// Get marker information (Source: main.txt shows markerService integration)
	markerResponse, err := sh.markerService.GetMarker(markerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, NewErrorResponse("Failed to retrieve marker: "+err.Error()))
		return
	}

	if markerResponse.Marker == nil {
		c.JSON(http.StatusNotFound, NewErrorResponse("Marker not found"))
		return
	}

	marker := markerResponse.Marker

	// Get SFAF data — first try by marker_id, then fall back to serial (field102)
	sfaf, err := sh.sfafService.GetSFAFByMarkerID(markerID)
	if err != nil {
		fmt.Printf("⚠️ GetSFAFByMarkerID error for marker %s: %v\n", markerID, err)
		sfaf = nil
	}

	// Fallback: look up by marker serial if marker_id linkage is missing.
	// Only repair linkage if the SFAF has field303 coordinates — records
	// without coordinates are pool assignments and should stay unlinked.
	if sfaf == nil && marker.Serial != "" {
		candidate, serErr := sh.sfafService.GetSFAFBySerial(marker.Serial)
		if serErr != nil {
			fmt.Printf("⚠️ GetSFAFBySerial error for serial %s: %v\n", marker.Serial, serErr)
		} else if candidate != nil && candidate.Field303 != "" {
			sfaf = candidate
			_ = sh.sfafService.LinkSFAFToMarker(sfaf.ID.String(), markerID)
			fmt.Printf("🔧 Repaired marker_id linkage for serial %s\n", marker.Serial)
		}
	}

	// Get coordinate formats (Source: services.txt shows coordinate conversion)
	coordService := sh.sfafService.GetCoordinateService()
	coordinates := coordService.GetAllFormats(marker.Latitude, marker.Longitude)

	// Prepare response with complete object data
	response := gin.H{
		"success": true,
		"message": "Object data retrieved successfully",
		"marker":  marker,
		"coordinates": gin.H{
			"decimal": coordinates.Decimal,
			"dms":     coordinates.DMS,
			"compact": coordinates.Compact,
		},
		"sfaf_exists": sfaf != nil,
	}

	// Include SFAF data if it exists
	if sfaf != nil {
		fields := sfaf.ToFieldMap()
		response["sfaf"] = sfaf
		response["fields"] = fields
		fmt.Printf("🔍 GetObjectData returning %d fields for marker %s (SFAF exists)\n", len(fields), markerID)
	} else {
		// Auto-populate fields from marker data (Source: services.txt shows AutoPopulateFromMarker)
		autoFields := sh.sfafService.AutoPopulateFromMarker(marker)
		response["auto_populated_fields"] = autoFields
		fmt.Printf("🔍 GetObjectData returning %d auto-populated fields for marker %s (no SFAF)\n", len(autoFields), markerID)
	}

	c.JSON(http.StatusOK, response)
}

// ===== VALIDATION AND FIELD DEFINITIONS =====

// ValidateFields validates SFAF fields according to MC4EB Publication 7, Change 1 (Source: handlers.txt)
func (sh *SFAFHandler) ValidateFields(c *gin.Context) {
	var req struct {
		Fields map[string]string `json:"fields" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse("Invalid request format: "+err.Error()))
		return
	}

	// Validate fields using service (Source: services.txt shows ValidateFields)
	validation := sh.sfafService.ValidateFields(req.Fields)

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"message":    "Field validation completed",
		"validation": validation,
	})
}

// GetFieldDefinitions returns SFAF field definitions for form generation (Source: handlers.txt)
func (sh *SFAFHandler) GetFieldDefinitions(c *gin.Context) {
	// Get field definitions from service (Source: services.txt shows GetFieldDefinitions)
	definitions := sh.sfafService.GetFieldDefinitions()

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"message":     "Field definitions retrieved successfully",
		"definitions": definitions,
	})
}

// Error response helper
func NewErrorResponse(message string) gin.H {
	return gin.H{
		"success": false,
		"error":   message,
	}
}

// Success response helper
func NewSuccessResponse(message string, data interface{}) gin.H {
	return gin.H{
		"success": true,
		"message": message,
		"data":    data,
	}
}

// GetFieldDefinitionsByCategory organizes field definitions by category (Source: services.txt)
func (sh *SFAFHandler) GetFieldDefinitionsByCategory(c *gin.Context) {
	definitions := sh.sfafService.GetFieldDefinitions()

	// Organize by category (Source: services.txt shows category organization)
	categorized := map[string]map[string]models.SFAFFormDefinition{
		"agency":      make(map[string]models.SFAFFormDefinition),
		"system":      make(map[string]models.SFAFFormDefinition),
		"location":    make(map[string]models.SFAFFormDefinition),
		"technical":   make(map[string]models.SFAFFormDefinition),
		"equipment":   make(map[string]models.SFAFFormDefinition),
		"operational": make(map[string]models.SFAFFormDefinition),
		"admin":       make(map[string]models.SFAFFormDefinition),
		"comments":    make(map[string]models.SFAFFormDefinition),
	}

	// Categorize fields by their number ranges
	for fieldNum, def := range definitions {
		switch {
		case strings.HasPrefix(fieldNum, "field1"): // 100 series
			categorized["agency"][fieldNum] = def
		case strings.HasPrefix(fieldNum, "field2"): // 200 series
			categorized["system"][fieldNum] = def
		case strings.HasPrefix(fieldNum, "field3"): // 300 series
			categorized["location"][fieldNum] = def
		case strings.HasPrefix(fieldNum, "field4"): // 400 series
			categorized["technical"][fieldNum] = def
		case strings.HasPrefix(fieldNum, "field5"): // 500 series
			categorized["equipment"][fieldNum] = def
		case strings.HasPrefix(fieldNum, "field6") || strings.HasPrefix(fieldNum, "field7"): // 600-700 series
			categorized["operational"][fieldNum] = def
		case strings.HasPrefix(fieldNum, "field8"): // 800 series
			categorized["admin"][fieldNum] = def
		case strings.HasPrefix(fieldNum, "field9"): // 900+ series
			categorized["comments"][fieldNum] = def
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"message":    "Categorized field definitions retrieved successfully",
		"categories": categorized,
	})
}

// ===== IMPORT AND BULK OPERATIONS =====

// ImportSFAF handles bulk SFAF file imports (Source: handlers.txt)
func (sh *SFAFHandler) ImportSFAF(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "No file uploaded: " + err.Error(),
		})
		return
	}
	defer file.Close()

	// Import SFAF file using service (Source: services.txt shows import capabilities)
	fmt.Printf("\n🚀 Starting SFAF import for file: %s\n", header.Filename)
	results, err := sh.sfafService.ImportSFAFFile(file, header.Filename)
	if err != nil {
		fmt.Printf("❌ Import failed: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to import SFAF file: " + err.Error(),
		})
		return
	}

	fmt.Printf("✅ Import completed: %d total, %d successful, %d errors\n",
		results.TotalRecords, results.SuccessfulCount, results.ErrorCount)
	fmt.Printf("📋 Imported SFAF IDs: %v\n\n", results.ImportedIDs)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "SFAF file imported successfully",
		"results": results,
	})
}

// ===== EXPORT FUNCTIONALITY =====

// ExportSFAFs handles SFAF data export in various formats (Source: handlers.txt)
func (sh *SFAFHandler) ExportSFAFs(c *gin.Context) {
	// Get export format from query parameter
	format := c.DefaultQuery("format", "csv") // Default to CSV
	filterMarkerID := c.Query("marker_id")    // Optional filter by marker

	// Validate export format
	validFormats := []string{"csv", "json", "xml"}
	isValidFormat := false
	for _, validFormat := range validFormats {
		if format == validFormat {
			isValidFormat = true
			break
		}
	}

	if !isValidFormat {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid export format. Supported formats: csv, json, xml",
		})
		return
	}

	// Get SFAF records for export (Source: services.txt shows GetAllSFAFs)
	var sfafs []*models.SFAF
	var err error

	if filterMarkerID != "" {
		// Export single SFAF by marker ID (Source: repositories.txt shows GetByMarkerID)
		sfaf, err := sh.sfafService.GetSFAFByMarkerID(filterMarkerID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to retrieve SFAF for export: " + err.Error(),
			})
			return
		}
		if sfaf != nil {
			sfafs = []*models.SFAF{sfaf}
		}
	} else {
		// Export all SFAFs (Source: services.txt shows GetAllSFAFs)
		sfafs, err = sh.sfafService.GetAllSFAFs()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to retrieve SFAFs for export: " + err.Error(),
			})
			return
		}
	}

	// Generate filename with timestamp
	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("sfaf_export_%s.%s", timestamp, format)

	// Export based on format
	switch format {
	case "csv":
		sh.exportCSV(c, sfafs, filename)
	case "json":
		sh.exportJSON(c, sfafs, filename)
	case "xml":
		sh.exportXML(c, sfafs, filename)
	}
}

// exportCSV generates CSV export (Source: handlers.txt shows csv import)
func (sh *SFAFHandler) exportCSV(c *gin.Context, sfafs []*models.SFAF, filename string) {
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	// Write CSV header with key SFAF fields (Source: services.txt shows required fields)
	header := []string{
		"ID", "Marker_ID", "Created_At", "Updated_At",
		"Agency_Code", "Agency_Serial", "Application_Date", "System_Name",
		"System_Type", "Service_Type", "Purpose", "State_Country",
		"Antenna_Location", "Coordinates", "Frequency", "IRAC_Notes",
	}
	writer.Write(header)

	// Write SFAF data rows
	for _, sfaf := range sfafs {
		fieldMap := sfaf.ToFieldMap() // (Source: models.txt shows ToFieldMap)
		row := []string{
			sfaf.ID.String(),
			sfaf.MarkerID.String(),
			sfaf.CreatedAt.Format("2006-01-02 15:04:05"),
			sfaf.UpdatedAt.Format("2006-01-02 15:04:05"),
			fieldMap["field102"], // Agency Serial Number
			fieldMap["field200"], // Agency
			fieldMap["field201"], // Unified Command
			fieldMap["field202"], // Unified Command Service
			fieldMap["field203"], // Bureau
			fieldMap["field300"], // State/Country (Transmitter)
			fieldMap["field301"], // Antenna Location
			fieldMap["field303"], // Antenna Coordinates
			fieldMap["field110"], // Frequency(ies)
			fieldMap["field500"], // IRAC Notes (Source: handlers.txt shows MC4EB compliance)
		}
		writer.Write(row)
	}
}

// exportJSON generates JSON export
func (sh *SFAFHandler) exportJSON(c *gin.Context, sfafs []*models.SFAF, filename string) {
	c.Header("Content-Type", "application/json")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	// Create export structure with metadata (Source: handlers.txt shows comprehensive responses)
	exportData := gin.H{
		"export_metadata": gin.H{
			"export_date":     time.Now().Format("2006-01-02 15:04:05"),
			"record_count":    len(sfafs),
			"export_format":   "json",
			"mceb_compliance": "MC4EB Publication 7, Change 1", // (Source: handlers.txt shows MC4EB compliance)
		},
		"sfaf_records": sfafs,
	}

	c.JSON(http.StatusOK, exportData)
}

// exportXML generates XML export
func (sh *SFAFHandler) exportXML(c *gin.Context, sfafs []*models.SFAF, filename string) {
	c.Header("Content-Type", "application/xml")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	// Create XML export structure
	type XMLExport struct {
		XMLName        xml.Name       `xml:"sfaf_export"`
		ExportDate     string         `xml:"export_date,attr"`
		RecordCount    int            `xml:"record_count,attr"`
		MCEBCompliance string         `xml:"mceb_compliance,attr"`
		SFAFRecords    []*models.SFAF `xml:"sfaf_records>sfaf"`
	}

	xmlData := XMLExport{
		ExportDate:     time.Now().Format("2006-01-02 15:04:05"),
		RecordCount:    len(sfafs),
		MCEBCompliance: "MC4EB Publication 7, Change 1",
		SFAFRecords:    sfafs,
	}

	c.XML(http.StatusOK, xmlData)
}

// ===== STATISTICS AND ANALYTICS =====

// ===== HELPER METHODS FOR STATISTICS =====

// Helper function to get SFAF statistics by agency (field100 analysis)
func (sh *SFAFHandler) getSFAFStatsByAgency() (map[string]interface{}, error) {
	// Get all SFAF records for analysis
	sfafs, err := sh.sfafService.GetAllSFAFs()
	if err != nil {
		return nil, err
	}

	agencyCounts := make(map[string]int)
	agencyTypes := []string{"DOD", "DHS", "DOJ", "NASA", "NOAA", "FAA", "FCC", "Other"} // Source: services.txt shows agency options

	// Initialize counts
	for _, agency := range agencyTypes {
		agencyCounts[agency] = 0
	}

	// Count records by agency (Source: models.txt shows Field100 contains agency code)
	for _, sfaf := range sfafs {
		fieldMap := sfaf.ToFieldMap() // Source: models.txt shows ToFieldMap method
		if agency, exists := fieldMap["field100"]; exists && agency != "" {
			if _, validAgency := agencyCounts[agency]; validAgency {
				agencyCounts[agency]++
			} else {
				agencyCounts["Other"]++
			}
		} else {
			agencyCounts["Other"]++
		}
	}

	// Calculate agency distribution percentages
	totalRecords := len(sfafs)
	agencyPercentages := sh.calculatePercentages(agencyCounts, totalRecords)

	// Find top agencies by record count
	type agencyCount struct {
		Agency     string
		Count      int
		Percentage float64
	}

	var agencies []agencyCount
	for agency, count := range agencyCounts {
		agencies = append(agencies, agencyCount{
			Agency:     agency,
			Count:      count,
			Percentage: agencyPercentages[agency],
		})
	}

	// Sort by count (descending) (Source: handlers.txt shows sorting pattern)
	for i := 0; i < len(agencies)-1; i++ {
		for j := i + 1; j < len(agencies); j++ {
			if agencies[j].Count > agencies[i].Count {
				agencies[i], agencies[j] = agencies[j], agencies[i]
			}
		}
	}

	// Get top 5 agencies
	maxAgencies := 5
	if len(agencies) < maxAgencies {
		maxAgencies = len(agencies)
	}

	var topAgencies []map[string]interface{}
	for i := 0; i < maxAgencies; i++ {
		topAgencies = append(topAgencies, map[string]interface{}{
			"agency":     agencies[i].Agency,
			"count":      agencies[i].Count,
			"percentage": agencies[i].Percentage,
		})
	}

	// Calculate MC4EB Publication 7, Change 1 compliance by agency (Source: handlers.txt shows MC4EB compliance)
	agencyCompliance := make(map[string]map[string]interface{})

	// Required fields for MC4EB compliance (Source: services.txt shows required fields)
	// Note: field303 removed - optional for Pool Assignments
	requiredFields := []string{
		"field100", "field101", "field102", "field200", "field201",
		"field202", "field203", "field300", "field301", "field400",
	}

	for _, agency := range agencyTypes {
		compliantCount := 0
		totalAgencyRecords := agencyCounts[agency]

		if totalAgencyRecords > 0 {
			for _, sfaf := range sfafs {
				fieldMap := sfaf.ToFieldMap()
				if fieldAgency, exists := fieldMap["field100"]; exists && fieldAgency == agency {
					// Check compliance for this record
					isCompliant := true
					for _, requiredField := range requiredFields {
						if value, exists := fieldMap[requiredField]; !exists || value == "" {
							isCompliant = false
							break
						}
					}
					if isCompliant {
						compliantCount++
					}
				}
			}
		}

		complianceRate := float64(0)
		if totalAgencyRecords > 0 {
			complianceRate = float64(compliantCount) / float64(totalAgencyRecords) * 100
		}

		agencyCompliance[agency] = map[string]interface{}{
			"total_records":     totalAgencyRecords,
			"compliant_records": compliantCount,
			"compliance_rate":   complianceRate,
		}
	}

	return map[string]interface{}{
		"overview": gin.H{
			"total_agencies":       len(agencyTypes),
			"active_agencies":      sh.countActiveAgencies(agencyCounts),
			"total_records":        totalRecords,
			"largest_agency":       agencies[0].Agency,
			"largest_agency_count": agencies[0].Count,
		},
		"agency_distribution": gin.H{
			"counts":       agencyCounts,
			"percentages":  agencyPercentages,
			"top_agencies": topAgencies,
		},
		"mceb_compliance":    agencyCompliance,
		"detailed_breakdown": agencies,
	}, nil
}

// Helper function to count agencies with records
func (sh *SFAFHandler) countActiveAgencies(agencyCounts map[string]int) int {
	activeCount := 0
	for _, count := range agencyCounts {
		if count > 0 {
			activeCount++
		}
	}
	return activeCount
}

// Helper function to get SFAF statistics by frequency band (field400 analysis)
func (sh *SFAFHandler) getSFAFStatsByFrequencyBand() (map[string]interface{}, error) {
	sfafs, err := sh.sfafService.GetAllSFAFs()
	if err != nil {
		return nil, err
	}

	// Define frequency bands for military spectrum coordination (Source: services.txt shows technical parameters)
	bandCounts := map[string]int{
		"VLF (3-30 kHz)":     0,
		"LF (30-300 kHz)":    0,
		"MF (300-3000 kHz)":  0,
		"HF (3-30 MHz)":      0,
		"VHF (30-300 MHz)":   0,
		"UHF (300-3000 MHz)": 0,
		"SHF (3-30 GHz)":     0,
		"EHF (30-300 GHz)":   0,
		"Other":              0,
		"Not Specified":      0,
	}

	// Analyze frequency distribution (Source: models.txt shows Field400 contains frequency)
	for _, sfaf := range sfafs {
		fieldMap := sfaf.ToFieldMap()
		if freqStr, exists := fieldMap["field400"]; exists && freqStr != "" {
			if freq, err := strconv.ParseFloat(freqStr, 64); err == nil {
				switch {
				case freq >= 0.003 && freq < 0.03: // kHz converted to MHz
					bandCounts["VLF (3-30 kHz)"]++
				case freq >= 0.03 && freq < 0.3:
					bandCounts["LF (30-300 kHz)"]++
				case freq >= 0.3 && freq < 3:
					bandCounts["MF (300-3000 kHz)"]++
				case freq >= 3 && freq < 30:
					bandCounts["HF (3-30 MHz)"]++
				case freq >= 30 && freq < 300:
					bandCounts["VHF (30-300 MHz)"]++
				case freq >= 300 && freq < 3000:
					bandCounts["UHF (300-3000 MHz)"]++
				case freq >= 3000 && freq < 30000:
					bandCounts["SHF (3-30 GHz)"]++
				case freq >= 30000 && freq < 300000:
					bandCounts["EHF (30-300 GHz)"]++
				default:
					bandCounts["Other"]++
				}
			} else {
				bandCounts["Other"]++
			}
		} else {
			bandCounts["Not Specified"]++
		}
	}

	// Calculate most and least used bands
	type bandUsage struct {
		Band       string
		Count      int
		Percentage float64
	}

	var bandUsages []bandUsage
	totalRecords := len(sfafs)

	for band, count := range bandCounts {
		percentage := float64(0)
		if totalRecords > 0 {
			percentage = float64(count) / float64(totalRecords) * 100
		}
		bandUsages = append(bandUsages, bandUsage{
			Band:       band,
			Count:      count,
			Percentage: percentage,
		})
	}

	// Sort by usage (descending)
	for i := 0; i < len(bandUsages)-1; i++ {
		for j := i + 1; j < len(bandUsages); j++ {
			if bandUsages[j].Count > bandUsages[i].Count {
				bandUsages[i], bandUsages[j] = bandUsages[j], bandUsages[i]
			}
		}
	}

	return map[string]interface{}{
		"frequency_bands": bandCounts,
		"percentages":     sh.calculatePercentages(bandCounts, totalRecords),
		"band_usage":      bandUsages,
		"most_used_band":  bandUsages[0].Band,
		"least_used_band": bandUsages[len(bandUsages)-1].Band,
		"total_records":   totalRecords,
	}, nil
}

// Helper function to get SFAF statistics by system type (field201 analysis)
func (sh *SFAFHandler) getSFAFStatsBySystemType() (map[string]interface{}, error) {
	sfafs, err := sh.sfafService.GetAllSFAFs()
	if err != nil {
		return nil, err
	}

	// System types from MC4EB Publication 7, Change 1 (Source: services.txt shows system categories)
	systemTypes := []string{"Fixed", "Mobile", "Portable", "Aeronautical", "Maritime", "Satellite"}
	systemCounts := make(map[string]int)

	// Initialize counts
	for _, sysType := range systemTypes {
		systemCounts[sysType] = 0
	}
	systemCounts["Other"] = 0
	systemCounts["Not Specified"] = 0

	// Count records by system type (Source: models.txt shows Field201 contains system type)
	for _, sfaf := range sfafs {
		fieldMap := sfaf.ToFieldMap()
		if sysType, exists := fieldMap["field201"]; exists && sysType != "" {
			if _, validType := systemCounts[sysType]; validType {
				systemCounts[sysType]++
			} else {
				systemCounts["Other"]++
			}
		} else {
			systemCounts["Not Specified"]++
		}
	}

	return map[string]interface{}{
		"system_types":  systemCounts,
		"percentages":   sh.calculatePercentages(systemCounts, len(sfafs)), // (Source: handlers.txt shows calculatePercentages method)
		"total_types":   len(systemTypes),
		"total_records": len(sfafs),
	}, nil
}

func (sh *SFAFHandler) countRecordsAboveThreshold(scores []float64, threshold float64) int {
	count := 0
	for _, score := range scores {
		if score >= threshold {
			count++
		}
	}
	return count
}

func (sh *SFAFHandler) getSFAFStatsByLocation() (map[string]interface{}, error) {
	sfafs, err := sh.sfafService.GetAllSFAFs()
	if err != nil {
		return nil, err
	}

	stateCounts := make(map[string]int)
	var topStates []map[string]interface{}

	// Count records by state (Source: models.txt shows Field300 contains state/country)
	for _, sfaf := range sfafs {
		fieldMap := sfaf.ToFieldMap()
		if state, exists := fieldMap["field300"]; exists && state != "" {
			stateCounts[state]++
		} else {
			stateCounts["Not Specified"]++
		}
	}

	// Get top 10 states by record count
	type stateCount struct {
		State string
		Count int
	}
	var states []stateCount
	for state, count := range stateCounts {
		states = append(states, stateCount{State: state, Count: count})
	}

	// Sort by count (descending)
	for i := 0; i < len(states)-1; i++ {
		for j := i + 1; j < len(states); j++ {
			if states[j].Count > states[i].Count {
				states[i], states[j] = states[j], states[i]
			}
		}
	}

	// Get top 10
	maxStates := 10
	if len(states) < maxStates {
		maxStates = len(states)
	}

	for i := 0; i < maxStates; i++ {
		topStates = append(topStates, map[string]interface{}{
			"state":      states[i].State,
			"count":      states[i].Count,
			"percentage": float64(states[i].Count) / float64(len(sfafs)) * 100,
		})
	}

	return map[string]interface{}{
		"total_states": len(stateCounts),
		"top_states":   topStates,
		"all_counts":   stateCounts,
	}, nil
}

func (sh *SFAFHandler) getSFAFIRACNotesStats() (map[string]interface{}, error) {
	sfafs, err := sh.sfafService.GetAllSFAFs()
	if err != nil {
		return nil, err
	}

	field500Count := 0 // IRAC Note references (max 10 per MC4EB Pub 7 CHG 1)
	field501Count := 0 // IRAC Note codes (max 30 per MC4EB Pub 7 CHG 1)
	recordsWithIRAC := 0

	// Analyze IRAC Notes usage (Source: handlers.txt shows field 500/501 limits)
	for _, sfaf := range sfafs {
		fieldMap := sfaf.ToFieldMap()
		hasIRAC := false

		if field500, exists := fieldMap["field500"]; exists && field500 != "" {
			field500Count++
			hasIRAC = true
		}

		if field501, exists := fieldMap["field501"]; exists && field501 != "" {
			field501Count++
			hasIRAC = true
		}

		if hasIRAC {
			recordsWithIRAC++
		}
	}

	totalRecords := len(sfafs)
	iracUsagePercent := float64(recordsWithIRAC) / float64(totalRecords) * 100

	return map[string]interface{}{
		"field_500_usage":         field500Count,
		"field_501_usage":         field501Count,
		"records_with_irac_notes": recordsWithIRAC,
		"total_records":           totalRecords,
		"irac_usage_percentage":   iracUsagePercent,
		"mceb_compliance": gin.H{
			"field_500_limit": 10, // Source: handlers.txt
			"field_501_limit": 30, // Source: handlers.txt
			"publication":     "MC4EB Publication 7, Change 1",
		},
	}, nil
}

func (sh *SFAFHandler) getSFAFRecentActivity() (map[string]interface{}, error) {
	now := time.Now()
	thirtyDaysAgo := now.AddDate(0, 0, -30)
	sevenDaysAgo := now.AddDate(0, 0, -7)

	sfafs, err := sh.sfafService.GetAllSFAFs()
	if err != nil {
		return nil, err
	}

	recentCreated := 0
	recentUpdated := 0
	weeklyCreated := 0
	weeklyUpdated := 0

	// Analyze recent activity (Source: models.txt shows CreatedAt/UpdatedAt timestamps)
	for _, sfaf := range sfafs {
		if sfaf.CreatedAt.After(thirtyDaysAgo) {
			recentCreated++
			if sfaf.CreatedAt.After(sevenDaysAgo) {
				weeklyCreated++
			}
		}

		if sfaf.UpdatedAt.After(thirtyDaysAgo) && !sfaf.UpdatedAt.Equal(sfaf.CreatedAt) {
			recentUpdated++
			if sfaf.UpdatedAt.After(sevenDaysAgo) {
				weeklyUpdated++
			}
		}
	}

	return map[string]interface{}{
		"last_30_days": gin.H{
			"created": recentCreated,
			"updated": recentUpdated,
		},
		"last_7_days": gin.H{
			"created": weeklyCreated,
			"updated": weeklyUpdated,
		},
		"activity_rate": gin.H{
			"monthly_creation_rate": float64(recentCreated) / 30.0,
			"weekly_creation_rate":  float64(weeklyCreated) / 7.0,
		},
	}, nil
}

func (sh *SFAFHandler) GetSFAFWithCategories(c *gin.Context) {
	id := c.Param("id")

	sfaf, err := sh.sfafService.GetSFAFByID(id)
	if err != nil || sfaf == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "SFAF not found",
		})
		return
	}

	// Use response serializer (Source: response_serializer.txt)
	response := utils.SerializeSFAFResponseWithCategories(sfaf)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// Helper function to get field completion statistics
func (sh *SFAFHandler) getSFAFFieldCompletionStats() (map[string]interface{}, error) {
	sfafs, err := sh.sfafService.GetAllSFAFs()
	if err != nil {
		return nil, err
	}

	if len(sfafs) == 0 {
		return map[string]interface{}{
			"average_completion": 0,
			"field_usage":        map[string]int{},
		}, nil
	}

	// Critical fields for completion (Source: services.txt shows required fields)
	// Note: field303 removed - optional for Pool Assignments
	criticalFields := []string{
		"field100", // Agency Code - Required (Source: services.txt)
		"field101", // Agency Code - Required (Source: services.txt)
		"field102", // Agency Serial Number - Required (Source: MC4EB Pub 7 CHG 1)
		"field200", // Agency - Required (Source: MC4EB Pub 7 CHG 1)
		"field201", // Unified Command - Required (Source: MC4EB Pub 7 CHG 1)
		"field202", // Unified Command Service - Required (Source: MC4EB Pub 7 CHG 1)
		"field203", // Bureau - Required (Source: MC4EB Pub 7 CHG 1)
		"field300", // State/Country - Required (Source: MC4EB Pub 7 CHG 1)
		"field301", // Antenna Location - Required (Source: MC4EB Pub 7 CHG 1)
		"field110", // Frequency(ies) - Required (Source: MC4EB Pub 7 CHG 1)
	}

	// All monitored fields for usage statistics
	monitoredFields := map[string]string{
		// 100 Series - Agency Information (Source: services.txt)
		"field100": "Agency Code",
		"field101": "Agency Code",
		"field102": "Agency Serial Number",
		"field103": "Expiration Date",
		"field104": "Previous Assignment",

		// 200 Series - Organizational Information (Source: MC4EB Pub 7 CHG 1)
		"field200": "Agency",
		"field201": "Unified Command",
		"field202": "Unified Command Service",
		"field203": "Bureau",

		// 300 Series - Location Information (Source: services.txt)
		"field300": "State/Country",
		"field301": "Antenna Location",
		"field302": "Site Name",
		"field303": "Antenna Coordinates",
		"field304": "Ground Elevation",
		"field306": "Authorization Radius",

		// 400+ Series - Technical Parameters (Source: table_info.txt)
		"field315": "Technical Measurements",
		"field316": "Count Parameters",
		"field317": "Technical Counts",
		"field318": "Technical Codes",
		"field319": "Performance Values",
		"field321": "Extended Precision",

		// 500 Series - Equipment Information (Source: table_info.txt)
		"field500": "Transmitter Make",  // IRAC Note references (Source: handlers.txt shows MC4EB compliance)
		"field501": "Transmitter Model", // IRAC Note codes (Source: handlers.txt shows MC4EB compliance)
		"field502": "Transmitter S/N",
		"field503": "Receiver Make",
		"field504": "Receiver Model",
		"field506": "Antenna Make/Model",
		"field511": "Feeder Loss (dB)",
		"field512": "Additional Contacts",
		"field513": "Agency Contacts",
		"field520": "Extended Purpose",
		"field521": "Reference Codes",
		"field530": "Classification",
		"field531": "Security Information",

		// 700 Series - Coordination Information (Source: table_info.txt)
		"field701": "Coordination Agency",
		"field702": "International Coordination",
		"field704": "Satellite Coordination",
		"field707": "Timing Information",
		"field710": "Operational Notes",
		"field711": "Service Codes",
		"field716": "Status Flags",

		// 800 Series - Administrative Information (Source: table_info.txt)
		"field801": "POC Title",
		"field803": "POC Email",
		"field804": "Organization",
		"field805": "Address Date", // DATE field
		"field806": "Address Line 2",

		// 900 Series - Comments and Special Requirements (Source: table_info.txt)
		"field901": "Technical Comments",
		"field903": "Regulatory Comments",
		"field904": "General Comments", // DATE field
		"field905": "Processing Identifiers",
		"field906": "Extended Processing Data",
		"field907": "Processing Status",
		"field910": "Administrative Codes",
		"field911": "Administrative Dates", // DATE field
		"field924": "Classification Codes",
		"field926": "High Precision Measurements", // NUMERIC(12,3)
		"field927": "Processing Dates",            // DATE field
		"field928": "Completion Dates",            // DATE field

		// 950+ Series - Final Processing (Source: table_info.txt)
		"field952": "Final Status",
		"field953": "Completion Codes",
		"field956": "Reference Numbers",
		"field957": "Processing Counts", // INTEGER
		"field958": "Completion Flags",
		"field959": "Final Notes",
		"field963": "Archive Information",
		"field964": "Archive Parameters", // INTEGER
		"field965": "Archive Counts",     // INTEGER

		// 980+ Series - System Information (Source: table_info.txt)
		"field982": "System Codes",
		"field983": "System Identifiers",
		"field984": "Archive Codes",
		"field985": "Archive Flags",
		"field986": "System Parameters",
		"field987": "Configuration Codes",
		"field988": "System Types",
		"field989": "Extended System Data",
		"field990": "Status Codes",
		"field991": "Processing Codes",
		"field992": "Archive Status",
		"field993": "Reference Codes",
		"field994": "Final Flags",
		"field995": "Final Parameters",
		"field996": "Completion Codes",
		"field997": "Final Identifiers",
		"field998": "End Status",
		"field999": "Final Notes",
	}

	// Field usage counters
	fieldUsage := make(map[string]int)
	criticalFieldUsage := make(map[string]int)

	// Initialize counters - FIX: Use only fieldNum, ignore fieldLabel
	for fieldNum := range monitoredFields {
		fieldUsage[fieldNum] = 0
	}
	for _, criticalField := range criticalFields {
		criticalFieldUsage[criticalField] = 0
	}

	// Completion score tracking
	var totalCompletionScores []float64
	criticalFieldsCount := len(criticalFields)
	monitoredFieldsCount := len(monitoredFields)

	// Analyze field completion for each SFAF record (Source: models.txt shows ToFieldMap method)
	for _, sfaf := range sfafs {
		fieldMap := sfaf.ToFieldMap() // Convert to map for analysis (Source: models.txt)

		// Count field usage - FIX: Use only fieldNum, ignore fieldLabel
		filledFields := 0
		criticalFieldsFilled := 0

		for fieldNum := range monitoredFields {
			if value, exists := fieldMap[fieldNum]; exists && value != "" {
				fieldUsage[fieldNum]++
				filledFields++
			}
		}

		// Count critical field completion
		for _, criticalField := range criticalFields {
			if value, exists := fieldMap[criticalField]; exists && value != "" {
				criticalFieldUsage[criticalField]++
				criticalFieldsFilled++
			}
		}

		// Calculate completion percentage for this record
		overallCompletion := float64(filledFields) / float64(monitoredFieldsCount) * 100
		totalCompletionScores = append(totalCompletionScores, overallCompletion)
	}

	// Calculate average completion percentage
	var totalCompletion float64
	for _, score := range totalCompletionScores {
		totalCompletion += score
	}
	averageCompletion := totalCompletion / float64(len(totalCompletionScores))

	// Calculate critical field completion rate
	var totalCriticalCompletion float64
	for _, count := range criticalFieldUsage {
		totalCriticalCompletion += float64(count)
	}
	criticalCompletionRate := (totalCriticalCompletion / (float64(criticalFieldsCount) * float64(len(sfafs)))) * 100

	// Find most and least used fields - FIX: Create usage stats with both fieldNum and fieldLabel
	type fieldUsageStat struct {
		FieldNumber string
		FieldLabel  string
		Count       int
		Percentage  float64
	}

	var usageStats []fieldUsageStat
	for fieldNum, count := range fieldUsage {
		percentage := float64(count) / float64(len(sfafs)) * 100
		usageStats = append(usageStats, fieldUsageStat{
			FieldNumber: fieldNum,
			FieldLabel:  monitoredFields[fieldNum], // NOW we use the fieldLabel from the map
			Count:       count,
			Percentage:  percentage,
		})
	}

	// Sort usage statistics by percentage (descending)
	for i := 0; i < len(usageStats)-1; i++ {
		for j := i + 1; j < len(usageStats); j++ {
			if usageStats[j].Percentage > usageStats[i].Percentage {
				usageStats[i], usageStats[j] = usageStats[j], usageStats[i]
			}
		}
	}

	// Get top 10 most used and bottom 10 least used fields
	mostUsedCount := 10
	if len(usageStats) < mostUsedCount {
		mostUsedCount = len(usageStats)
	}

	var mostUsed []fieldUsageStat
	var leastUsed []fieldUsageStat

	for i := 0; i < mostUsedCount; i++ {
		mostUsed = append(mostUsed, usageStats[i])
	}

	// Get least used (from the end of sorted array)
	startIndex := len(usageStats) - mostUsedCount
	if startIndex < 0 {
		startIndex = 0
	}
	for i := len(usageStats) - 1; i >= startIndex; i-- {
		leastUsed = append(leastUsed, usageStats[i])
	}

	// MC4EB Publication 7, Change 1 compliance analysis (Source: handlers.txt shows MC4EB compliance)
	mcebCompliance := map[string]interface{}{
		"field_500_usage":     fieldUsage["field500"], // IRAC Note references
		"field_501_usage":     fieldUsage["field501"], // IRAC Note codes
		"field_500_max_limit": 10,                     // Source: handlers.txt
		"field_501_max_limit": 30,                     // Source: handlers.txt
		"compliance_standard": "MC4EB Publication 7, Change 1",
		"critical_fields_completion": gin.H{
			"total_critical_fields":    len(criticalFields),
			"avg_critical_completion":  criticalCompletionRate,
			"critical_field_breakdown": criticalFieldUsage,
		},
	}

	return map[string]interface{}{
		"overview": gin.H{
			"total_records":              len(sfafs),
			"average_completion_percent": averageCompletion,
			"critical_completion_rate":   criticalCompletionRate,
			"monitored_fields_count":     monitoredFieldsCount,
			"critical_fields_count":      criticalFieldsCount,
		},
		"field_usage_summary": gin.H{
			"most_used_fields":  mostUsed,
			"least_used_fields": leastUsed,
			"total_field_fills": fieldUsage,
		},
		"critical_fields": gin.H{
			"required_fields":   criticalFields,
			"completion_counts": criticalFieldUsage,
			"completion_rate":   criticalCompletionRate,
		},
		"completion_distribution": gin.H{
			"scores":              totalCompletionScores,
			"average":             averageCompletion,
			"records_above_50pct": sh.countRecordsAboveThreshold(totalCompletionScores, 50.0),
			"records_above_75pct": sh.countRecordsAboveThreshold(totalCompletionScores, 75.0),
			"records_above_90pct": sh.countRecordsAboveThreshold(totalCompletionScores, 90.0),
			"fully_complete":      sh.countRecordsAboveThreshold(totalCompletionScores, 100.0),
		},
		"mceb_compliance": mcebCompliance,
	}, nil
}

// ===== COMPLETE CALCULATEPERCENTAGES METHOD =====

// Helper function to calculate percentages (Source: handlers.txt)
func (sh *SFAFHandler) calculatePercentages(counts map[string]int, total int) map[string]float64 {
	percentages := make(map[string]float64)
	for key, count := range counts {
		if total > 0 {
			percentages[key] = float64(count) / float64(total) * 100
		} else {
			percentages[key] = 0
		}
	}
	return percentages
}

func (sh *SFAFHandler) ExportAllSFAF(c *gin.Context) {
	format := c.Query("format")
	if format == "" {
		format = "sfaf" // Default to SFAF format
	}

	// Get ALL SFAF records including Pool Assignments (marker_id can be NULL)
	sfafRecords, err := sh.sfafService.GetAllSFAFs()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve SFAF data: " + err.Error(),
		})
		return
	}

	switch format {
	case "sfaf":
		// ✅ FIXED: Use correctly typed variable (sfafRecords instead of sfafs)
		content := sh.generateSFAFContent(sfafRecords)
		filename := fmt.Sprintf("SFAF_Export_%s.txt", time.Now().Format("20060102"))

		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
		c.Header("Content-Type", "text/plain")
		c.String(http.StatusOK, content)

	case "json":
		c.JSON(http.StatusOK, gin.H{
			"success":      true,
			"export_type":  "json",
			"exported_at":  time.Now().Format(time.RFC3339),
			"total_count":  len(sfafRecords),
			"sfaf_records": sfafRecords,
		})

	case "csv":
		csvContent := sh.generateCSVContent(sfafRecords)
		filename := fmt.Sprintf("SFAF_Export_%s.csv", time.Now().Format("20060102"))

		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
		c.Header("Content-Type", "text/csv")
		c.String(http.StatusOK, csvContent)

	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Unsupported export format. Use: sfaf, json, or csv",
		})
	}
}

func (sh *SFAFHandler) ExportSingleSFAF(c *gin.Context) {
	markerID := c.Param("marker_id")
	format := c.Query("format")
	if format == "" {
		format = "sfaf"
	}

	// ✅ FIXED: Use correct variable name and type
	sfaf, err := sh.sfafService.GetSFAFByMarkerID(markerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "SFAF record not found for marker: " + markerID,
		})
		return
	}

	if sfaf == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "No SFAF record found for marker: " + markerID,
		})
		return
	}

	switch format {
	case "sfaf":
		// ✅ FIXED: Pass array of single SFAF record
		content := sh.generateSingleSFAFContent([]*models.SFAF{sfaf})

		// ✅ FIXED: Get marker information for filename
		var serial string = "unknown"
		if markerResp, err := sh.markerService.GetMarker(sfaf.MarkerID.String()); err == nil && markerResp.Marker != nil {
			serial = markerResp.Marker.Serial
		}

		filename := fmt.Sprintf("SFAF_%s_%s.txt", serial, time.Now().Format("20060102"))

		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
		c.Header("Content-Type", "text/plain")
		c.String(http.StatusOK, content)

	case "json":
		c.JSON(http.StatusOK, gin.H{
			"success":     true,
			"export_type": "json",
			"exported_at": time.Now().Format(time.RFC3339),
			"sfaf_record": sfaf, // ✅ FIXED: Use correct variable
		})

	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Unsupported export format. Use: sfaf or json",
		})
	}
}

// ExportSelectedSFAFs exports multiple selected SFAF records in specified format
// POST /api/sfaf/export-selected
func (sh *SFAFHandler) ExportSelectedSFAFs(c *gin.Context) {
	var req struct {
		IDs    []string `json:"ids" binding:"required"`
		Format string   `json:"format"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request: " + err.Error(),
		})
		return
	}

	if len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "No record IDs provided",
		})
		return
	}

	format := req.Format
	if format == "" {
		format = "csv" // Default to CSV
	}

	// Fetch selected SFAF records
	var sfafs []*models.SFAF
	for _, id := range req.IDs {
		sfaf, err := sh.sfafService.GetSFAFByID(id)
		if err != nil {
			continue // Skip records that can't be found
		}
		if sfaf != nil {
			sfafs = append(sfafs, sfaf)
		}
	}

	if len(sfafs) == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "No valid records found for export",
		})
		return
	}

	// Generate export based on format
	switch format {
	case "csv":
		csvContent := sh.generateCSVContent(sfafs)
		filename := fmt.Sprintf("SFAF_Selected_%s.csv", time.Now().Format("20060102"))

		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
		c.Header("Content-Type", "text/csv")
		c.String(http.StatusOK, csvContent)

	case "json":
		c.JSON(http.StatusOK, gin.H{
			"success":      true,
			"export_type":  "json",
			"exported_at":  time.Now().Format(time.RFC3339),
			"total_count":  len(sfafs),
			"sfaf_records": sfafs,
		})

	case "sfaf":
		content := sh.generateSFAFContent(sfafs)
		filename := fmt.Sprintf("SFAF_Selected_%s.txt", time.Now().Format("20060102"))

		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
		c.Header("Content-Type", "text/plain")
		c.String(http.StatusOK, content)

	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Unsupported export format. Use: csv, json, or sfaf",
		})
	}
}

// Helper method to generate SFAF format content (Source: sfaf_example.txt format)
func (sh *SFAFHandler) generateSingleSFAFContent(sfafs []*models.SFAF) string {
	var content strings.Builder

	if len(sfafs) == 0 {
		return ""
	}

	record := sfafs[0] // Get first record

	// Generate SFAF fields in proper order (Source: sfaf_example.txt)
	sfafFields := []string{
		"005", "010", "102", "103", "107", "110", "113", "114", "115", "116",
		"130", "142", "143", "144", "200", "201", "202", "204", "205", "206",
		"207", "209", "300", "301", "303", "306", "340", "343", "357", "362",
		"363", "373", "400", "401", "403", "440", "443", "457", "462", "463",
		"473", "500", "501", "502", "503", "511", "512", "520", "701", "702",
		"716", "801", "803",
	}

	for _, fieldNum := range sfafFields {
		fieldValue := sh.getFieldValue(record, fieldNum) // ✅ FIXED: Use record variable
		if fieldValue != "" {
			content.WriteString(fmt.Sprintf("%s.     %s\n", fieldNum, fieldValue))
		}

		// Handle numbered variants (e.g., 500/02, 500/03)
		for i := 2; i <= 10; i++ {
			variantField := fmt.Sprintf("%s/%02d", fieldNum, i)
			variantValue := sh.getFieldValue(record, variantField) // ✅ FIXED: Use record variable
			if variantValue != "" {
				content.WriteString(fmt.Sprintf("%s.     %s\n", variantField, variantValue))
			}
		}
	}

	return content.String()
}

func (sh *SFAFHandler) generateCSVContent(sfafRecords []*models.SFAF) string {
	var content strings.Builder

	// CSV header
	content.WriteString("ID,MarkerID,Serial,Frequency,Location,Coordinates,Agency,Equipment,Notes\n")

	for _, record := range sfafRecords {
		fieldMap := record.ToFieldMap()

		// Handle nullable MarkerID
		markerIDStr := ""
		if record.MarkerID != nil {
			markerIDStr = record.MarkerID.String()
		}

		// Escape CSV values to handle commas, quotes, and newlines
		content.WriteString(fmt.Sprintf("%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
			sh.escapeCSV(record.ID.String()),
			sh.escapeCSV(markerIDStr),
			sh.escapeCSV(fieldMap["field102"]),  // Serial
			sh.escapeCSV(fieldMap["field110"]),  // Frequency
			sh.escapeCSV(fieldMap["field301"]),  // Location
			sh.escapeCSV(fieldMap["field303"]),  // Coordinates
			sh.escapeCSV(fieldMap["field100"]),  // Agency
			sh.escapeCSV(fieldMap["field340"]),  // Equipment
			sh.escapeCSV(fieldMap["field901"]))) // Notes
	}

	return content.String()
}

// escapeCSV escapes a string for CSV format
func (sh *SFAFHandler) escapeCSV(value string) string {
	// If value contains comma, quote, or newline, wrap in quotes and escape quotes
	if strings.ContainsAny(value, ",\"\n\r") {
		return `"` + strings.ReplaceAll(value, `"`, `""`) + `"`
	}
	return value
}

func (sh *SFAFHandler) getFieldValue(sfaf *models.SFAF, fieldName string) string {
	fieldMap := sfaf.ToFieldMap()
	if value, exists := fieldMap["field"+fieldName]; exists {
		return value
	}
	return ""
}

func (sh *SFAFHandler) generateSFAFContent(sfafs []*models.SFAF) string {
	var content strings.Builder

	// Header for SFAF export
	content.WriteString("SFAF Export - MC4EB Publication 7, Change 1 Compliant\n")
	content.WriteString("Generated: " + time.Now().Format("2006-01-02 15:04:05") + "\n\n")

	// Process each SFAF record
	for i, sfaf := range sfafs {
		content.WriteString(fmt.Sprintf("Record %d:\n", i+1))
		content.WriteString(fmt.Sprintf("ID: %s\n", sfaf.ID.String()))

		// Handle nullable MarkerID
		markerIDStr := "N/A (Pool Assignment)"
		if sfaf.MarkerID != nil {
			markerIDStr = sfaf.MarkerID.String()
		}
		content.WriteString(fmt.Sprintf("Marker ID: %s\n", markerIDStr))

		// Convert SFAF to field map for export (Source: models.txt shows ToFieldMap method)
		fieldMap := sfaf.ToFieldMap()

		// Export non-empty fields organized by category
		sh.appendFieldsByCategory(&content, fieldMap)
		content.WriteString("\n---\n\n")
	}

	return content.String()
}

// Helper method to organize fields by category (Source: response_serializer.txt)
func (sh *SFAFHandler) appendFieldsByCategory(content *strings.Builder, fields map[string]string) {
	categories := map[string]string{
		"Agency Information (100 series)":    "field1",
		"System Information (200 series)":    "field2",
		"Location Information (300 series)":  "field3",
		"Technical Parameters (400 series)":  "field4",
		"Equipment Information (500 series)": "field5",
		"Operational Data (600-700 series)":  "field6|field7",
		"Administrative Info (800 series)":   "field8",
		"Comments and Notes (900+ series)":   "field9",
	}

	for categoryName, fieldPrefix := range categories {
		content.WriteString(fmt.Sprintf("%s:\n", categoryName))

		for fieldNum, value := range fields {
			if value != "" && strings.HasPrefix(fieldNum, fieldPrefix) {
				content.WriteString(fmt.Sprintf("  %s: %s\n", fieldNum, value))
			}
		}
		content.WriteString("\n")
	}
}

// func (sh *SFAFHandler) generateSFAFExport(sfafRecord *models.SFAF) (string, string, error) {
// 	// Get marker data for proper filename (Source: main.txt marker integration)
// 	var serial string = "unknown"
// 	if sfafRecord != nil {
// 		markerResp, err := sh.markerService.GetMarker(sfafRecord.MarkerID.String())
// 		if err == nil && markerResp.Marker != nil && markerResp.Marker.Serial != "" {
// 			serial = markerResp.Marker.Serial
// 		} else {
// 			// Fallback to SFAF field if marker serial unavailable
// 			if sfafRecord.Field102 != "" {
// 				serial = sfafRecord.Field102 // Agency Serial Number
// 			}
// 		}
// 	}

// 	// Generate content using existing method (Source: sfaf_handler.txt)
// 	content := sh.generateSingleSFAFContent()

// 	// Create filename with timestamp (Source: sfaf_handler.txt pattern)
// 	filename := fmt.Sprintf("SFAF_%s_%s.txt",
// 		serial,
// 		time.Now().Format("20060102"))

// 	return content, filename, nil
// }

// ===== FIELD 530 POLYGON ENDPOINTS =====

// GetField530PolygonByMarker retrieves Field 530 polygon data for a specific marker
// GET /api/sfaf/field530/marker/:marker_id
func (sh *SFAFHandler) GetField530PolygonByMarker(c *gin.Context) {
	markerIDStr := c.Param("marker_id")
	if markerIDStr == "" {
		c.JSON(http.StatusBadRequest, NewErrorResponse("marker_id is required"))
		return
	}

	markerID, err := uuid.Parse(markerIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse("Invalid marker ID format"))
		return
	}

	polygon, err := sh.field530Service.GetField530PolygonByMarkerID(markerID)
	if err != nil {
		c.JSON(http.StatusNotFound, NewErrorResponse("No Field 530 polygon data found: "+err.Error()))
		return
	}

	// Get marker details
	markerResp, err := sh.markerService.GetMarker(markerID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, NewErrorResponse("Failed to get marker details: "+err.Error()))
		return
	}

	response := models.Field530PolygonResponse{
		MarkerID:     markerID.String(),
		SerialNumber: markerResp.Marker.Serial,
		Polygon:      *polygon,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// GetAllField530Polygons retrieves all Field 530 polygons
// GET /api/sfaf/field530/polygons
func (sh *SFAFHandler) GetAllField530Polygons(c *gin.Context) {
	polygons, err := sh.field530Service.GetAllField530Polygons()
	if err != nil {
		c.JSON(http.StatusInternalServerError, NewErrorResponse("Failed to retrieve Field 530 polygons: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"count":   len(polygons),
		"data":    polygons,
	})
}

// ValidateField530Format validates a Field 530 coordinate string
// POST /api/sfaf/field530/validate
func (sh *SFAFHandler) ValidateField530Format(c *gin.Context) {
	var req struct {
		Value string `json:"value" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse("Invalid request format"))
		return
	}

	coord, err := sh.field530Service.ParseField530Coordinate(req.Value)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"valid": false,
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":      true,
		"coordinate": coord,
	})
}
