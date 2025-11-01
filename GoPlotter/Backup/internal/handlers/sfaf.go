package handlers

import (
    "log"
    "net/http"
    
    "github.com/gin-gonic/gin"
    "sfaf-plotter/internal/models"
    "sfaf-plotter/internal/services"
)

type SFAFHandler struct {
    sfafService   *services.SFAFService
    markerService *services.MarkerService
}

func NewSFAFHandler(sfafService *services.SFAFService, markerService *services.MarkerService) *SFAFHandler {
    return &SFAFHandler{
        sfafService:   sfafService,
        markerService: markerService,
    }
}

// GetObjectData handles GET /api/sfaf/object/:id
func (sh *SFAFHandler) GetObjectData(c *gin.Context) {
    markerID := c.Param("id")
    
    markerResp, err := sh.markerService.GetMarker(markerID)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Marker not found"})
        return
    }
    
    // Start with auto-populated fields
    fields := sh.sfafService.AutoPopulateFromMarker(&markerResp.Marker)
    log.Printf("🔍 Auto-populated fields count: %d", len(fields))
    
    // Try to get existing SFAF data for this marker and merge it
    if existingSFAF, err := sh.sfafService.GetSFAFByMarkerID(markerID); err == nil {
        log.Printf("✅ Found existing SFAF data with %d fields", len(existingSFAF))
        // Merge existing SFAF data (it overrides auto-populated data)
        for fieldID, value := range existingSFAF {
            fields[fieldID] = value
        }
    } else {
        log.Printf("❌ No existing SFAF data found: %v", err)
    }
    
    log.Printf("🔍 Final fields count: %d", len(fields))
    
    fieldDefs := sh.sfafService.GetFieldDefinitions()
    
    c.JSON(http.StatusOK, gin.H{
        "success":     true,
        "marker":      markerResp.Marker,
        "coordinates": markerResp.Coordinates,
        "sfaf_fields": fields,
        "field_defs":  fieldDefs,
    })
}

// ValidateSFAFData handles POST /api/sfaf/validate
func (sh *SFAFHandler) ValidateSFAFData(c *gin.Context) {
    var req models.ValidateSFAFRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    validation := sh.sfafService.ValidateFields(req.Fields)
    
    c.JSON(http.StatusOK, gin.H{
        "success":    true,
        "validation": validation,
    })
}

// SaveSFAFData handles POST /api/sfaf
func (sh *SFAFHandler) SaveSFAFData(c *gin.Context) {
    var req models.CreateSFAFRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    sfaf, err := sh.sfafService.CreateSFAF(req)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusCreated, gin.H{
        "success": true,
        "sfaf":    sfaf,
        "message": "SFAF data saved successfully",
    })
}