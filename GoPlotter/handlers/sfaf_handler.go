package handlers

import (
	"fmt"
	"net/http"
	"sfaf-plotter/models"
	"sfaf-plotter/services"

	"github.com/gin-gonic/gin"
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

func (sh *SFAFHandler) GetObjectData(c *gin.Context) {
	markerID := c.Param("markerId")

	markerResp, err := sh.markerService.GetMarker(markerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Marker not found"})
		return
	}

	sfaf, _ := sh.sfafService.GetSFAFByMarkerID(markerID)

	var fields map[string]string
	if sfaf != nil {
		fields = sfaf.Fields // This should now work correctly
	} else {
		fields = sh.sfafService.AutoPopulateFromMarker(markerResp.Marker)
	}

	fieldDefs := sh.sfafService.GetFieldDefinitions()
	coordFormats := sh.sfafService.GetCoordinateFormats(markerResp.Marker.Latitude, markerResp.Marker.Longitude)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"marker":  markerResp.Marker,
		"coordinates": map[string]interface{}{
			"lat":     markerResp.Marker.Latitude,  // Always float64
			"lng":     markerResp.Marker.Longitude, // Always float64
			"decimal": fmt.Sprintf("%.6f, %.6f", markerResp.Marker.Latitude, markerResp.Marker.Longitude),
			"dms":     coordFormats.DMS,     // Add DMS format
			"compact": coordFormats.Compact, // Add compact military format
		},
		"sfaf_fields": fields,
		"field_defs":  fieldDefs,
	})
}

func (sh *SFAFHandler) CreateSFAF(c *gin.Context) {
	var req models.CreateSFAFRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sfaf, err := sh.sfafService.CreateSFAF(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "SFAF created successfully",
		"sfaf":    sfaf,
	})
}

func (sh *SFAFHandler) UpdateSFAF(c *gin.Context) {
	id := c.Param("id")

	var req models.UpdateSFAFRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sfaf, err := sh.sfafService.UpdateSFAF(id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "SFAF updated successfully",
		"sfaf":    sfaf,
	})
}

func (sh *SFAFHandler) DeleteSFAF(c *gin.Context) {
	id := c.Param("id")

	err := sh.sfafService.DeleteSFAF(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "SFAF deleted successfully",
	})
}
