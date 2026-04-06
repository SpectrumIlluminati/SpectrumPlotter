// main.go
package main

import (
	"fmt"
	"log"
	"net/http"
	"sfaf-plotter/config"
	"sfaf-plotter/handlers"
	"sfaf-plotter/middleware"
	"sfaf-plotter/repositories"
	"sfaf-plotter/services"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

func main() {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  No .env file found, using system environment variables")
	} else {
		log.Println("✅ Loaded configuration from .env file")
	}

	// Load application configuration
	appConfig := config.Load()
	appConfig.PrintConfiguration()

	// Initialize structured logger
	logger, err := config.InitLogger(appConfig)
	if err != nil {
		log.Fatal("Failed to initialize logger:", err)
	}
	defer logger.Sync()

	// Set global logger for use throughout the application
	config.SetLogger(logger)

	logger.Info("Application starting",
		zap.String("version", "1.0.0"),
		zap.String("mode", appConfig.Server.GinMode),
	)

	// Set Gin mode based on configuration
	gin.SetMode(appConfig.Server.GinMode)

	// Initialize database connection
	db, dbErr := config.ConnectDatabase()
	if dbErr != nil {
		logger.Fatal("Failed to connect to database", zap.Error(dbErr))
	}
	defer db.Close()

	// Wrap with sqlx for enhanced functionality
	sqlxDB := sqlx.NewDb(db, "postgres")

	// Initialize repositories
	markerRepo := repositories.NewMarkerRepository(sqlxDB)
	iracNotesRepo := repositories.NewIRACNotesRepository(sqlxDB)
	sfafRepo := repositories.NewSFAFRepository(sqlxDB)
	sfafFieldOccRepo := repositories.NewSFAFFieldOccurrenceRepository(sqlxDB)
	geometryRepo := repositories.NewGeometryRepository(sqlxDB)
	frequencyRepo := repositories.NewFrequencyRepository(sqlxDB)
	manufacturerRepo := repositories.NewManufacturerRepository(sqlxDB)
	systemConfigRepo := repositories.NewSystemConfigRepository(sqlxDB)
	installationRepo := repositories.NewInstallationRepository(sqlxDB)
	userRepo := repositories.NewUserRepository(sqlxDB)
	sessionRepo := repositories.NewSessionRepository(sqlxDB)
	accountReqRepo := repositories.NewAccountRequestRepository(sqlxDB)
	sfafLookupRepo := repositories.NewSFAFLookupRepository(sqlxDB)
	serialNumberRepo := repositories.NewSerialNumberRepository(sqlxDB)

	// Initialize services
	serialService := services.NewSerialService(sqlxDB)
	coordService := services.NewCoordinateService()
	markerService := services.NewMarkerService(markerRepo, iracNotesRepo, serialService, coordService)
	sfafService := services.NewSFAFService(sfafRepo, sfafFieldOccRepo, coordService)
	field530Service := services.NewField530Service(sfafRepo, coordService)

	// Wire up marker service to SFAF service for import functionality
	sfafService.SetMarkerService(markerService)
	sfafService.SetMarkerRepo(markerRepo)
	sfafService.SetSerialService(serialService)

	// Update existing imported markers to be non-draggable
	logger.Info("Updating imported markers to be non-draggable")
	if err := markerRepo.UpdateImportedMarkersDraggable(); err != nil {
		logger.Warn("Failed to update imported markers draggable status", zap.Error(err))
	} else {
		logger.Info("Successfully updated imported markers to non-draggable")
	}

	geometryService := services.NewGeometryService(geometryRepo, markerService, serialService, coordService)
	frequencyService := services.NewFrequencyService(frequencyRepo, userRepo, installationRepo)
	authService := services.NewAuthService(userRepo, sessionRepo)

	// Initialize handlers with properly created services
	markerHandler := handlers.NewMarkerHandler(markerService)
	sfafHandler := handlers.NewSFAFHandler(sfafService, markerService, field530Service)
	geometryHandler := handlers.NewGeometryHandler(geometryService)
	frequencyHandler := handlers.NewFrequencyHandler(frequencyService)
	manufacturerHandler := handlers.NewManufacturerHandler(manufacturerRepo)
	systemConfigHandler := handlers.NewSystemConfigHandler(systemConfigRepo)
	installationHandler := handlers.NewInstallationHandler(installationRepo)
	sfafLookupHandler := handlers.NewSFAFLookupHandler(sfafLookupRepo)
	serialNumberHandler := handlers.NewSerialNumberHandler(serialNumberRepo, frequencyRepo)
	authHandler := handlers.NewAuthHandler(authService, userRepo)
	adminHandler := handlers.NewAdminHandler(authService, userRepo, accountReqRepo, frequencyRepo)
	equipmentHandler := handlers.NewEquipmentHandler("./xml")

	// Setup Gin router (without default middleware)
	r := gin.New()

	// Add custom middleware
	r.Use(middleware.Recovery(logger))  // Panic recovery with logging
	r.Use(middleware.Logger(logger))    // Request logging

	// Development authentication bypass — disabled; real session auth is enforced below
	r.Use(middleware.DevAuthMiddleware(false, logger))

	// CORS middleware (configured from .env)
	r.Use(func(c *gin.Context) {
		origin := "*"
		if len(appConfig.CORS.AllowedOrigins) > 0 && appConfig.CORS.AllowedOrigins[0] != "*" {
			origin = appConfig.CORS.AllowedOrigins[0]
		}

		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Methods", strings.Join(appConfig.CORS.AllowedMethods, ","))
		c.Header("Access-Control-Allow-Headers", strings.Join(appConfig.CORS.AllowedHeaders, ","))

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Static file serving
	r.Static("/css", "./web/static/css")
	r.Static("/images", "./web/static/images")
	r.Static("/js", "./web/static/js")
	r.Static("/references", "./web/static/references")
	r.LoadHTMLGlob("web/templates/*")

	// Suppress favicon 404
	r.GET("/favicon.ico", func(c *gin.Context) { c.Status(204) })

	// Landing page route
	r.GET("/", func(c *gin.Context) {
		c.HTML(200, "landing.html", gin.H{
			"title": "SFAF Plotter - Military Frequency Coordination Platform",
		})
	})

	// Map viewer route (moved from root)
	r.GET("/map-viewer", func(c *gin.Context) {
		c.HTML(200, "map_viewer.html", gin.H{
			"title": "SFAF Plotter - Map Viewer",
		})
	})

	// Add database viewer route (Source: main.txt pattern)
	r.GET("/database", func(c *gin.Context) {
		c.HTML(200, "db_viewer.html", gin.H{
			"title": "SFAF Plotter - Database Viewer",
		})
	})

	// Add table manager route (formerly view manager)
	r.GET("/view-manager", func(c *gin.Context) {
		c.HTML(200, "view_manager.html", gin.H{
			"title": "SFAF Table Manager",
		})
	})

	// Add frequency nomination route
	r.GET("/frequency-nomination", func(c *gin.Context) {
		c.HTML(200, "frequency_nomination.html", gin.H{
			"title": "Frequency Nomination & Deconfliction",
		})
	})

	// Add user profile route
	r.GET("/profile", func(c *gin.Context) {
		c.HTML(200, "profile.html", gin.H{
			"title": "SFAF Plotter - User Profile",
		})
	})

	// Admin control panel
	r.GET("/admin", func(c *gin.Context) {
		c.HTML(200, "admin.html", gin.H{
			"title": "SFAF Plotter - Admin Control Panel",
		})
	})

	// Unified frequency page (My Frequencies + Frequency Requests tabs)
	r.GET("/frequency", func(c *gin.Context) {
		c.HTML(200, "frequency.html", gin.H{
			"title": "Frequencies",
		})
	})
	// Keep /frequency/assignments as a redirect for any bookmarks
	r.GET("/frequency/assignments", func(c *gin.Context) {
		c.Redirect(301, "/frequency")
	})

	r.GET("/frequency/request", func(c *gin.Context) {
		c.HTML(200, "request_frequency.html", gin.H{
			"title": "Request Frequency",
		})
	})

	r.GET("/workbox", func(c *gin.Context) {
		c.HTML(200, "request_dashboard.html", gin.H{
			"title": "ISM Workbox",
		})
	})

	// Session validator used by auth middleware — also injects user context for downstream handlers
	sessionValidator := func(token string, c *gin.Context) error {
		user, err := authService.ValidateSession(token)
		if err != nil {
			return err
		}
		c.Set("userID", user.ID)
		c.Set("username", user.Username)
		c.Set("role", user.Role)
		return nil
	}

	// API routes
	api := r.Group("/api")
	{
		// AUTHENTICATION ROUTES (public - no auth required)
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", authHandler.Logout)
			auth.GET("/session", authHandler.VerifySession)
			auth.POST("/create-superuser", authHandler.CreateSuperuser)
			auth.POST("/request-account", handlers.SubmitAccountRequest(accountReqRepo))

			// Public: list active installations for the account-request form dropdown
			auth.GET("/public-installations", func(c *gin.Context) {
				list, err := installationRepo.GetPublicInstallations()
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load installations"})
					return
				}
				c.JSON(http.StatusOK, gin.H{"installations": list})
			})

			// Public: list active units for the account-request form dropdown.
			// Optional query param: ?installation_id=<uuid> to filter by installation.
			auth.GET("/public-units", func(c *gin.Context) {
				units, err := frequencyRepo.GetPublicUnits(c.Query("installation_id"))
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load units"})
					return
				}
				c.JSON(http.StatusOK, gin.H{"units": units})
			})
		}

		// All remaining API routes require a valid session
		api.Use(middleware.RequireSessionAuth(sessionValidator, logger))

		api.GET("/convert-coords", func(c *gin.Context) {
			lat := c.Query("lat")
			lng := c.Query("lng")

			latFloat, _ := strconv.ParseFloat(lat, 64)
			lngFloat, _ := strconv.ParseFloat(lng, 64)

			// Use coordinate service for conversion
			coordFormats := coordService.GetAllFormats(latFloat, lngFloat)

			c.JSON(http.StatusOK, gin.H{
				"decimal": fmt.Sprintf("%.4f, %.4f", latFloat, lngFloat),
				"dms":     coordFormats.DMS,
				"compact": coordFormats.Compact,
			})
		})

		// Existing marker management routes
		api.POST("/markers", markerHandler.CreateMarker)
		api.GET("/markers", markerHandler.GetAllMarkers)
		api.GET("/markers/bounds", markerHandler.GetMarkersByBounds) // Viewport-based loading
		api.GET("/markers/:id", markerHandler.GetMarker)
		api.PUT("/markers/:id", markerHandler.UpdateMarker)
		api.DELETE("/markers/:id", markerHandler.DeleteMarker)
		api.DELETE("/markers", markerHandler.DeleteAllMarkers)

		// IRAC Notes management routes
		api.GET("/system-config", systemConfigHandler.GetAll)
		api.PUT("/system-config/:key", systemConfigHandler.Update)

		api.GET("/irac-notes", markerHandler.GetIRACNotes)
		api.POST("/irac-notes", markerHandler.CreateIRACNote)
		api.PUT("/irac-notes/:code", markerHandler.UpdateIRACNote)
		api.DELETE("/irac-notes/:code", markerHandler.DeleteIRACNote)
		api.POST("/markers/irac-notes", markerHandler.AddIRACNoteToMarker)
		api.DELETE("/markers/irac-notes", markerHandler.RemoveIRACNoteFromMarker)

		// SELF-SERVICE USER PROFILE ROUTES
		userGroup := api.Group("/user")
		{
			userGroup.GET("/profile", authHandler.GetProfile)
			userGroup.PUT("/profile", authHandler.UpdateProfile)
		}
		api.POST("/auth/change-password", authHandler.ChangePassword)

		// SFAF ROUTES
		api.POST("/sfaf", sfafHandler.CreateSFAF)
		api.GET("/sfaf/object-data/:marker_id", sfafHandler.GetObjectData)
		api.PUT("/sfaf/:id", sfafHandler.UpdateSFAF)
		api.DELETE("/sfaf/:id", sfafHandler.DeleteSFAF)
		api.DELETE("/sfaf/delete-all", sfafHandler.DeleteAllSFAFs)
		api.GET("/sfaf", sfafHandler.GetAllSFAFs)
		api.GET("/sfaf/:id", sfafHandler.GetSFAF)
		api.GET("/sfaf/marker/:marker_id", sfafHandler.GetSFAFByMarkerID)
		api.POST("/sfaf/validate", sfafHandler.ValidateFields)
		api.GET("/sfaf/pool-assignments", sfafHandler.GetPoolAssignments)
		api.GET("/sfaf/field-definitions", sfafHandler.GetFieldDefinitions)
		api.POST("/sfaf/import", sfafHandler.ImportSFAF)
		api.GET("/sfaf/export", sfafHandler.ExportAllSFAF)
		api.GET("/sfaf/export/:marker_id", sfafHandler.ExportSingleSFAF)
		api.POST("/sfaf/export-selected", sfafHandler.ExportSelectedSFAFs)

		// FIELD 530 POLYGON ROUTES
		api.GET("/sfaf/field530/polygons", sfafHandler.GetAllField530Polygons)
		api.GET("/sfaf/field530/marker/:marker_id", sfafHandler.GetField530PolygonByMarker)
		api.POST("/sfaf/field530/validate", sfafHandler.ValidateField530Format)

		// GEOMETRY ROUTES
		api.POST("/geometry/circle", geometryHandler.CreateCircle)
		api.PUT("/geometry/circle/:id", geometryHandler.UpdateCircle)
		api.POST("/geometry/polygon", geometryHandler.CreatePolygon)
		api.PUT("/geometry/polygon/:id", geometryHandler.UpdatePolygon)
		api.POST("/geometry/rectangle", geometryHandler.CreateRectangle)
		api.PUT("/geometry/rectangle/:id", geometryHandler.UpdateRectangle)
		api.GET("/geometry", geometryHandler.GetAllGeometries)
		api.DELETE("/geometry/:id", geometryHandler.DeleteGeometry)

		// EQUIPMENT LIBRARY ROUTES
		equipment := api.Group("/equipment")
		{
			equipment.GET("",     equipmentHandler.ListEquipment)
			equipment.GET("/:id", equipmentHandler.GetEquipment)
		}

		// FREQUENCY MANAGEMENT ROUTES
		frequency := api.Group("/frequency")
		{
			// Unit routes
			frequency.GET("/units", frequencyHandler.GetUserUnits)
			frequency.GET("/units/majcom", frequencyHandler.GetMajcomUnits)
			frequency.GET("/units/:id/subordinates", frequencyHandler.GetSubordinateUnits)
			frequency.POST("/units", frequencyHandler.CreateUnit)
			frequency.PUT("/units/:id", frequencyHandler.UpdateUnit)
			frequency.DELETE("/units/:id", frequencyHandler.DeleteUnit)

			// Frequency assignment routes
			frequency.GET("/assignments", frequencyHandler.GetUserFrequencyAssignments)
			frequency.GET("/assignments/expiring", frequencyHandler.GetExpiringFrequencies)
			frequency.GET("/assignments/proposals", frequencyHandler.GetProposalAssignments)
			frequency.GET("/assignments/submitted", frequencyHandler.GetSubmittedAssignments)
			frequency.GET("/assignments/five-year-review", frequencyHandler.GetFiveYearReviews)
			frequency.GET("/reviewers", frequencyHandler.GetWorkboxes)
			frequency.POST("/assignments", frequencyHandler.CreateFrequencyAssignment)
			frequency.GET("/assignments/conflicts", frequencyHandler.CheckFrequencyConflicts)
			frequency.GET("/assignments/in-range", frequencyHandler.GetAssignmentsInRange)
			frequency.PUT("/assignments/:id/elevate", frequencyHandler.ElevateAssignment)
			frequency.PUT("/assignments/:id/retract", frequencyHandler.RetractAssignment)
			frequency.PUT("/assignments/bulk-route", frequencyHandler.BulkRouteAssignments)
			frequency.PUT("/assignments/:id/coordinations", frequencyHandler.SetCoordinations)
			frequency.GET("/assignments/:id/comments", frequencyHandler.GetComments)
			frequency.POST("/assignments/:id/comments", frequencyHandler.AddComment)

			// Frequency request routes
			frequency.GET("/requests", frequencyHandler.GetUserRequests)
			frequency.GET("/requests/pending", frequencyHandler.GetPendingRequests)
			frequency.POST("/requests", frequencyHandler.SubmitFrequencyRequest)
			frequency.DELETE("/requests/:id", frequencyHandler.DeleteFrequencyRequest)
			frequency.PUT("/requests/:id/resubmit", frequencyHandler.ResubmitFrequencyRequest)
			frequency.PUT("/requests/:id/retract", frequencyHandler.RetractFrequencyRequest)
			frequency.PUT("/requests/:id/review", frequencyHandler.ReviewFrequencyRequest)
			frequency.POST("/requests/:id/approve", frequencyHandler.ApproveFrequencyRequest)
			frequency.GET("/requests/:id/comments", frequencyHandler.GetRequestComments)
			frequency.POST("/requests/:id/comments", frequencyHandler.AddRequestComment)
			frequency.PUT("/requests/:id/coordinations", frequencyHandler.SetRequestCoordinations)

			// Admin cleanup routes
			frequency.POST("/cleanup-orphaned", frequencyHandler.CleanupOrphanedAssignments)
		}

		// ADMIN USER MANAGEMENT ROUTES
		admin := api.Group("/admin")
		{
			admin.GET("/users", adminHandler.ListUsers)
			admin.POST("/users", adminHandler.CreateUser)
			admin.PUT("/users/:id", adminHandler.UpdateUser)
			admin.DELETE("/users/:id", adminHandler.DeactivateUser)
			admin.GET("/account-requests", adminHandler.ListAccountRequests)
			admin.POST("/account-requests/:id/approve", adminHandler.ApproveAccountRequest)
			admin.POST("/account-requests/:id/deny", adminHandler.DenyAccountRequest)
			admin.GET("/units/search", adminHandler.SearchUnits)
		}

		// MANUFACTURER ROUTES
		api.GET("/manufacturers", manufacturerHandler.GetAll)
		api.POST("/manufacturers", manufacturerHandler.Create)
		api.PUT("/manufacturers/:id", manufacturerHandler.Update)
		api.DELETE("/manufacturers/:id", manufacturerHandler.Delete)

		// INSTALLATION ROUTES
		api.GET("/installations", installationHandler.GetAll)
		api.POST("/installations", installationHandler.Create)
		api.PUT("/installations/:id", installationHandler.Update)
		api.DELETE("/installations/:id", installationHandler.Delete)

		api.GET("/serial-numbers", serialNumberHandler.GetAvailable)
		api.GET("/serial-numbers/next", serialNumberHandler.GetNext)
		api.GET("/serial-numbers/my-pool", serialNumberHandler.GetMyPool)
		api.GET("/serial-numbers/allocations", serialNumberHandler.GetAllocations)
		api.GET("/serial-numbers/pool", serialNumberHandler.GetUnitPool)
		api.POST("/serial-numbers/allocate", serialNumberHandler.Allocate)
		api.POST("/serial-numbers/sub-allocate", serialNumberHandler.SubAllocate)
		api.DELETE("/serial-numbers/sub-allocate", serialNumberHandler.Reclaim)
		api.DELETE("/serial-numbers/allocations/:unit_id", serialNumberHandler.Deallocate)

		api.GET("/sfaf-lookup", sfafLookupHandler.GetAll)
		api.POST("/sfaf-lookup", sfafLookupHandler.Create)
		api.PUT("/sfaf-lookup/:id", sfafLookupHandler.Update)
		api.DELETE("/sfaf-lookup/:id", sfafLookupHandler.Delete)
	}

	serverAddr := fmt.Sprintf(":%s", appConfig.Server.Port)

	logger.Info("🚀 SFAF Plotter server starting",
		zap.String("address", serverAddr),
		zap.String("mode", appConfig.Server.GinMode),
	)
	logger.Info("📊 Database connection established",
		zap.String("host", appConfig.Database.Host),
		zap.String("database", appConfig.Database.DBName),
	)
	logger.Info("🗺️ MC4EB Publication 7, Change 1 compliance enabled")

	if err := r.Run(serverAddr); err != nil {
		logger.Fatal("Failed to start server", zap.Error(err))
	}
}
