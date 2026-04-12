// services/frequency_service.go
package services

import (
	"fmt"
	"sfaf-plotter/models"
	"sfaf-plotter/repositories"
	"time"

	"github.com/google/uuid"
)

type FrequencyService struct {
	repo        *repositories.FrequencyRepository
	userRepo    *repositories.UserRepository
	installRepo *repositories.InstallationRepository
}

func NewFrequencyService(repo *repositories.FrequencyRepository, userRepo *repositories.UserRepository, installRepo *repositories.InstallationRepository) *FrequencyService {
	return &FrequencyService{repo: repo, userRepo: userRepo, installRepo: installRepo}
}

var roleLevels = map[string]int{
	"operator":          1,
	"ism":               2,
	"command":           3,
	"combatant_command": 4,
	"agency":            5,
	"ntia":              6,
	"admin":             7,
}

// ============================================
// Unit Management
// ============================================

func (s *FrequencyService) CreateUnit(input *models.Unit) (*models.Unit, error) {
	// Validate unit code is unique
	existing, _ := s.repo.GetUnitByCode(input.UnitCode)
	if existing != nil {
		return nil, fmt.Errorf("unit code already exists: %s", input.UnitCode)
	}

	input.IsActive = true
	err := s.repo.CreateUnit(input)
	if err != nil {
		return nil, fmt.Errorf("failed to create unit: %w", err)
	}

	return input, nil
}

// UpdateUnit updates an existing unit
func (s *FrequencyService) UpdateUnit(input *models.Unit) (*models.Unit, error) {
	// Check if unit exists
	existing, err := s.repo.GetUnitByID(input.ID)
	if err != nil {
		return nil, fmt.Errorf("unit not found: %w", err)
	}

	// If unit code is being changed, check it's unique
	if input.UnitCode != existing.UnitCode {
		codeCheck, _ := s.repo.GetUnitByCode(input.UnitCode)
		if codeCheck != nil {
			return nil, fmt.Errorf("unit code already exists: %s", input.UnitCode)
		}
	}

	err = s.repo.UpdateUnit(input)
	if err != nil {
		return nil, fmt.Errorf("failed to update unit: %w", err)
	}

	return input, nil
}

// DeleteUnit deletes a unit
func (s *FrequencyService) DeleteUnit(unitID uuid.UUID) error {
	// Check if unit has active frequency assignments
	assignments, err := s.repo.GetUnitFrequencyAssignments(unitID)
	if err != nil {
		return fmt.Errorf("failed to check unit assignments: %w", err)
	}

	if len(assignments) > 0 {
		return fmt.Errorf("cannot delete unit with active frequency assignments")
	}

	err = s.repo.DeleteUnit(unitID)
	if err != nil {
		return fmt.Errorf("failed to delete unit: %w", err)
	}

	return nil
}

func (s *FrequencyService) GetUserUnitsWithAssignments(userID uuid.UUID) ([]models.UnitWithAssignments, error) {
	units, err := s.repo.GetUserUnits(userID)
	if err != nil {
		return nil, err
	}

	result := make([]models.UnitWithAssignments, 0, len(units))
	for _, unit := range units {
		assignments, err := s.repo.GetUnitFrequencyAssignments(unit.ID)
		if err != nil {
			return nil, err
		}

		// Get pending requests for this unit
		unitRequests, err := s.repo.GetUnitFrequencyRequests(unit.ID)
		if err != nil {
			return nil, err
		}

		pendingRequests := make([]models.FrequencyRequest, 0)
		for _, req := range unitRequests {
			if req.Status == "pending" || req.Status == "under_review" {
				pendingRequests = append(pendingRequests, req)
			}
		}

		// Get member count
		members, _ := s.repo.GetUnitMembers(unit.ID)

		result = append(result, models.UnitWithAssignments{
			Unit:                 &unit,
			FrequencyAssignments: assignments,
			PendingRequests:      pendingRequests,
			MemberCount:          len(members),
		})
	}

	return result, nil
}

func (s *FrequencyService) GetMajcomUnits() ([]models.Unit, error) {
	return s.repo.GetMajcomUnits()
}

func (s *FrequencyService) GetSubordinateUnits(parentUnitID uuid.UUID) ([]models.Unit, error) {
	return s.repo.GetSubordinateUnits(parentUnitID)
}

