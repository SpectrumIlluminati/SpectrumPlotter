// handlers/frequency_handler.go
package handlers

import (
	"net/http"
	"sfaf-plotter/models"
	"sfaf-plotter/services"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type FrequencyHandler struct {
	service *services.FrequencyService
}

func NewFrequencyHandler(service *services.FrequencyService) *FrequencyHandler {
	return &FrequencyHandler{service: service}
}

// ============================================
// Unit Endpoints
// ============================================

// GetUserUnits returns all units assigned to the current user
// GET /api/frequency/units
func (h *FrequencyHandler) GetUserUnits(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	// Admins see all units
	var units []models.UnitWithAssignments
	var err error

	if atLeast(c, "admin") {
		units, err = h.service.GetAllUnitsWithAssignments()
	} else {
		units, err = h.service.GetUserUnitsWithAssignments(userID.(uuid.UUID))
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"units": units,
		"count": len(units),
	})
}

// GET /api/frequency/units/majcom — returns MAJCOM-type units for serial allocation UI
func (h *FrequencyHandler) GetMajcomUnits(c *gin.Context) {
	units, err := h.service.GetMajcomUnits()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"units": units, "count": len(units)})
}

// GET /api/frequency/units/:id/subordinates — returns child units of the given unit
func (h *FrequencyHandler) GetSubordinateUnits(c *gin.Context) {
	parentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid unit id"})
		return
	}
	units, err := h.service.GetSubordinateUnits(parentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"units": units, "count": len(units)})
}

// CreateUnit creates a new unit (admin only)
// POST /api/frequency/units
func (h *FrequencyHandler) CreateUnit(c *gin.Context) {
	_, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	if !atLeast(c, "admin") {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
		return
	}

	var input models.Unit
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	unit, err := h.service.CreateUnit(&input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "unit created successfully",
		"unit":    unit,
	})
}

// UpdateUnit updates an existing unit (admin only)
// PUT /api/frequency/units/:id
func (h *FrequencyHandler) UpdateUnit(c *gin.Context) {
	_, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	if !atLeast(c, "admin") {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
		return
	}

	unitID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid unit id"})
		return
	}

	var input models.Unit
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set the ID from URL parameter
	input.ID = unitID

	unit, err := h.service.UpdateUnit(&input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "unit updated successfully",
		"unit":    unit,
	})
}

// DeleteUnit deletes a unit (admin only)
// DELETE /api/frequency/units/:id
func (h *FrequencyHandler) DeleteUnit(c *gin.Context) {
	_, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	if !atLeast(c, "admin") {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
		return
	}

	unitID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid unit id"})
		return
	}

	err = h.service.DeleteUnit(unitID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "unit deleted successfully",
	})
}

// ============================================
// Frequency Assignment Endpoints
// ============================================

// GetUserFrequencyAssignments returns all frequency assignments for user's units
// GET /api/frequency/assignments
func (h *FrequencyHandler) GetUserFrequencyAssignments(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	assignments, err := h.service.GetUserFrequencyAssignments(userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"assignments": assignments,
		"count":       len(assignments),
	})
}

// GetExpiringFrequencies returns frequencies expiring within specified days
// GET /api/frequency/assignments/expiring?days=30
func (h *FrequencyHandler) GetExpiringFrequencies(c *gin.Context) {
	daysStr := c.DefaultQuery("days", "30")
	days, err := strconv.Atoi(daysStr)
	if err != nil || days < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid days parameter"})
		return
	}

	assignments, err := h.service.GetExpiringFrequencies(days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"assignments": assignments,
		"count":       len(assignments),
		"days":        days,
	})
}

// CreateFrequencyAssignment creates a new frequency assignment (s6/admin only)
// POST /api/frequency/assignments
func (h *FrequencyHandler) CreateFrequencyAssignment(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	var input models.CreateFrequencyAssignmentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify user has permission to manage this unit
	canManage, err := h.service.CanUserManageUnit(userID.(uuid.UUID), input.UnitID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !canManage {
		c.JSON(http.StatusForbidden, gin.H{"error": "you do not have permission to manage this unit"})
		return
	}

	assignment, err := h.service.CreateFrequencyAssignment(&input, userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "frequency assignment created successfully",
		"assignment": assignment,
	})
}

