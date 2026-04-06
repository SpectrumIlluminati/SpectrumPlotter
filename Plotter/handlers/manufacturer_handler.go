// handlers/manufacturer_handler.go
package handlers

import (
	"net/http"
	"sfaf-plotter/models"
	"sfaf-plotter/repositories"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ManufacturerHandler struct {
	repo *repositories.ManufacturerRepository
}

func NewManufacturerHandler(repo *repositories.ManufacturerRepository) *ManufacturerHandler {
	return &ManufacturerHandler{repo: repo}
}

// GET /api/manufacturers
func (h *ManufacturerHandler) GetAll(c *gin.Context) {
	manufacturers, err := h.repo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"manufacturers": manufacturers, "count": len(manufacturers)})
}

// POST /api/manufacturers
func (h *ManufacturerHandler) Create(c *gin.Context) {
	var req models.CreateManufacturerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	m := &models.Manufacturer{
		Code:    req.Code,
		Name:    req.Name,
		Country: req.Country,
	}

	if err := h.repo.Create(m); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create manufacturer: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"manufacturer": m})
}

// PUT /api/manufacturers/:id
func (h *ManufacturerHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid manufacturer ID"})
		return
	}

	var req models.UpdateManufacturerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	m := &models.Manufacturer{
		ID:       id,
		Code:     req.Code,
		Name:     req.Name,
		Country:  req.Country,
		IsActive: req.IsActive,
	}

	if err := h.repo.Update(m); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update manufacturer: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"manufacturer": m})
}

// DELETE /api/manufacturers/:id
func (h *ManufacturerHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid manufacturer ID"})
		return
	}

	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete manufacturer: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
