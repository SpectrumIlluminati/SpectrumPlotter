package storage

import (
	"fmt"
	"sync"

	"sfaf-plotter/models"

	"github.com/google/uuid"
)

// Keep your existing MemoryStorage implementation and add the new methods
type MemoryStorage struct {
	mutex      sync.RWMutex
	markers    map[uuid.UUID]*models.Marker   // ✅ Consistent with Marker.ID
	geometries map[uuid.UUID]*models.Geometry // ✅ Consistent with Geometry.ID
	sfafs      map[uuid.UUID]*models.SFAF     // ✅ Consistent with SFAF.ID
	iracNotes  map[string]*models.IRACNote    // String keys for code-based lookup
}

func NewMemoryStorage() *MemoryStorage {
	return &MemoryStorage{
		markers: make(map[uuid.UUID]*models.Marker), // ✅ UUID keys
		sfafs:   make(map[uuid.UUID]*models.SFAF),   // ✅ UUID keys
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
	sfafID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid SFAF ID format: %v", err)
	}

	ms.mutex.RLock()
	defer ms.mutex.RUnlock()

	if sfaf, exists := ms.sfafs[sfafID]; exists {
		return sfaf, nil
	}
	return nil, fmt.Errorf("SFAF not found")
}

func (ms *MemoryStorage) GetSFAFByMarkerID(markerID string) (*models.SFAF, error) {
	// Convert string input to UUID for comparison
	markerUUID, err := uuid.Parse(markerID)
	if err != nil {
		return nil, fmt.Errorf("invalid marker ID format: %v", err)
	}

	ms.mutex.RLock()
	defer ms.mutex.RUnlock()

	for _, sfaf := range ms.sfafs {
		if sfaf.MarkerID == markerUUID { // ✅ Now comparing UUID to UUID
			return sfaf, nil
		}
	}
	return nil, fmt.Errorf("SFAF not found for marker")
}

func (ms *MemoryStorage) SaveGeometry(geometry interface{}) error {
	// Placeholder
	return nil
}