func (s *FrequencyService) GetAllUnitsWithAssignments() ([]models.UnitWithAssignments, error) {
	units, err := s.repo.GetAllUnits()
	if err != nil {
		return nil, err
	}

	result := make([]models.UnitWithAssignments, 0, len(units))
	for _, unit := range units {
		assignments, err := s.repo.GetUnitFrequencyAssignments(unit.ID)
		if err != nil {
			return nil, err
		}

		// Get pending requests for this unit
		unitRequests, err := s.repo.GetUnitFrequencyRequests(unit.ID)
		if err != nil {
			return nil, err
		}

		pendingRequests := make([]models.FrequencyRequest, 0)
		for _, req := range unitRequests {
			if req.Status == "pending" || req.Status == "under_review" {
				pendingRequests = append(pendingRequests, req)
			}
		}

		// Get member count
		members, _ := s.repo.GetUnitMembers(unit.ID)

		result = append(result, models.UnitWithAssignments{
			Unit:                 &unit,
			FrequencyAssignments: assignments,
			PendingRequests:      pendingRequests,
			MemberCount:          len(members),
		})
	}

	return result, nil
}

// ============================================
// Frequency Assignment Management
// ============================================

func (s *FrequencyService) CreateFrequencyAssignment(
	input *models.CreateFrequencyAssignmentInput,
	createdBy uuid.UUID,
) (*models.FrequencyAssignment, error) {
	// Validate unit exists
	_, err := s.repo.GetUnitByID(input.UnitID)
	if err != nil {
		return nil, fmt.Errorf("unit not found: %w", err)
	}

	// strPtr converts empty strings to nil (stored as NULL)
	strPtr := func(s string) *string {
		if s == "" {
			return nil
		}
		return &s
	}
	// defaultStr returns fallback when s is empty
	defaultStr := func(s, fallback string) string {
		if s == "" {
			return fallback
		}
		return s
	}
	_ = defaultStr // used below

	// Default sfaf_record_type to 'A' if not supplied
	recordType := input.SFAFRecordType
	if recordType == "" {
		recordType = "A"
	}

	// Create assignment
	assignment := &models.FrequencyAssignment{
		UnitID:              input.UnitID,
		Serial:              strPtr(input.Serial),
		SFAFRecordType:      recordType,
		Frequency:           input.Frequency,
		FrequencyMhz:        input.FrequencyMhz,
		AssignmentType:      input.AssignmentType,
		Purpose:             strPtr(input.Purpose),
		NetName:             strPtr(input.NetName),
		Callsign:            strPtr(input.Callsign),
		EmissionDesignator:  strPtr(input.EmissionDesignator),
		Bandwidth:           strPtr(input.Bandwidth),
		PowerWatts:          input.PowerWatts,
		AuthorizedRadiusKm:  input.AuthorizedRadiusKm,
		AssignmentDate:      input.AssignmentDate,
		ExpirationDate:      input.ExpirationDate,
		AssignmentAuthority: strPtr(input.AssignmentAuthority),
		AuthorizationNumber: strPtr(input.AuthorizationNumber),
		Priority:            defaultStr(input.Priority, "routine"),
		IsEncrypted:         input.IsEncrypted,
		EncryptionType:      strPtr(input.EncryptionType),
		Classification:      input.Classification,
		Notes:               strPtr(input.Notes),
		IsActive:            true,
		CreatedBy:           &createdBy,
		RoutedToWorkbox:     input.RoutedToWorkbox,
		PoolSerial:          strPtr(input.PoolSerial),
	}

	err = s.repo.CreateFrequencyAssignment(assignment)
	if err != nil {
		return nil, fmt.Errorf("failed to create frequency assignment: %w", err)
	}

	return assignment, nil
}

func (s *FrequencyService) GetUserFrequencyAssignments(userID uuid.UUID) ([]models.FrequencyAssignmentWithDetails, error) {
	assignments, err := s.repo.GetUserUnitFrequencyAssignments(userID)
	if err != nil {
		return nil, err
	}

	result := make([]models.FrequencyAssignmentWithDetails, 0, len(assignments))
	for _, assignment := range assignments {
		unit, _ := s.repo.GetUnitByID(assignment.UnitID)

		result = append(result, models.FrequencyAssignmentWithDetails{
			Assignment: &assignment,
			Unit:       unit,
		})
	}

	return result, nil
}

