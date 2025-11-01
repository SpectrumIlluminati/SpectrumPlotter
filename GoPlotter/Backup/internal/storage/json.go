package storage

import (
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"
    "sync"
    
    "sfaf-plotter/internal/models"
)

type JSONStorage struct {
    dataDir string
    markers map[string]*models.Marker
    sfafs   map[string]*models.SFAF
    mutex   sync.RWMutex
}

type JSONData struct {
    Markers map[string]*models.Marker `json:"markers"`
    SFAFs   map[string]*models.SFAF   `json:"sfafs"`
    Version string                    `json:"version"` // For future migrations
}

func NewJSONStorage(dataDir string) (*JSONStorage, error) {
    // Create data directory if it doesn't exist
    if err := os.MkdirAll(dataDir, 0755); err != nil {
        return nil, fmt.Errorf("failed to create data directory: %w", err)
    }
    
    storage := &JSONStorage{
        dataDir: dataDir,
        markers: make(map[string]*models.Marker),
        sfafs:   make(map[string]*models.SFAF),
    }
    
    // Load existing data
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
    
    js.markers = jsonData.Markers
    js.sfafs = jsonData.SFAFs
    
    if js.markers == nil {
        js.markers = make(map[string]*models.Marker)
    }
    if js.sfafs == nil {
        js.sfafs = make(map[string]*models.SFAF)
    }
    
    return nil
}

func (js *JSONStorage) saveToFile() error {
    filePath := filepath.Join(js.dataDir, "data.json")
    
    jsonData := JSONData{
        Markers: js.markers,
        SFAFs:   js.sfafs,
        Version: "1.0", // For future SQLite migration
    }
    
    data, err := json.MarshalIndent(jsonData, "", "  ")
    if err != nil {
        return err
    }
    
    // Atomic write: write to temp file, then rename
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
    js.mutex.RLock()
    defer js.mutex.RUnlock()
    
    marker, exists := js.markers[id]
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
    js.mutex.Lock()
    defer js.mutex.Unlock()
    
    if _, exists := js.markers[id]; !exists {
        return fmt.Errorf("marker not found")
    }
    
    js.markers[id] = marker
    return js.saveToFile()
}

func (js *JSONStorage) DeleteMarker(id string) error {
    js.mutex.Lock()
    defer js.mutex.Unlock()
    
    delete(js.markers, id)
    return js.saveToFile()
}

// SFAF storage methods
func (js *JSONStorage) SaveSFAF(sfaf *models.SFAF) error {
    js.mutex.Lock()
    defer js.mutex.Unlock()
    
    js.sfafs[sfaf.ID] = sfaf
    return js.saveToFile()
}

func (js *JSONStorage) GetSFAF(id string) (*models.SFAF, error) {
    js.mutex.RLock()
    defer js.mutex.RUnlock()
    
    sfaf, exists := js.sfafs[id]
    if !exists {
        return nil, fmt.Errorf("SFAF not found")
    }
    return sfaf, nil
}

// In your JSONStorage GetSFAFByMarkerID method, add debug:
func (js *JSONStorage) GetSFAFByMarkerID(markerID string) (*models.SFAF, error) {
    js.mutex.RLock()
    defer js.mutex.RUnlock()
    
    fmt.Printf("🔍 Searching for SFAF with MarkerID: %s\n", markerID)
    fmt.Printf("🔍 Total SFAF records in storage: %d\n", len(js.sfafs))
    
    for sfafID, sfaf := range js.sfafs {
        fmt.Printf("🔍 SFAF ID: %s, MarkerID: %s\n", sfafID, sfaf.MarkerID)
        if sfaf.MarkerID == markerID {
            fmt.Printf("✅ MATCH FOUND!\n")
            return sfaf, nil
        }
    }
    
    fmt.Printf("❌ No match found for MarkerID: %s\n", markerID)
    return nil, fmt.Errorf("SFAF not found for marker")
}

func (js *JSONStorage) SaveGeometry(geometry interface{}) error {
    // Placeholder for future geometry storage
    return nil
}

// Backup functionality for later SQLite migration
func (js *JSONStorage) ExportBackup(backupPath string) error {
    js.mutex.RLock()
    defer js.mutex.RUnlock()
    
    jsonData := JSONData{
        Markers: js.markers,
        SFAFs:   js.sfafs,
        Version: "1.0",
    }
    
    data, err := json.MarshalIndent(jsonData, "", "  ")
    if err != nil {
        return err
    }
    
    return os.WriteFile(backupPath, data, 0644)
}