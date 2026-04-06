package handlers

import (
	"net/http"
	"sfaf-plotter/models"
	"sfaf-plotter/repositories"

	"github.com/gin-gonic/gin"
)

type SystemConfigHandler struct {
	repo *repositories.SystemConfigRepository
}

func NewSystemConfigHandler(repo *repositories.SystemConfigRepository) *SystemConfigHandler {
	return &SystemConfigHandler{repo: repo}
}

func (h *SystemConfigHandler) GetAll(c *gin.Context) {
	configs, err := h.repo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "configs": configs})
}

func (h *SystemConfigHandler) Update(c *gin.Context) {
	key := c.Param("key")
	var req models.UpdateSystemConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.repo.Update(key, req.Value); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
