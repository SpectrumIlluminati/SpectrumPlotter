// handlers/sfaf_lookup_handler.go
package handlers

import (
	"net/http"
	"sfaf-plotter/models"
	"sfaf-plotter/repositories"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SFAFLookupHandler struct {
	repo *repositories.SFAFLookupRepository
}

func NewSFAFLookupHandler(repo *repositories.SFAFLookupRepository) *SFAFLookupHandler {
	return &SFAFLookupHandler{repo: repo}
}

// GET /api/sfaf-lookup?field=200
func (h *SFAFLookupHandler) GetAll(c *gin.Context) {
	fieldCode := c.Query("field")
	if fieldCode != "" {
		rows, err := h.repo.GetByFieldCode(fieldCode)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"entries": rows, "count": len(rows)})
		return
	}
	rows, err := h.repo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"entries": rows, "count": len(rows)})
}

// POST /api/sfaf-lookup
func (h *SFAFLookupHandler) Create(c *gin.Context) {
	var req models.CreateSFAFLookupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}
	entry := &models.SFAFFieldLookup{
		FieldCode: req.FieldCode,
		Value:     req.Value,
		Label:     req.Label,
		SortOrder: req.SortOrder,
	}
	if err := h.repo.Create(entry); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create entry: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"entry": entry})
}

// PUT /api/sfaf-lookup/:id
func (h *SFAFLookupHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	var req models.UpdateSFAFLookupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}
	entry := &models.SFAFFieldLookup{
		ID:        id,
		Value:     req.Value,
		Label:     req.Label,
		SortOrder: req.SortOrder,
		IsActive:  req.IsActive,
	}
	if err := h.repo.Update(entry); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update entry: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"entry": entry})
}

// DELETE /api/sfaf-lookup/:id
func (h *SFAFLookupHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete entry: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