func (s *FrequencyService) GetExpiringFrequencies(days int) ([]models.FrequencyAssignmentWithDetails, error) {
	assignments, err := s.repo.GetExpiringAssignments(days)
	if err != nil {
		return nil, err
	}

	result := make([]models.FrequencyAssignmentWithDetails, 0, len(assignments))
	for _, assignment := range assignments {
		unit, _ := s.repo.GetUnitByID(assignment.UnitID)

		result = append(result, models.FrequencyAssignmentWithDetails{
			Assignment: &assignment,
			Unit:       unit,
		})
	}

	return result, nil
}

// ============================================
// Frequency Request Management
// ============================================

func (s *FrequencyService) SubmitFrequencyRequest(
	input *models.CreateFrequencyRequestInput,
	requestedBy uuid.UUID,
) (*models.FrequencyRequest, error) {
	// Validate unit exists and user has access
	_, err := s.repo.GetUnitByID(input.UnitID)
	if err != nil {
		return nil, fmt.Errorf("unit not found: %w", err)
	}

	// Validate start date is not in the past
	if input.StartDate.Before(time.Now().Truncate(24 * time.Hour)) {
		return nil, fmt.Errorf("start date cannot be in the past")
	}

	// strPtr converts a non-empty string to a pointer; empty string becomes nil (stored as NULL).
	strPtr := func(s string) *string {
		if s == "" {
			return nil
		}
		return &s
	}

	// Create request
	request := &models.FrequencyRequest{
		UnitID:               input.UnitID,
		RequestedBy:          requestedBy,
		RequestType:          input.RequestType,
		Status:               "pending",
		Priority:             input.Priority,
		RequestedFrequency:   strPtr(input.RequestedFrequency),
		FrequencyRangeMin:    input.FrequencyRangeMin,
		FrequencyRangeMax:    input.FrequencyRangeMax,
		Purpose:              input.Purpose,
		NetName:              strPtr(input.NetName),
		Callsign:             strPtr(input.Callsign),
		AssignmentType:       strPtr(input.AssignmentType),
		EmissionDesignator:   strPtr(input.EmissionDesignator),
		Bandwidth:            strPtr(input.Bandwidth),
		PowerWatts:           input.PowerWatts,
		AntennaMakeModel:     strPtr(input.AntennaMakeModel),
		AntennaType:          strPtr(input.AntennaType),
		AntennaGainDbi:       input.AntennaGainDbi,
		AntennaPolarization:  strPtr(input.AntennaPolarization),
		AntennaOrientation:   strPtr(input.AntennaOrientation),
		TxHorizBeamwidthDeg: input.TxHorizBeamwidthDeg,
		TxVertBeamwidthDeg:  input.TxVertBeamwidthDeg,
		RxHorizBeamwidthDeg: input.RxHorizBeamwidthDeg,
		RxVertBeamwidthDeg:  input.RxVertBeamwidthDeg,
		CoverageArea:              strPtr(input.CoverageArea),
		OperatingAreaGeoJSON:      input.OperatingAreaGeoJSON,
		AuthorizedRadiusKm:        input.AuthorizedRadiusKm,
		OperatingAreaAppliesTo:    input.OperatingAreaAppliesTo,
		StartDate:            input.StartDate,
		EndDate:              input.EndDate,
		HoursOfOperation:     strPtr(input.HoursOfOperation),
		NumTransmitters:      input.NumTransmitters,
		NumReceivers:         input.NumReceivers,
		IsEncrypted:          input.IsEncrypted,
		EncryptionType:       strPtr(input.EncryptionType),
		Classification:       input.Classification,
		RequiresCoordination: input.RequiresCoordination,
		CoordinationNotes:    strPtr(input.CoordinationNotes),
		Justification:        input.Justification,
		StopBuzzer:           strPtr(input.StopBuzzer),
		MissionImpact:        strPtr(input.MissionImpact),
	}

	err = s.repo.CreateFrequencyRequest(request)
	if err != nil {
		return nil, fmt.Errorf("failed to create frequency request: %w", err)
	}

	return request, nil
}