// CheckFrequencyConflicts checks for potential conflicts
// GET /api/frequency/assignments/conflicts?frequency=123.450&unit_id=...&radius=50
func (h *FrequencyHandler) CheckFrequencyConflicts(c *gin.Context) {
	frequencyStr := c.Query("frequency")
	unitIDStr := c.Query("unit_id")
	radiusStr := c.DefaultQuery("radius", "50")

	if frequencyStr == "" || unitIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "frequency and unit_id are required"})
		return
	}

	frequency, err := strconv.ParseFloat(frequencyStr, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid frequency value"})
		return
	}

	unitID, err := uuid.Parse(unitIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid unit_id"})
		return
	}

	radius, err := strconv.ParseFloat(radiusStr, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid radius value"})
		return
	}

	conflicts, err := h.service.CheckFrequencyConflicts(frequency, unitID, radius)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"conflicts": conflicts,
		"count":     len(conflicts),
		"has_conflicts": len(conflicts) > 0,
	})
}

// GetAssignmentsInRange returns all active assignments in a frequency band.
// Used by the ISM deconfliction panel in the approval modal.
// GET /api/frequency/assignments/in-range?min=30.000&max=88.000
func (h *FrequencyHandler) GetAssignmentsInRange(c *gin.Context) {
	if !atLeast(c, "ism") {
		c.JSON(http.StatusForbidden, gin.H{"error": "ISM-level access or higher required"})
		return
	}
	minStr := c.Query("min")
	maxStr := c.Query("max")
	if minStr == "" || maxStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "min and max (MHz) are required"})
		return
	}
	minMhz, err := strconv.ParseFloat(minStr, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid min value"})
		return
	}
	maxMhz, err := strconv.ParseFloat(maxStr, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid max value"})
		return
	}
	if minMhz >= maxMhz {
		c.JSON(http.StatusBadRequest, gin.H{"error": "min must be less than max"})
		return
	}
	assignments, err := h.service.GetAssignmentsInRange(minMhz, maxMhz)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"assignments": assignments,
		"count":       len(assignments),
		"band_min":    minMhz,
		"band_max":    maxMhz,
	})
}

// ============================================
// Frequency Request Endpoints
// ============================================

// GetUserRequests returns all frequency requests submitted by the user
// GET /api/frequency/requests
func (h *FrequencyHandler) GetUserRequests(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	requests, err := h.service.GetUserRequestsWithDetails(userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"requests": requests,
		"count":    len(requests),
	})
}

// GetPendingRequests returns all pending/under review requests (s6/admin only)
// GET /api/frequency/requests/pending
func (h *FrequencyHandler) GetPendingRequests(c *gin.Context) {
	if !atLeast(c, "ism") {
		c.JSON(http.StatusForbidden, gin.H{"error": "ISM-level access or higher required"})
		return
	}

	requests, err := h.service.GetPendingRequestsWithDetails()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"requests": requests,
		"count":    len(requests),
	})
}

// SubmitFrequencyRequest submits a new frequency request
// POST /api/frequency/requests
func (h *FrequencyHandler) SubmitFrequencyRequest(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	var input models.CreateFrequencyRequestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate dates
	if input.StartDate.IsZero() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "start_date is required"})
		return
	}

	if input.EndDate == nil && input.RequestType != "permanent" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "end_date is required for non-permanent requests"})
		return
	}

	if input.Justification == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "justification is required"})
		return
	}

	request, err := h.service.SubmitFrequencyRequest(&input, userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "frequency request submitted successfully",
		"request": request,
	})
}

// DeleteFrequencyRequest permanently deletes a cancelled or denied request.
// DELETE /api/frequency/requests/:id
func (h *FrequencyHandler) DeleteFrequencyRequest(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	requestID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request id"})
		return
	}
	isAdmin := atLeast(c, "admin")
	if err := h.service.DeleteFrequencyRequest(requestID, userID.(uuid.UUID), isAdmin); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "request deleted"})
}

