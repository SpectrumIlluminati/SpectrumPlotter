package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"sfaf-plotter/models"

	"github.com/google/uuid"
)

type JSONStorage struct {
	mutex      sync.RWMutex
	dataDir    string
	markers    map[uuid.UUID]*models.Marker   // ✅ UUID keys match model
	sfafs      map[uuid.UUID]*models.SFAF     // ✅ UUID keys match model
	geometries map[uuid.UUID]*models.Geometry // ADD GEOMETRY STORAGE

}

type JSONData struct {
	Markers    map[string]*models.Marker   `json:"markers"` // ✅ String for JSON serialization
	SFAFs      map[string]*models.SFAF     `json:"sfafs"`   // ✅ String for JSON serialization
	Version    string                      `json:"version"`
	Geometries map[string]*models.Geometry `json:"geometries"`
}

func NewJSONStorage(dataDir string) (*JSONStorage, error) {
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create data directory: %w", err)
	}

	storage := &JSONStorage{
		dataDir: dataDir,
		markers: make(map[uuid.UUID]*models.Marker), // ✅ UUID maps
		sfafs:   make(map[uuid.UUID]*models.SFAF),   // ✅ UUID maps
	}

	if err := storage.loadFromFile(); err != nil {
		fmt.Printf("Starting with fresh data: %v\n", err)
	}

	return storage, nil
}

func (js *JSONStorage) loadFromFile() error {
	filePath := filepath.Join(js.dataDir, "data.json")
	data, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}

	var jsonData JSONData
	if err := json.Unmarshal(data, &jsonData); err != nil {
		return err
	}

	// Convert string maps back to UUID maps
	js.markers = make(map[uuid.UUID]*models.Marker)
	for idStr, marker := range jsonData.Markers {
		if id, err := uuid.Parse(idStr); err == nil {
			js.markers[id] = marker
		}
	}

	js.sfafs = make(map[uuid.UUID]*models.SFAF)
	for idStr, sfaf := range jsonData.SFAFs {
		if id, err := uuid.Parse(idStr); err == nil {
			js.sfafs[id] = sfaf
		}
	}

	return nil
}

func (js *JSONStorage) saveToFile() error {
	filePath := filepath.Join(js.dataDir, "data.json")

	// Convert UUID maps to string maps for JSON serialization
	stringMarkers := make(map[string]*models.Marker)
	for id, marker := range js.markers {
		stringMarkers[id.String()] = marker
	}

	stringSFAFs := make(map[string]*models.SFAF)
	for id, sfaf := range js.sfafs {
		stringSFAFs[id.String()] = sfaf
	}

	jsonData := JSONData{
		Markers: stringMarkers,
		SFAFs:   stringSFAFs,
		Version: "1.0",
	}

	data, err := json.MarshalIndent(jsonData, "", "  ")
	if err != nil {
		return err
	}

	tempFile := filePath + ".tmp"
	if err := os.WriteFile(tempFile, data, 0644); err != nil {
		return err
	}
	return os.Rename(tempFile, filePath)
}

// Marker storage methods
func (js *JSONStorage) SaveMarker(marker *models.Marker) error {
	js.mutex.Lock()
	defer js.mutex.Unlock()

	js.markers[marker.ID] = marker
	return js.saveToFile()
}

func (js *JSONStorage) GetMarker(id string) (*models.Marker, error) {
	markerID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid marker ID format: %v", err)
	}

	js.mutex.RLock()
	defer js.mutex.RUnlock()

	marker, exists := js.markers[markerID]
	if !exists {
		return nil, fmt.Errorf("marker not found")
	}
	return marker, nil
}

func (js *JSONStorage) GetAllMarkers() ([]*models.Marker, error) {
	js.mutex.RLock()
	defer js.mutex.RUnlock()

	markers := make([]*models.Marker, 0, len(js.markers))
	for _, marker := range js.markers {
		markers = append(markers, marker)
	}
	return markers, nil
}

func (js *JSONStorage) UpdateMarker(id string, marker *models.Marker) error {
	// Convert string ID to UUID
	markerUUID, err := uuid.Parse(id)
	if err != nil {
		return fmt.Errorf("invalid marker ID format: %v", err)
	}

	js.mutex.Lock()
	defer js.mutex.Unlock()

	if _, exists := js.markers[markerUUID]; !exists { // ✅ UUID key lookup
		return fmt.Errorf("marker not found")
	}

	js.markers[markerUUID] = marker // ✅ UUID key assignment
	return js.saveToFile()
}

