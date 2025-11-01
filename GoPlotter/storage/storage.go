package storage

import "sfaf-plotter/models"

type Storage interface {
	// Marker operations (if not already defined)
	SaveMarker(marker *models.Marker) error
	GetMarker(id string) (*models.Marker, error)
	GetAllMarkers() ([]*models.Marker, error)
	UpdateMarker(id string, marker *models.Marker) error
	DeleteMarker(id string) error

	// SFAF operations (MISSING - ADD THESE)
	SaveSFAF(sfaf *models.SFAF) error
	GetSFAF(id string) (*models.SFAF, error)
	GetSFAFByMarkerID(markerID string) (*models.SFAF, error)
	DeleteSFAF(id string) error

	// Geometry operations (for GeometryService)
	SaveGeometry(geometry *models.Geometry) error
	GetGeometry(id string) (*models.Geometry, error)
	GetAllGeometries() ([]*models.Geometry, error)
	DeleteGeometry(id string) error

	// Export functionality
	ExportBackup(backupPath string) error
}