func (s *FrequencyService) ReviewFrequencyRequest(
	requestID uuid.UUID,
	reviewedBy uuid.UUID,
	status string,
	notes string,
) (*models.FrequencyRequest, error) {
	// Validate status
	validStatuses := map[string]bool{
		"under_review": true,
		"approved":     true,
		"denied":       true,
	}
	if !validStatuses[status] {
		return nil, fmt.Errorf("invalid status: %s", status)
	}

	// Get existing request
	_, err := s.repo.GetFrequencyRequestByID(requestID)
	if err != nil {
		return nil, err
	}

	// Update status
	err = s.repo.UpdateFrequencyRequestStatus(requestID, status, &reviewedBy, notes, "", "")
	if err != nil {
		return nil, err
	}

	// Get updated request
	return s.repo.GetFrequencyRequestByID(requestID)
}

func (s *FrequencyService) ApproveAndCreateAssignment(
	requestID uuid.UUID,
	approvedBy uuid.UUID,
	assignmentInput *models.CreateFrequencyAssignmentInput,
) (*models.FrequencyRequest, *models.FrequencyAssignment, error) {
	// Get the request
	request, err := s.repo.GetFrequencyRequestByID(requestID)
	if err != nil {
		return nil, nil, err
	}

	if request.Status == "approved" {
		return nil, nil, fmt.Errorf("request already approved")
	}

	// Create the frequency assignment
	assignment, err := s.CreateFrequencyAssignment(assignmentInput, approvedBy)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create assignment: %w", err)
	}

	// Update request status
	err = s.repo.ApproveFrequencyRequest(requestID, approvedBy, assignment.ID)
	if err != nil {
		// Rollback assignment if request update fails
		s.repo.DeactivateFrequencyAssignment(assignment.ID)
		return nil, nil, fmt.Errorf("failed to approve request: %w", err)
	}

	// Get updated request
	updatedRequest, _ := s.repo.GetFrequencyRequestByID(requestID)
	return updatedRequest, assignment, nil
}

func (s *FrequencyService) ResubmitFrequencyRequest(requestID, userID uuid.UUID, input models.CreateFrequencyRequestInput) (*models.FrequencyRequest, error) {
	return s.repo.ResubmitFrequencyRequest(requestID, userID, input)
}

func (s *FrequencyService) GetUserRequestsWithDetails(userID uuid.UUID) ([]models.FrequencyRequestWithDetails, error) {
	requests, err := s.repo.GetUserFrequencyRequests(userID)
	if err != nil {
		return nil, err
	}

	result := make([]models.FrequencyRequestWithDetails, 0, len(requests))
	for _, request := range requests {
		unit, _ := s.repo.GetUnitByID(request.UnitID)
		requester, _ := s.userRepo.GetUserByID(request.RequestedBy)

		result = append(result, models.FrequencyRequestWithDetails{
			Request:     &request,
			Unit:        unit,
			RequestedBy: requester,
		})
	}

	return result, nil
}

func (s *FrequencyService) GetPendingRequestsWithDetails() ([]models.FrequencyRequestWithDetails, error) {
	requests, err := s.repo.GetPendingRequests()
	if err != nil {
		return nil, err
	}

	result := make([]models.FrequencyRequestWithDetails, 0, len(requests))
	for _, request := range requests {
		unit, _ := s.repo.GetUnitByID(request.UnitID)
		requester, _ := s.userRepo.GetUserByID(request.RequestedBy)

		var install *models.Installation
		if unit != nil && unit.InstallationID != nil && s.installRepo != nil {
			install, _ = s.installRepo.GetByID(*unit.InstallationID)
		}

		comments, _ := s.repo.GetRequestComments(request.ID)
		coordinated, _ := s.repo.GetRequestCoordinations(request.ID)

		result = append(result, models.FrequencyRequestWithDetails{
			Request:         &request,
			Unit:            unit,
			Installation:    install,
			RequestedBy:     requester,
			Comments:        comments,
			CoordinatedWith: coordinated,
		})
	}

	return result, nil
}

// ============================================
// Conflict Detection (Basic Implementation)
// ============================================

func (s *FrequencyService) CheckFrequencyConflicts(
	frequencyMhz float64,
	unitID uuid.UUID,
	radiusKm float64,
) ([]models.FrequencyAssignment, error) {
	// Simple frequency proximity check
	// In a real system, this would include geographic distance calculations
	minFreq := frequencyMhz - 0.025 // 25 kHz spacing
	maxFreq := frequencyMhz + 0.025

	query := &models.FrequencySearchQuery{
		MinFrequency:  &minFreq,
		MaxFrequency:  &maxFreq,
		ExcludeUnitID: &unitID,
	}

	return s.repo.SearchAvailableFrequencies(query)
}

