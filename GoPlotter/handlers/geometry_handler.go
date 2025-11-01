package handlers

import (
	"net/http"
	"sfaf-plotter/models"
	"sfaf-plotter/services"

	"github.com/gin-gonic/gin"
)

type GeometryHandler struct {
	geometryService *services.GeometryService
}

func NewGeometryHandler(geometryService *services.GeometryService) *GeometryHandler {
	return &GeometryHandler{geometryService: geometryService}
}

func (gh *GeometryHandler) CreateCircle(c *gin.Context) {
	var req models.CreateCircleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	geometry, err := gh.geometryService.CreateCircle(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":  true,
		"message":  "Circle created successfully",
		"geometry": geometry,
	})
}

func (gh *GeometryHandler) CreatePolygon(c *gin.Context) {
	var req models.CreatePolygonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	geometry, err := gh.geometryService.CreatePolygon(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":  true,
		"message":  "Polygon created successfully",
		"geometry": geometry,
	})
}

func (gh *GeometryHandler) CreateRectangle(c *gin.Context) {
	var req models.CreateRectangleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	geometry, err := gh.geometryService.CreateRectangle(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":  true,
		"message":  "Rectangle created successfully",
		"geometry": geometry,
	})
}

func (gh *GeometryHandler) GetAllGeometries(c *gin.Context) {
	// Implementation depends on storage.GetAllGeometries method
	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"geometries": []interface{}{}, // Placeholder
	})
}

func (gh *GeometryHandler) DeleteGeometry(c *gin.Context) {
	id := c.Param("id")

	// Implementation depends on storage.DeleteGeometry method
	_ = id // Placeholder

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Geometry deleted successfully",
	})
}
