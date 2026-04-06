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

func (gh *GeometryHandler) UpdateCircle(c *gin.Context) {
	id := c.Param("id")
	var req models.CreateCircleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	geometry, err := gh.geometryService.UpdateCircle(id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"message":  "Circle updated successfully",
		"geometry": geometry,
	})
}

func (gh *GeometryHandler) UpdatePolygon(c *gin.Context) {
	id := c.Param("id")
	var req models.CreatePolygonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	geometry, err := gh.geometryService.UpdatePolygon(id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"message":  "Polygon updated successfully",
		"geometry": geometry,
	})
}

func (gh *GeometryHandler) UpdateRectangle(c *gin.Context) {
	id := c.Param("id")
	var req models.CreateRectangleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	geometry, err := gh.geometryService.UpdateRectangle(id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"message":  "Rectangle updated successfully",
		"geometry": geometry,
	})
}

func (gh *GeometryHandler) GetAllGeometries(c *gin.Context) {
	geometries, err := gh.geometryService.GetAllGeometries()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"geometries": geometries,
	})
}

func (gh *GeometryHandler) DeleteGeometry(c *gin.Context) {
	id := c.Param("id")

	err := gh.geometryService.DeleteGeometry(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Geometry deleted successfully",
	})
}