// ResubmitFrequencyRequest updates a denied request and resets it to pending.
// PUT /api/frequency/requests/:id/resubmit
func (h *FrequencyHandler) ResubmitFrequencyRequest(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	requestID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request id"})
		return
	}
	var input models.CreateFrequencyRequestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	request, err := h.service.ResubmitFrequencyRequest(requestID, userID.(uuid.UUID), input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "request resubmitted", "request": request})
}

// RetractFrequencyRequest cancels the caller's own pending/under-review request.
// PUT /api/frequency/requests/:id/retract
func (h *FrequencyHandler) RetractFrequencyRequest(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	requestID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request id"})
		return
	}
	request, err := h.service.RetractFrequencyRequest(requestID, userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "request retracted", "request": request})
}

// ReviewFrequencyRequest updates the status of a frequency request (s6/admin only)
// PUT /api/frequency/requests/:id/review
func (h *FrequencyHandler) ReviewFrequencyRequest(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	if !atLeast(c, "ism") {
		c.JSON(http.StatusForbidden, gin.H{"error": "ISM-level access or higher required"})
		return
	}

	requestID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request id"})
		return
	}

	var input struct {
		Status string `json:"status" binding:"required"`
		Notes  string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	request, err := h.service.ReviewFrequencyRequest(requestID, userID.(uuid.UUID), input.Status, input.Notes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "request reviewed successfully",
		"request": request,
	})
}

// ApproveFrequencyRequest approves a request and creates assignment (admin only)
// POST /api/frequency/requests/:id/approve
func (h *FrequencyHandler) ApproveFrequencyRequest(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	if !atLeast(c, "ism") {
		c.JSON(http.StatusForbidden, gin.H{"error": "ISM-level access or higher required"})
		return
	}

	requestID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request id"})
		return
	}

	var assignmentInput models.CreateFrequencyAssignmentInput
	if err := c.ShouldBindJSON(&assignmentInput); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// A and T are final assignments — only Agency, NTIA, or Admin may create them.
	// P and S are proposals — ISM and above may create them.
	recordType := assignmentInput.SFAFRecordType
	if recordType == "" {
		recordType = "A"
	}
	if recordType == "A" || recordType == "T" {
		if !atLeast(c, "agency") {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Only Agency, NTIA, or Admin may create final assignments (A/T). Use record type P or S to submit a proposal.",
			})
			return
		}
	}

	request, assignment, err := h.service.ApproveAndCreateAssignment(
		requestID,
		userID.(uuid.UUID),
		&assignmentInput,
	)
	if err != nil {
		_ = c.Error(err) // surfaces in middleware log
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "request approved and assignment created",
		"request":    request,
		"assignment": assignment,
	})
}

// GetSubmittedAssignments returns all assignments created by the current user.
// GET /api/frequency/assignments/submitted
func (h *FrequencyHandler) GetSubmittedAssignments(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	result, err := h.service.GetSubmittedAssignments(userID.(uuid.UUID))
	if err != nil {
		_ = c.Error(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"assignments": result})
}

// GetProposalAssignments returns active P/S proposals visible to the requesting user.
// command/combatant_command: only proposals routed to them (or unrouted).
// agency/ntia/admin: all proposals.
// GET /api/frequency/assignments/proposals
func (h *FrequencyHandler) GetProposalAssignments(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	if !atLeast(c, "command") {
		c.JSON(http.StatusForbidden, gin.H{"error": "command-level access or higher required"})
		return
	}

	role, _ := c.Get("role")
	roleStr, _ := role.(string)

	proposals, err := h.service.GetProposalAssignments(userID.(uuid.UUID), roleStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"proposals": proposals})
}

