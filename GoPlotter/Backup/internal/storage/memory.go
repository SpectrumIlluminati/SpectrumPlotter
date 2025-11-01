package storage

import (
    "fmt"
    "sync"
    
    "sfaf-plotter/internal/models"
)

type Storage interface {
    // Marker operations
    SaveMarker(marker *models.Marker) error
    GetMarker(id string) (*models.Marker, error)
    GetAllMarkers() ([]*models.Marker, error)
    UpdateMarker(id string, marker *models.Marker) error
    DeleteMarker(id string) error
    
    // SFAF operations
    SaveSFAF(sfaf *models.SFAF) error
    GetSFAF(id string) (*models.SFAF, error)
    GetSFAFByMarkerID(markerID string) (*models.SFAF, error)
    
    // Geometry operations (for future)
    SaveGeometry(geometry interface{}) error
}

// Keep your existing MemoryStorage implementation and add the new methods
type MemoryStorage struct {
    markers map[string]*models.Marker
    sfafs   map[string]*models.SFAF
    mutex   sync.RWMutex
}

func NewMemoryStorage() *MemoryStorage {
    return &MemoryStorage{
        markers: make(map[string]*models.Marker),
        sfafs:   make(map[string]*models.SFAF),
    }
}

// ... (keep existing marker methods) ...

// Add SFAF methods to MemoryStorage
func (ms *MemoryStorage) SaveSFAF(sfaf *models.SFAF) error {
    ms.mutex.Lock()
    defer ms.mutex.Unlock()
    
    ms.sfafs[sfaf.ID] = sfaf
    return nil
}

func (ms *MemoryStorage) GetSFAF(id string) (*models.SFAF, error) {
    ms.mutex.RLock()
    defer ms.mutex.RUnlock()
    
    sfaf, exists := ms.sfafs[id]
    if !exists {
        return nil, fmt.Errorf("SFAF not found")
    }
    return sfaf, nil
}

func (ms *MemoryStorage) GetSFAFByMarkerID(markerID string) (*models.SFAF, error) {
    ms.mutex.RLock()
    defer ms.mutex.RUnlock()
    
    for _, sfaf := range ms.sfafs {
        if sfaf.MarkerID == markerID {
            return sfaf, nil
        }
    }
    return nil, fmt.Errorf("SFAF not found for marker")
}

func (ms *MemoryStorage) SaveGeometry(geometry interface{}) error {
    // Placeholder
    return nil
}