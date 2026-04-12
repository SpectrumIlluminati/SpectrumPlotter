package handlers

import (
	"net/http"
	"sfaf-plotter/models"
	"sfaf-plotter/repositories"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type InstallationHandler struct {
	repo *repositories.InstallationRepository
}

func NewInstallationHandler(repo *repositories.InstallationRepository) *InstallationHandler {
	return &InstallationHandler{repo: repo}
}

// GET /api/installations
func (h *InstallationHandler) GetAll(c *gin.Context) {
	installations, err := h.repo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"installations": installations, "count": len(installations)})
}

// POST /api/installations
func (h *InstallationHandler) Create(c *gin.Context) {
	var req models.CreateInstallationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	country := req.Country
	if country == "" {
		country = "USA"
	}

	inst := &models.Installation{
		Name:         req.Name,
		Code:         req.Code,
		Organization: req.Organization,
		State:        req.State,
		Country:      country,
	}

	if err := h.repo.Create(inst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create installation: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"installation": inst})
}

// PUT /api/installations/:id
func (h *InstallationHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid installation ID"})
		return
	}

	var req models.UpdateInstallationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	country := req.Country
	if country == "" {
		country = "USA"
	}

	inst := &models.Installation{
		ID:           id,
		Name:         req.Name,
		Code:         req.Code,
		Organization: req.Organization,
		State:        req.State,
		Country:      country,
		IsActive:     req.IsActive,
	}

	if err := h.repo.Update(inst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update installation: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"installation": inst})
}

// DELETE /api/installations/:id
func (h *InstallationHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid installation ID"})
		return
	}

	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete installation: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
