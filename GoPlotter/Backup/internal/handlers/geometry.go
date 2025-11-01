// handlers/geometry.go

package handlers

import (
    "fmt"
    "net/http"
    "strconv"
    "strings"
    
    "github.com/gin-gonic/gin"
    "sfaf-plotter/internal/models"
    "sfaf-plotter/internal/services"
)

type GeometryHandler struct {
    geometryService *services.GeometryService
}

func NewGeometryHandler(geometryService *services.GeometryService) *GeometryHandler {
    return &GeometryHandler{
        geometryService: geometryService,
    }
}

// CreateCircle handles POST /api/geometry/circle
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
        "success": true,
        "geometry": geometry,
        "message": "Circle created successfully",
    })
}

// CreatePolygon handles POST /api/geometry/polygon
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
        "success": true,
        "geometry": geometry,
        "message": "Polygon created successfully",
    })
}

// CreateRectangle handles POST /api/geometry/rectangle
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
        "success": true,
        "geometry": geometry,
        "message": "Rectangle created successfully",
    })
}

// CreateFromText handles POST /api/geometry/from-text (matches your sidebar text input)
func (gh *GeometryHandler) CreateFromText(c *gin.Context) {
    var req struct {
        GeometryType string `json:"geometry_type" binding:"required"` // "circle", "polygon", "rectangle"
        Input        string `json:"input" binding:"required"`         // coordinate text
        Color        string `json:"color"`
        Frequency    string `json:"frequency"`
        Notes        string `json:"notes"`
        Radius       float64 `json:"radius,omitempty"`                // for circles
        Unit         string `json:"unit,omitempty"`                   // for circles
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    // Parse coordinates from text input (you'll need this helper)
    coords, err := gh.parseCoordinateInput(req.Input)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid coordinate format: " + err.Error()})
        return
    }
    
    switch req.GeometryType {
    case "circle":
        if len(coords) < 1 {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Circle requires at least 1 coordinate"})
            return
        }
        
        radius := req.Radius
        if radius == 0 {
            radius = 1 // Default 1km
        }
        
        unit := req.Unit
        if unit == "" {
            unit = "km"
        }
        
        circleReq := models.CreateCircleRequest{
            Lat:       coords[0].Lat,
            Lng:       coords[0].Lng,
            Radius:    radius,
            Unit:      unit,
            Color:     req.Color,
            Frequency: req.Frequency,
            Notes:     req.Notes,
        }
        
        geometry, err := gh.geometryService.CreateCircle(circleReq)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }
        
        c.JSON(http.StatusCreated, gin.H{"success": true, "geometry": geometry})
        
    case "polygon":
        if len(coords) < 3 {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Polygon requires at least 3 coordinates"})
            return
        }
        
        polygonReq := models.CreatePolygonRequest{
            Points:    coords,
            Color:     req.Color,
            Frequency: req.Frequency,
            Notes:     req.Notes,
        }
        
        geometry, err := gh.geometryService.CreatePolygon(polygonReq)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }
        
        c.JSON(http.StatusCreated, gin.H{"success": true, "geometry": geometry})
        
    case "rectangle":
        if len(coords) < 2 {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Rectangle requires 2 coordinates (SW and NE corners)"})
            return
        }
        
        rectangleReq := models.CreateRectangleRequest{
            SouthWest: coords[0],
            NorthEast: coords[1],
            Color:     req.Color,
            Frequency: req.Frequency,
            Notes:     req.Notes,
        }
        
        geometry, err := gh.geometryService.CreateRectangle(rectangleReq)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }
        
        c.JSON(http.StatusCreated, gin.H{"success": true, "geometry": geometry})
        
    default:
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid geometry type"})
    }
}

// Helper function to parse coordinate input (matches your JS parseCoordinates function)
func (gh *GeometryHandler) parseCoordinateInput(input string) ([]models.Coordinate, error) {
    // This is a simplified version - you might want to enhance it
    // For now, let's handle basic decimal degree format: "lat,lng"
    
    lines := strings.Split(strings.TrimSpace(input), "\n")
    var coords []models.Coordinate
    
    for _, line := range lines {
        line = strings.TrimSpace(line)
        if line == "" {
            continue
        }
        
        // Handle decimal format like "30.43, -86.695"
        parts := strings.Split(line, ",")
        if len(parts) != 2 {
            return nil, fmt.Errorf("invalid coordinate format: %s", line)
        }
        
        lat, err := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
        if err != nil {
            return nil, fmt.Errorf("invalid latitude: %s", parts[0])
        }
        
        lng, err := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
        if err != nil {
            return nil, fmt.Errorf("invalid longitude: %s", parts[1])
        }
        
        coords = append(coords, models.Coordinate{Lat: lat, Lng: lng})
    }
    
    return coords, nil
}