func (js *JSONStorage) DeleteMarker(id string) error {
	markerID, err := uuid.Parse(id)
	if err != nil {
		return fmt.Errorf("invalid marker ID format: %v", err)
	}

	js.mutex.Lock()
	defer js.mutex.Unlock()
	delete(js.markers, markerID)
	return js.saveToFile()
}

// SFAF storage methods
func (js *JSONStorage) SaveSFAF(sfaf *models.SFAF) error {
	js.mutex.Lock()
	defer js.mutex.Unlock()
	js.sfafs[sfaf.ID] = sfaf // ✅ Now compatible: uuid.UUID to uuid.UUID
	return js.saveToFile()
}

func (js *JSONStorage) GetSFAF(id string) (*models.SFAF, error) {
	// Convert string API input to UUID for internal map lookup
	sfafID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid SFAF ID format: %v", err)
	}

	js.mutex.RLock()
	defer js.mutex.RUnlock()

	sfaf, exists := js.sfafs[sfafID] // ✅ Now using UUID key
	if !exists {
		return nil, fmt.Errorf("SFAF not found")
	}
	return sfaf, nil
}

func (js *JSONStorage) GetSFAFByMarkerID(markerID string) (*models.SFAF, error) {
	// Convert string input to UUID for comparison
	markerUUID, err := uuid.Parse(markerID)
	if err != nil {
		return nil, fmt.Errorf("invalid marker ID format: %v", err)
	}

	js.mutex.RLock()
	defer js.mutex.RUnlock()

	fmt.Printf("🔍 Searching for SFAF with MarkerID: %s\n", markerID)
	fmt.Printf("🔍 Total SFAF records in storage: %d\n", len(js.sfafs))

	for sfafID, sfaf := range js.sfafs {
		fmt.Printf("🔍 SFAF ID: %s, MarkerID: %s\n", sfafID, sfaf.MarkerID)
		if sfaf.MarkerID == markerUUID { // ✅ Now comparing UUID to UUID
			fmt.Printf("✅ MATCH FOUND!\n")
			return sfaf, nil
		}
	}

	fmt.Printf("❌ No match found for MarkerID: %s\n", markerID)
	return nil, fmt.Errorf("SFAF not found for marker")
}

// Backup functionality for later SQLite migration
func (js *JSONStorage) ExportBackup(backupPath string) error {
	js.mutex.RLock()
	defer js.mutex.RUnlock()

	// Convert UUID maps to string maps for JSON serialization
	stringMarkers := make(map[string]*models.Marker)
	for id, marker := range js.markers {
		stringMarkers[id.String()] = marker // ✅ UUID to string conversion
	}

	stringSFAFs := make(map[string]*models.SFAF)
	for id, sfaf := range js.sfafs {
		stringSFAFs[id.String()] = sfaf // ✅ UUID to string conversion
	}

	jsonData := JSONData{
		Markers: stringMarkers, // ✅ Compatible types
		SFAFs:   stringSFAFs,   // ✅ Compatible types
		Version: "1.0",
	}

	data, err := json.MarshalIndent(jsonData, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(backupPath, data, 0644)
}

func (js *JSONStorage) DeleteSFAF(id string) error {
	sfafID, err := uuid.Parse(id)
	if err != nil {
		return fmt.Errorf("invalid SFAF ID: %v", err)
	}

	js.mutex.Lock()
	defer js.mutex.Unlock()
	delete(js.sfafs, sfafID)
	return js.saveToFile()
}

// geometry operations for JSONStorage
func (js *JSONStorage) SaveGeometry(geometry *models.Geometry) error {
	js.mutex.Lock()
	defer js.mutex.Unlock()
	js.geometries[geometry.ID] = geometry
	return js.saveToFile()
}

func (js *JSONStorage) GetGeometry(id string) (*models.Geometry, error) {
	geometryID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid geometry ID format: %v", err)
	}

	js.mutex.RLock()
	defer js.mutex.RUnlock()

	if geometry, exists := js.geometries[geometryID]; exists {
		return geometry, nil
	}
	return nil, fmt.Errorf("geometry not found")
}

func (js *JSONStorage) GetAllGeometries() ([]*models.Geometry, error) {
	js.mutex.RLock()
	defer js.mutex.RUnlock()

	geometries := make([]*models.Geometry, 0, len(js.geometries))
	for _, geometry := range js.geometries {
		geometries = append(geometries, geometry)
	}
	return geometries, nil
}

func (js *JSONStorage) DeleteGeometry(id string) error { // THE MISSING METHOD
	geometryID, err := uuid.Parse(id)
	if err != nil {
		return fmt.Errorf("invalid geometry ID format: %v", err)
	}

	js.mutex.Lock()
	defer js.mutex.Unlock()
	delete(js.geometries, geometryID)
	return js.saveToFile()
}