// ============================================
// Authorization Helpers
// ============================================

func (s *FrequencyService) CanUserManageUnit(userID, unitID uuid.UUID) (bool, error) {
	units, err := s.repo.GetUserUnits(userID)
	if err != nil {
		return false, err
	}

	for _, unit := range units {
		if unit.ID == unitID {
			return true, nil
		}
	}

	return false, nil
}

// GetSubmittedAssignments returns all assignments created by the given user, enriched with unit and routed-to user.
func (s *FrequencyService) GetSubmittedAssignments(userID uuid.UUID) ([]models.FrequencyAssignmentWithDetails, error) {
	assignments, err := s.repo.GetSubmittedAssignments(userID)
	if err != nil {
		return nil, err
	}
	result := make([]models.FrequencyAssignmentWithDetails, 0, len(assignments))
	for _, a := range assignments {
		unit, _ := s.repo.GetUnitByID(a.UnitID)
		result = append(result, models.FrequencyAssignmentWithDetails{Assignment: &a, Unit: unit})
	}
	return result, nil
}

// GetProposalAssignments returns P/S proposals visible to the given user role.
func (s *FrequencyService) GetProposalAssignments(userID uuid.UUID, role string) ([]models.FrequencyAssignmentWithDetails, error) {
	level := roleLevels[role]
	assignments, err := s.repo.GetProposalAssignments(userID, level)
	if err != nil {
		return nil, err
	}
	result := make([]models.FrequencyAssignmentWithDetails, 0, len(assignments))
	for _, a := range assignments {
		unit, _ := s.repo.GetUnitByID(a.UnitID)
		detail := models.FrequencyAssignmentWithDetails{Assignment: &a, Unit: unit}
		if a.CreatedBy != nil {
			detail.CreatedBy, _ = s.userRepo.GetUserByID(*a.CreatedBy)
		}
		detail.CoordinatedWith, _ = s.repo.GetCoordinations(a.ID)
		detail.Comments, _ = s.repo.GetComments(a.ID)
		result = append(result, detail)
	}
	return result, nil
}

// SetCoordinations replaces the lateral coordination workboxes for a proposal.
func (s *FrequencyService) SetCoordinations(assignmentID uuid.UUID, workboxes []string) error {
	return s.repo.SetCoordinations(assignmentID, workboxes)
}

// AddComment adds a comment to the proposal's comment log.
func (s *FrequencyService) AddComment(assignmentID uuid.UUID, callerID uuid.UUID, workbox, body string) (*models.AssignmentComment, error) {
	c := &models.AssignmentComment{
		AssignmentID: assignmentID,
		CreatedBy:    &callerID,
		Workbox:      workbox,
		Body:         body,
	}
	if err := s.repo.AddComment(c); err != nil {
		return nil, err
	}
	if user, err := s.userRepo.GetUserByID(callerID); err == nil && user != nil {
		c.AuthorName = user.FullName
	}
	return c, nil
}

// GetComments returns the comment log for a proposal.
func (s *FrequencyService) GetComments(assignmentID uuid.UUID) ([]models.AssignmentComment, error) {
	return s.repo.GetComments(assignmentID)
}

// AddRequestComment adds a comment to a pending request's status log.
func (s *FrequencyService) AddRequestComment(requestID uuid.UUID, callerID uuid.UUID, workbox, body string) (*models.RequestComment, error) {
	c := &models.RequestComment{
		RequestID: requestID,
		CreatedBy: &callerID,
		Workbox:   workbox,
		Body:      body,
	}
	if err := s.repo.AddRequestComment(c); err != nil {
		return nil, err
	}
	if user, err := s.userRepo.GetUserByID(callerID); err == nil && user != nil {
		c.AuthorName = user.FullName
	}
	return c, nil
}

// GetRequestComments returns the status log for a pending request.
func (s *FrequencyService) GetRequestComments(requestID uuid.UUID) ([]models.RequestComment, error) {
	return s.repo.GetRequestComments(requestID)
}