// RetractAssignment deactivates a P/S proposal created by the caller (ISM+).
// PUT /api/frequency/assignments/:id/retract
func (h *FrequencyHandler) RetractAssignment(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	if !atLeast(c, "ism") {
		c.JSON(http.StatusForbidden, gin.H{"error": "ism-level access or higher required"})
		return
	}
	assignmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid assignment id"})
		return
	}
	resetCount, err := h.service.RetractProposalAssignment(assignmentID, userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "proposal retracted", "requests_returned": resetCount})
}

// GetFiveYearReviews returns permanent assignments due for 5-year review scoped
// to the requesting ISM's installation (admins see all).
// GET /api/frequency/assignments/five-year-review
func (h *FrequencyHandler) GetFiveYearReviews(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	if !atLeast(c, "ism") {
		c.JSON(http.StatusForbidden, gin.H{"error": "ism-level access or higher required"})
		return
	}
	role, _ := c.Get("role")
	roleStr, _ := role.(string)
	result, err := h.service.GetFiveYearReviews(userID.(uuid.UUID), roleStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"assignments": result})
}

// GetWorkboxes returns the static list of named workboxes available as routing destinations.
// GET /api/frequency/reviewers  (path kept for backward compatibility)
func (h *FrequencyHandler) GetWorkboxes(c *gin.Context) {
	workboxes := []string{
		// Agency
		"AFSMO",
		// AF MAJCOMs
		"ACC ISM",
		"AETC ISM",
		"AFDW ISM",
		"AFGSC ISM",
		"AFMC ISM",
		"AFRC ISM",
		"AFSOC ISM",
		"AFSPC ISM",
		"AMC ISM",
		"ANG ISM",
		"PACAF ISM",
		"USAFE ISM",
		// Area Frequency Coordinators
		"GAFC",
		"NAFC",
		"CENTCOM AFC",
		"EUCOM AFC",
		"INDOPACOM AFC",
		"NORTHCOM AFC",
		"SOCOM AFC",
		// Joint/Other
		"FORSCOM AFC",
		"USAREUR AFC",
		"NAVEUR AFC",
		"NAVPAC AFC",
	}
	c.JSON(http.StatusOK, gin.H{"workboxes": workboxes})
}

// ElevateAssignment promotes a P→A or S→T final assignment (agency-level and above)
// PUT /api/frequency/assignments/:id/elevate
func (h *FrequencyHandler) ElevateAssignment(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	if !atLeast(c, "agency") {
		c.JSON(http.StatusForbidden, gin.H{"error": "agency-level access or higher required to finalize assignments"})
		return
	}

	assignmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid assignment id"})
		return
	}

	var body struct {
		Notes string `json:"notes"`
	}
	_ = c.ShouldBindJSON(&body)

	assignment, err := h.service.ElevateAssignment(assignmentID, userID.(uuid.UUID), body.Notes)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	finalType := map[string]string{"A": "Permanent Assignment", "T": "Temporary Assignment"}[assignment.SFAFRecordType]
	c.JSON(http.StatusOK, gin.H{
		"message":    "proposal elevated to " + finalType,
		"assignment": assignment,
	})
}

// BulkRouteAssignments sets routed_to on multiple P/S proposals at once.
// ISMs may only route proposals they own; admins bypass the ownership check.
// PUT /api/frequency/assignments/bulk-route
func (h *FrequencyHandler) BulkRouteAssignments(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	if !atLeast(c, "ism") {
		c.JSON(http.StatusForbidden, gin.H{"error": "ISM-level access or higher required"})
		return
	}

	var body struct {
		AssignmentIDs []string `json:"assignment_ids" binding:"required"`
		RoutedTo      *string  `json:"routed_to"` // workbox name, null = unroute
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len(body.AssignmentIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no assignment_ids provided"})
		return
	}

	ids := make([]uuid.UUID, 0, len(body.AssignmentIDs))
	for _, s := range body.AssignmentIDs {
		id, err := uuid.Parse(s)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid assignment id: " + s})
			return
		}
		ids = append(ids, id)
	}

	var workbox *string
	if body.RoutedTo != nil && *body.RoutedTo != "" {
		workbox = body.RoutedTo
	}

	isAdmin := atLeast(c, "admin")
	count, err := h.service.BulkRouteAssignments(ids, workbox, userID.(uuid.UUID), isAdmin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"updated": count})
}

