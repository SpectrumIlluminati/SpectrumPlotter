// marker_service.go
package services

import (
	"fmt"
	"sfaf-plotter/models"
	"sfaf-plotter/repositories"

	"github.com/google/uuid"
)

type MarkerService struct {
	markerRepo    *repositories.MarkerRepository
	iracNotesRepo *repositories.IRACNotesRepository
	serialService *SerialService
	coordService  *CoordinateService
}

func NewMarkerService(
	markerRepo *repositories.MarkerRepository,
	iracNotesRepo *repositories.IRACNotesRepository,
	serialService *SerialService,
	coordService *CoordinateService,
) *MarkerService {
	return &MarkerService{
		markerRepo:    markerRepo,
		iracNotesRepo: iracNotesRepo,
		serialService: serialService,
		coordService:  coordService,
	}
}

func (ms *MarkerService) CreateMarker(req models.CreateMarkerRequest) (*models.MarkerResponse, error) {
	marker := &models.Marker{
		ID:          uuid.New(),
		Serial:      ms.serialService.GenerateSerial(),
		Latitude:    req.Latitude,
		Longitude:   req.Longitude,
		Frequency:   req.Frequency,
		Notes:       req.Notes,
		MarkerType:  req.MarkerType,
		IsDraggable: true,
	}

	if marker.MarkerType == "" {
		marker.MarkerType = "manual"
	}

	err := ms.markerRepo.Create(marker)
	if err != nil {
		return nil, fmt.Errorf("failed to create marker: %w", err)
	}

	return &models.MarkerResponse{
		Success: true,
		Message: "Marker created successfully",
		Marker:  marker,
	}, nil
}

func (ms *MarkerService) GetAllMarkers() (*models.MarkersResponse, error) {
	markers, err := ms.markerRepo.GetAll()
	if err != nil {
		return nil, fmt.Errorf("failed to get markers: %w", err)
	}

	return &models.MarkersResponse{
		Success: true,
		Message: "Markers retrieved successfully",
		Markers: markers,
	}, nil
}

func (ms *MarkerService) GetMarker(id string) (*models.MarkerResponse, error) {
	markerID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid marker ID: %w", err)
	}

	marker, err := ms.markerRepo.GetByID(markerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get marker: %w", err)
	}

	return &models.MarkerResponse{
		Success: true,
		Message: "Marker retrieved successfully",
		Marker:  marker,
	}, nil
}

func (ms *MarkerService) UpdateMarker(id string, req models.UpdateMarkerRequest) (*models.MarkerResponse, error) {
	markerID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid marker ID: %w", err)
	}

	updates := make(map[string]interface{})

	if req.Latitude != nil {
		updates["latitude"] = *req.Latitude
	}
	if req.Longitude != nil {
		updates["longitude"] = *req.Longitude
	}
	if req.Frequency != nil {
		updates["frequency"] = *req.Frequency
	}
	if req.Notes != nil {
		updates["notes"] = *req.Notes
	}
	if req.MarkerType != nil {
		updates["marker_type"] = *req.MarkerType
	}
	if req.IsDraggable != nil {
		updates["is_draggable"] = *req.IsDraggable
	}

	err = ms.markerRepo.Update(markerID, updates)
	if err != nil {
		return nil, fmt.Errorf("failed to update marker: %w", err)
	}

	// Get updated marker
	marker, err := ms.markerRepo.GetByID(markerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated marker: %w", err)
	}

	return &models.MarkerResponse{
		Success: true,
		Message: "Marker updated successfully",
		Marker:  marker,
	}, nil
}

func (ms *MarkerService) DeleteMarker(id string) error {
	markerID, err := uuid.Parse(id)
	if err != nil {
		return fmt.Errorf("invalid marker ID: %w", err)
	}

	err = ms.markerRepo.Delete(markerID)
	if err != nil {
		return fmt.Errorf("failed to delete marker: %w", err)
	}

	return nil
}

func (ms *MarkerService) DeleteAllMarkers() error {
	err := ms.markerRepo.DeleteAll()
	if err != nil {
		return fmt.Errorf("failed to delete all markers: %w", err)
	}

	return nil
}

// IRAC Notes management methods
func (ms *MarkerService) GetIRACNotes() ([]models.IRACNote, error) {
	return ms.iracNotesRepo.GetAllNotes()
}

func (ms *MarkerService) GetIRACNotesByCategory(category string) ([]models.IRACNote, error) {
	return ms.iracNotesRepo.GetNotesByCategory(category)
}

func (ms *MarkerService) SearchIRACNotes(searchTerm string) ([]models.IRACNote, error) {
	return ms.iracNotesRepo.SearchNotes(searchTerm)
}

// services/marker_service.go (continued)
func (ms *MarkerService) AddIRACNoteToMarker(markerID, noteCode string, fieldNumber, occurrenceNumber int) error {
	id, err := uuid.Parse(markerID)
	if err != nil {
		return fmt.Errorf("invalid marker ID: %w", err)
	}

	return ms.markerRepo.AddIRACNote(id, noteCode, fieldNumber, occurrenceNumber)
}

func (ms *MarkerService) RemoveIRACNoteFromMarker(markerID, noteCode string, fieldNumber, occurrenceNumber int) error {
	id, err := uuid.Parse(markerID)
	if err != nil {
		return fmt.Errorf("invalid marker ID: %w", err)
	}

	return ms.markerRepo.RemoveIRACNote(id, noteCode, fieldNumber, occurrenceNumber)
}
