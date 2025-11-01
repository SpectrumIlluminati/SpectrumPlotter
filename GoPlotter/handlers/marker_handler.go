// handlers/marker_handler.go
package handlers

import (
	"net/http"
	"sfaf-plotter/models"
	"sfaf-plotter/services"

	"github.com/gin-gonic/gin"
)

type MarkerHandler struct {
	markerService *services.MarkerService
}

func NewMarkerHandler(markerService *services.MarkerService) *MarkerHandler {
	return &MarkerHandler{markerService: markerService}
}

// Existing CRUD handlers
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

func (mh *MarkerHandler) GetAllMarkers(c *gin.Context) {
	markers, err := mh.markerService.GetAllMarkers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, markers)
}

func (mh *MarkerHandler) GetMarker(c *gin.Context) {
	id := c.Param("id")
	marker, err := mh.markerService.GetMarker(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, marker)
}

func (mh *MarkerHandler) UpdateMarker(c *gin.Context) {
	id := c.Param("id")
	var req models.UpdateMarkerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	marker, err := mh.markerService.UpdateMarker(id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, marker)
}

func (mh *MarkerHandler) DeleteMarker(c *gin.Context) {
	id := c.Param("id")
	err := mh.markerService.DeleteMarker(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Marker deleted successfully"})
}

func (mh *MarkerHandler) DeleteAllMarkers(c *gin.Context) {
	err := mh.markerService.DeleteAllMarkers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "All markers deleted successfully"})
}

// New IRAC Notes handlers
func (mh *MarkerHandler) GetIRACNotes(c *gin.Context) {
	category := c.Query("category")
	search := c.Query("search")

	var notes []models.IRACNote
	var err error

	if search != "" {
		notes, err = mh.markerService.SearchIRACNotes(search)
	} else if category != "" {
		notes, err = mh.markerService.GetIRACNotesByCategory(category)
	} else {
		notes, err = mh.markerService.GetIRACNotes()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"notes":   notes,
	})
}

func (mh *MarkerHandler) AddIRACNoteToMarker(c *gin.Context) {
	type addNoteRequest struct {
		MarkerID         string `json:"marker_id" binding:"required"`
		NoteCode         string `json:"note_code" binding:"required"`
		FieldNumber      int    `json:"field_number" binding:"required"`
		OccurrenceNumber int    `json:"occurrence_number" binding:"required"`
	}

	var req addNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate field number based on MCEB Publication 7 standards
	if req.FieldNumber != 500 && req.FieldNumber != 501 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Field number must be 500 or 501"})
		return
	}

	// Validate occurrence limits based on MCEB Pub 7 (Source: irac-notes-reference.txt)
	if req.FieldNumber == 500 && req.OccurrenceNumber > 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Field 500 maximum 10 occurrences per MCEB Pub 7"})
		return
	}

	if req.FieldNumber == 501 && req.OccurrenceNumber > 30 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Field 501 maximum 30 occurrences per MCEB Pub 7"})
		return
	}

	err := mh.markerService.AddIRACNoteToMarker(req.MarkerID, req.NoteCode, req.FieldNumber, req.OccurrenceNumber)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "IRAC note added to marker successfully"})
}

func (mh *MarkerHandler) RemoveIRACNoteFromMarker(c *gin.Context) {
	type removeNoteRequest struct {
		MarkerID         string `json:"marker_id" binding:"required"`
		NoteCode         string `json:"note_code" binding:"required"`
		FieldNumber      int    `json:"field_number" binding:"required"`
		OccurrenceNumber int    `json:"occurrence_number" binding:"required"`
	}

	var req removeNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := mh.markerService.RemoveIRACNoteFromMarker(req.MarkerID, req.NoteCode, req.FieldNumber, req.OccurrenceNumber)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "IRAC note removed from marker successfully"})
}