// SetCoordinations replaces the lateral coordination workboxes for a proposal.
// PUT /api/frequency/assignments/:id/coordinations
func (h *FrequencyHandler) SetCoordinations(c *gin.Context) {
	if !atLeast(c, "ism") {
		c.JSON(http.StatusForbidden, gin.H{"error": "ism-level access required"})
		return
	}
	assignmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid assignment id"})
		return
	}
	var body struct {
		Workboxes []string `json:"workboxes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if body.Workboxes == nil {
		body.Workboxes = []string{}
	}
	if err := h.service.SetCoordinations(assignmentID, body.Workboxes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"workboxes": body.Workboxes})
}

// AddComment adds a comment to a proposal's comment log.
// POST /api/frequency/assignments/:id/comments
func (h *FrequencyHandler) AddComment(c *gin.Context) {
	if !atLeast(c, "ism") {
		c.JSON(http.StatusForbidden, gin.H{"error": "ism-level access required"})
		return
	}
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	assignmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid assignment id"})
		return
	}
	var body struct {
		Workbox string `json:"workbox" binding:"required"`
		Body    string `json:"body"    binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	comment, err := h.service.AddComment(assignmentID, userID.(uuid.UUID), body.Workbox, body.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, comment)
}

// GetComments returns the comment log for a proposal.
// GET /api/frequency/assignments/:id/comments
func (h *FrequencyHandler) GetComments(c *gin.Context) {
	if !atLeast(c, "ism") {
		c.JSON(http.StatusForbidden, gin.H{"error": "ism-level access required"})
		return
	}
	assignmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid assignment id"})
		return
	}
	comments, err := h.service.GetComments(assignmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"comments": comments})
}

// AddRequestComment adds a status-log comment to a pending frequency request.
// POST /api/frequency/requests/:id/comments
func (h *FrequencyHandler) AddRequestComment(c *gin.Context) {
	if !atLeast(c, "ism") {
		c.JSON(http.StatusForbidden, gin.H{"error": "ism-level access required"})
		return
	}
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	requestID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request id"})
		return
	}
	var body struct {
		Workbox string `json:"workbox" binding:"required"`
		Body    string `json:"body"    binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	comment, err := h.service.AddRequestComment(requestID, userID.(uuid.UUID), body.Workbox, body.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, comment)
}

// GetRequestComments returns the status log for a pending frequency request.
// GET /api/frequency/requests/:id/comments
func (h *FrequencyHandler) GetRequestComments(c *gin.Context) {
	if !atLeast(c, "ism") {
		c.JSON(http.StatusForbidden, gin.H{"error": "ism-level access required"})
		return
	}
	requestID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request id"})
		return
	}
	comments, err := h.service.GetRequestComments(requestID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"comments": comments})
}

// SetRequestCoordinations sets lateral coordination workboxes for a pending request.
// PUT /api/frequency/requests/:id/coordinations
func (h *FrequencyHandler) SetRequestCoordinations(c *gin.Context) {
	if !atLeast(c, "ism") {
		c.JSON(http.StatusForbidden, gin.H{"error": "ism-level access required"})
		return
	}
	requestID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request id"})
		return
	}
	var body struct {
		Workboxes []string `json:"workboxes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if body.Workboxes == nil {
		body.Workboxes = []string{}
	}
	if err := h.service.SetRequestCoordinations(requestID, body.Workboxes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"workboxes": body.Workboxes})
}

// ============================================
// Helper middleware for frequency routes
// ============================================

// CleanupOrphanedAssignments removes frequency assignments that don't have corresponding SFAF records
// POST /api/frequency/cleanup-orphaned (admin only)
func (h *FrequencyHandler) CleanupOrphanedAssignments(c *gin.Context) {
	if !atLeast(c, "admin") {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
		return
	}

	deleted, err := h.service.CleanupOrphanedAssignments()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Cleanup completed successfully",
		"deleted": deleted,
	})
}
