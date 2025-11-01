// handlers/markers.go

package handlers

import (
	"net/http"

	"sfaf-plotter/internal/models"
	"sfaf-plotter/internal/services"

	"github.com/gin-gonic/gin"
)

type MarkerHandler struct {
	markerService *services.MarkerService
}

func NewMarkerHandler(markerService *services.MarkerService) *MarkerHandler {
	return &MarkerHandler{
		markerService: markerService,
	}
}

// CreateMarker handles POST /api/markers
func (mh *MarkerHandler) CreateMarker(c *gin.Context) {
	var req models.CreateMarkerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	marker, err := mh.markerService.CreateMarker(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, marker)
}

// GetAllMarkers handles GET /api/markers
func (mh *MarkerHandler) GetAllMarkers(c *gin.Context) {
	markers, err := mh.markerService.GetAllMarkers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"markers": markers})
}

// GetMarker handles GET /api/markers/:id
func (mh *MarkerHandler) GetMarker(c *gin.Context) {
	id := c.Param("id")

	marker, err := mh.markerService.GetMarker(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Marker not found"})
		return
	}

	c.JSON(http.StatusOK, marker)
}

// UpdateMarker handles PUT /api/markers/:id
func (mh *MarkerHandler) UpdateMarker(c *gin.Context) {
	id := c.Param("id")

	var req models.UpdateMarkerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	marker, err := mh.markerService.UpdateMarker(id, req)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Marker not found"})
		return
	}

	c.JSON(http.StatusOK, marker)
}

// DeleteMarker handles DELETE /api/markers/:id
func (mh *MarkerHandler) DeleteMarker(c *gin.Context) {
	id := c.Param("id")

	err := mh.markerService.DeleteMarker(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Marker not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Marker deleted"})
}

// Add to markerHandler.go
func (mh *MarkerHandler) DeleteAllMarkers(c *gin.Context) {
	err := mh.markerService.DeleteAllMarkers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "All markers deleted"})
}
