package storage

import (
	"encoding/json"
	"fmt"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	_ "modernc.org/sqlite" // Force pure Go SQLite driver

	"sfaf-plotter/internal/models"
)

type DatabaseStorage struct {
	db *gorm.DB
}

func NewDatabaseStorage(dbPath string) (*DatabaseStorage, error) {
	// Open SQLite with pure Go driver
	db, err := gorm.Open(sqlite.Open(dbPath+"?_pragma=foreign_keys(1)"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Auto-migrate tables
	err = db.AutoMigrate(
		&models.DBMarker{},
		&models.DBGeometry{},
		&models.DBSFAF{},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	return &DatabaseStorage{db: db}, nil
}

// Marker storage methods
func (ds *DatabaseStorage) SaveMarker(marker *models.Marker) error {
	dbMarker := &models.DBMarker{}
	dbMarker.FromMarker(marker)

	result := ds.db.Save(dbMarker)
	return result.Error
}

func (ds *DatabaseStorage) GetMarker(id string) (*models.Marker, error) {
	var dbMarker models.DBMarker
	result := ds.db.First(&dbMarker, "id = ?", id)
	if result.Error != nil {
		return nil, result.Error
	}

	return dbMarker.ToMarker(), nil
}

func (ds *DatabaseStorage) GetAllMarkers() ([]*models.Marker, error) {
	var dbMarkers []models.DBMarker
	result := ds.db.Find(&dbMarkers)
	if result.Error != nil {
		return nil, result.Error
	}

	markers := make([]*models.Marker, len(dbMarkers))
	for i, dbMarker := range dbMarkers {
		markers[i] = dbMarker.ToMarker()
	}

	return markers, nil
}

func (ds *DatabaseStorage) UpdateMarker(id string, marker *models.Marker) error {
	dbMarker := &models.DBMarker{}
	dbMarker.FromMarker(marker)

	result := ds.db.Where("id = ?", id).Updates(dbMarker)
	return result.Error
}

func (ds *DatabaseStorage) DeleteMarker(id string) error {
	result := ds.db.Delete(&models.DBMarker{}, "id = ?", id)
	return result.Error
}

// SFAF storage methods
func (ds *DatabaseStorage) SaveSFAF(sfaf *models.SFAF) error {
	// Convert fields map to JSON - this uses encoding/json
	fieldDataJSON, err := json.Marshal(sfaf.Fields)
	if err != nil {
		return err
	}

	dbSFAF := &models.DBSFAF{
		ID:        sfaf.ID,
		MarkerID:  sfaf.MarkerID,
		FieldData: string(fieldDataJSON),
		CreatedAt: sfaf.CreatedAt,
		UpdatedAt: sfaf.UpdatedAt,
	}

	result := ds.db.Save(dbSFAF)
	return result.Error
}

func (ds *DatabaseStorage) GetSFAF(id string) (*models.SFAF, error) {
	var dbSFAF models.DBSFAF
	result := ds.db.First(&dbSFAF, "id = ?", id)
	if result.Error != nil {
		return nil, result.Error
	}

	// Parse JSON fields - this also uses encoding/json
	var fields map[string]string
	if err := json.Unmarshal([]byte(dbSFAF.FieldData), &fields); err != nil {
		return nil, err
	}

	return &models.SFAF{
		ID:        dbSFAF.ID,
		MarkerID:  dbSFAF.MarkerID,
		Fields:    fields,
		CreatedAt: dbSFAF.CreatedAt,
		UpdatedAt: dbSFAF.UpdatedAt,
	}, nil
}

func (ds *DatabaseStorage) GetSFAFByMarkerID(markerID string) (*models.SFAF, error) {
	var dbSFAF models.DBSFAF
	result := ds.db.First(&dbSFAF, "marker_id = ?", markerID)
	if result.Error != nil {
		return nil, result.Error
	}

	var fields map[string]string
	if err := json.Unmarshal([]byte(dbSFAF.FieldData), &fields); err != nil {
		return nil, err
	}

	return &models.SFAF{
		ID:        dbSFAF.ID,
		MarkerID:  dbSFAF.MarkerID,
		Fields:    fields,
		CreatedAt: dbSFAF.CreatedAt,
		UpdatedAt: dbSFAF.UpdatedAt,
	}, nil
}

// Geometry storage (placeholder for now)
func (ds *DatabaseStorage) SaveGeometry(geometry interface{}) error {
	// Implementation depends on your geometry model structure
	// This is a placeholder
	return nil
}

// Close database connection
func (ds *DatabaseStorage) Close() error {
	if ds.db != nil {
		sqlDB, err := ds.db.DB()
		if err != nil {
			return err
		}
		return sqlDB.Close()
	}
	return nil
}