// SetRequestCoordinations replaces the lateral coordination workboxes for a pending request.
func (s *FrequencyService) SetRequestCoordinations(requestID uuid.UUID, workboxes []string) error {
	return s.repo.SetRequestCoordinations(requestID, workboxes)
}

// GetRequestCoordinations returns the coordinated workboxes for a pending request.
func (s *FrequencyService) GetRequestCoordinations(requestID uuid.UUID) ([]string, error) {
	return s.repo.GetRequestCoordinations(requestID)
}

// GetAssignmentsInRange returns all active assignments in the given MHz band.
func (s *FrequencyService) GetAssignmentsInRange(minMhz, maxMhz float64) ([]models.FrequencyAssignment, error) {
	return s.repo.GetAssignmentsInRange(minMhz, maxMhz)
}

// GetReviewers returns active users who can review/elevate proposals (command and above).
func (s *FrequencyService) GetReviewers() ([]*models.User, error) {
	return s.userRepo.GetUsersByRoles([]string{"command", "combatant_command", "agency", "ntia", "admin"})
}

// ElevateAssignment promotes a P→A or S→T final assignment (agency+ only)
func (s *FrequencyService) ElevateAssignment(assignmentID, elevatedBy uuid.UUID, notes string) (*models.FrequencyAssignment, error) {
	if err := s.repo.ElevateAssignment(assignmentID, elevatedBy, notes); err != nil {
		return nil, fmt.Errorf("failed to elevate assignment: %w", err)
	}
	return s.repo.GetFrequencyAssignmentByID(assignmentID)
}

// CleanupOrphanedAssignments removes frequency assignments that don't have corresponding SFAF records
func (s *FrequencyService) CleanupOrphanedAssignments() (int64, error) {
	return s.repo.CleanupOrphanedAssignments()
}

// RetractProposalAssignment deactivates a P/S proposal created by the caller.
// Returns the number of linked requests that were reset to pending.
func (s *FrequencyService) RetractProposalAssignment(assignmentID, createdBy uuid.UUID) (int64, error) {
	return s.repo.RetractProposalAssignment(assignmentID, createdBy)
}

// BulkRouteAssignments sets routed_to_workbox on the given P/S proposal IDs.
// ISMs may only route their own proposals; admins bypass the ownership check.
func (s *FrequencyService) BulkRouteAssignments(ids []uuid.UUID, workbox *string, callerID uuid.UUID, isAdmin bool) (int64, error) {
	var ownerID *uuid.UUID
	if !isAdmin {
		ownerID = &callerID
	}
	return s.repo.BulkRouteAssignments(ids, workbox, ownerID)
}

// DeleteFrequencyRequest permanently removes a cancelled/denied request.
func (s *FrequencyService) DeleteFrequencyRequest(requestID, requestedBy uuid.UUID, isAdmin bool) error {
	return s.repo.DeleteFrequencyRequest(requestID, requestedBy, isAdmin)
}

// RetractFrequencyRequest cancels a pending/under_review request, verifying
// the caller is the original requester.
func (s *FrequencyService) RetractFrequencyRequest(requestID, requestedBy uuid.UUID) (*models.FrequencyRequest, error) {
	if err := s.repo.RetractFrequencyRequest(requestID, requestedBy); err != nil {
		return nil, err
	}
	return s.repo.GetFrequencyRequestByID(requestID)
}

// GetFiveYearReviews returns permanent assignments due for 5-year review scoped to
// the requesting user's installation. Admins see all installations.
func (s *FrequencyService) GetFiveYearReviews(userID uuid.UUID, role string) ([]models.FrequencyAssignmentWithDetails, error) {
	user, err := s.userRepo.GetUserByID(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Admins see across all installations; ISMs are scoped to their installation.
	var installationID *uuid.UUID
	if roleLevels[role] < roleLevels["admin"] {
		installationID = user.InstallationID
	}

	assignments, err := s.repo.GetFiveYearReviews(installationID)
	if err != nil {
		return nil, err
	}

	result := make([]models.FrequencyAssignmentWithDetails, 0, len(assignments))
	for _, a := range assignments {
		unit, _ := s.repo.GetUnitByID(a.UnitID)
		result = append(result, models.FrequencyAssignmentWithDetails{Assignment: &a, Unit: unit})
	}
	return result, nil
}
