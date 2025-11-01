package main

import (
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"sfaf-plotter/internal/handlers"
	"sfaf-plotter/internal/models"
	"sfaf-plotter/internal/services"
	"sfaf-plotter/internal/storage"
)

func main() {
	// Use JSON storage for now (easy SQLite migration later)
	store, err := storage.NewJSONStorage("./data")
	if err != nil {
		log.Fatal("Failed to initialize storage:", err)
	}

	// Initialize services
	coordService := services.NewCoordinateService()
	serialService := services.NewSerialService()
	markerService := services.NewMarkerService(store, serialService, coordService)
	geometryService := services.NewGeometryService(store, markerService, serialService)
	sfafService := services.NewSFAFService(store, coordService)

	// Initialize handlers
	markerHandler := handlers.NewMarkerHandler(markerService)
	geometryHandler := handlers.NewGeometryHandler(geometryService)
	sfafHandler := handlers.NewSFAFHandler(sfafService, markerService)

	r := gin.Default()
	r.Use(cors.Default())

	// Load HTML templates
	r.LoadHTMLGlob("web/templates/*")

	// Static files
	r.Static("/css", "./web/static/css")
	r.Static("/images", "./web/static/images")
	r.Static("/js", "./web/static/js")
	r.Static("/references", "./web/static/references")

	// Main page
	r.GET("/", func(c *gin.Context) {
		markers, _ := markerService.GetAllMarkers()
		fieldDefs := sfafService.GetFieldDefinitions()
		c.HTML(http.StatusOK, "index.html", gin.H{
			"title":     "SFAF Plotter - Go Edition",
			"markers":   markers,
			"fieldDefs": fieldDefs,
		})
	})

	// API endpoints
	api := r.Group("/api")
	{
		// Coordinate conversion
		api.GET("/convert-coords", func(c *gin.Context) {
			latStr := c.Query("lat")
			lngStr := c.Query("lng")

			lat, err := strconv.ParseFloat(latStr, 64)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid latitude"})
				return
			}

			lng, err := strconv.ParseFloat(lngStr, 64)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid longitude"})
				return
			}

			coords := coordService.GetAllFormats(lat, lng)
			c.JSON(http.StatusOK, coords)
		})

		api.DELETE("/data/clear", func(c *gin.Context) {
			log.Println("🗑️ Clear all data endpoint hit")

			err := os.Remove("./data/data.json")
			if err != nil && !os.IsNotExist(err) {
				log.Printf("❌ Error clearing data: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear data"})
				return
			}

			log.Println("✅ All data cleared successfully")
			c.JSON(http.StatusOK, gin.H{"success": true, "message": "All data cleared"})
		})

		// Marker management
		api.POST("/markers", markerHandler.CreateMarker)
		api.GET("/markers", markerHandler.GetAllMarkers)
		api.GET("/markers/:id", markerHandler.GetMarker)
		api.PUT("/markers/:id", markerHandler.UpdateMarker)
		api.DELETE("/markers", markerHandler.DeleteAllMarkers)
		api.DELETE("/markers/:id", markerHandler.DeleteMarker)

		// Geometry management
		geometry := api.Group("/geometry")
		{
			geometry.POST("/circle", geometryHandler.CreateCircle)
			geometry.POST("/polygon", geometryHandler.CreatePolygon)
			geometry.POST("/rectangle", geometryHandler.CreateRectangle)
			geometry.POST("/from-text", geometryHandler.CreateFromText)
		}

		// SFAF form management
		sfaf := api.Group("/sfaf")
		{
			sfaf.GET("/object/:id", sfafHandler.GetObjectData)
			sfaf.POST("/validate", sfafHandler.ValidateSFAFData)
			sfaf.POST("", sfafHandler.SaveSFAFData)

			// ADD THIS IMPORT ENDPOINT
			sfaf.POST("/import", func(c *gin.Context) {
				log.Println("📥 SFAF import endpoint hit")

				file, header, err := c.Request.FormFile("file")
				if err != nil {
					log.Printf("❌ Error getting file: %v", err)
					c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
					return
				}
				defer file.Close()

				log.Printf("📁 Processing file: %s, size: %d bytes", header.Filename, header.Size)

				markers, sfafRecords, err := sfafService.ImportSFAFFile(file, header.Filename)
				if err != nil {
					log.Printf("❌ Import error: %v", err)
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}

				// Save markers and SFAF records with matching IDs
				var savedMarkers []models.Marker
				for i, marker := range markers {
					sfaf := sfafRecords[i]

					log.Printf("💾 Saving marker %s with SFAF %s (MarkerID: %s)", marker.ID, sfaf.ID, sfaf.MarkerID)

					// Create marker request from the parsed marker
					createReq := models.CreateMarkerRequest{
						Lat:       marker.Lat,
						Lng:       marker.Lng,
						Frequency: marker.Frequency,
						Notes:     marker.Notes,
						Type:      marker.Type,
					}

					// Save marker using marker service
					markerResp, err := markerService.CreateMarker(createReq)
					if err != nil {
						log.Printf("❌ Error saving marker: %v", err)
						continue
					}

					// Update the SFAF MarkerID to match the actual saved marker ID
					sfaf.MarkerID = markerResp.Marker.ID

					// Create SFAF request
					createSFAFReq := models.CreateSFAFRequest{
						MarkerID: markerResp.Marker.ID,
						Fields:   sfaf.Fields,
					}

					// Save SFAF data using the service
					_, err = sfafService.CreateSFAFWithoutValidation(createSFAFReq)
					if err != nil {
						log.Printf("❌ Error saving SFAF: %v", err)
						continue
					}

					savedMarkers = append(savedMarkers, markerResp.Marker)
				}

				log.Printf("✅ Import successful: %d markers, %d SFAF records", len(savedMarkers), len(sfafRecords))

				c.JSON(http.StatusOK, gin.H{
					"success":        true,
					"imported_count": len(savedMarkers),
					"markers":        savedMarkers,
					"sfaf_records":   sfafRecords,
				})
			})
		}

		log.Println("🚀 SFAF Plotter Go Edition starting on :8080")
		log.Println("🗺️ Serving interactive map with Go backend")
		log.Println("📡 Coordinate conversion API ready")
		log.Println("📍 Marker management APIs ready")
		log.Println("🔶 Geometry creation APIs ready")
		log.Println("📋 SFAF form management APIs ready")
		log.Println("💾 JSON file persistence ready (./data/data.json)")
		log.Println("🔮 SQLite migration planned for future")

		r.Run(":8080")
	}
}
