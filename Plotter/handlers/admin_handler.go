// handlers/admin_handler.go
package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"sfaf-plotter/models"
	"sfaf-plotter/repositories"
	"sfaf-plotter/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AdminHandler struct {
	authService    *services.AuthService
	userRepo       *repositories.UserRepository
	accountReqRepo *repositories.AccountRequestRepository
	frequencyRepo  *repositories.FrequencyRepository
}

func NewAdminHandler(authService *services.AuthService, userRepo *repositories.UserRepository, accountReqRepo *repositories.AccountRequestRepository, frequencyRepo *repositories.FrequencyRepository) *AdminHandler {
	return &AdminHandler{
		authService:    authService,
		userRepo:       userRepo,
		accountReqRepo: accountReqRepo,
		frequencyRepo:  frequencyRepo,
	}
}

// roleLevel defines the permission tier for each system role.
// Higher values = more access.
// roleLevel defines the permission tier for each system role.
// Higher values = more access.
//
//	operator (1) → submit frequency requests
//	ism      (2) → submit + review frequency requests (Installation Spectrum Manager)
//	command  (3) → submit + review
//	combatant_command (4)
//	agency   (5)
//	ntia     (6)
//	admin    (7) → full access
var roleLevel = map[string]int{
	"operator":          1,
	"ism":               2,
	"command":           3,
	"combatant_command": 4,
	"agency":            5,
	"ntia":              6,
	"admin":             7,
}

// atLeast returns true if the request's role meets or exceeds the given minimum role.
func atLeast(c *gin.Context, minRole string) bool {
	role, _ := c.Get("role")
	roleStr, _ := role.(string)
	return roleLevel[roleStr] >= roleLevel[minRole]
}

func requireAdmin(c *gin.Context) bool {
	if !atLeast(c, "admin") {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
		return false
	}
	return true
}

var validRoles = map[string]bool{
	"admin":             true,
	"ntia":              true,
	"agency":            true,
	"combatant_command": true,
	"command":           true,
	"ism":               true,
	"operator":          true,
}

// ListUsers returns all users with installation and unit names.
// GET /api/admin/users
func (h *AdminHandler) ListUsers(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}
	users, err := h.userRepo.ListUsersWithDetails()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch users"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"users": users})
}

// CreateUser creates a new user account.
// POST /api/admin/users
func (h *AdminHandler) CreateUser(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	var req struct {
		Username         string  `json:"username" binding:"required"`
		Password         string  `json:"password" binding:"required"`
		Email            string  `json:"email" binding:"required"`
		FullName         string  `json:"full_name" binding:"required"`
		Organization     string  `json:"organization"`
		Role             string  `json:"role"`
		Phone            *string `json:"phone"`
		PhoneDSN         *string `json:"phone_dsn"`
		DefaultISMOffice *string `json:"default_ism_office"`
		ServiceBranch    *string `json:"service_branch"`
		PayGrade         *string `json:"pay_grade"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if req.Role == "" {
		req.Role = "operator"
	}
	if !validRoles[req.Role] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role"})
		return
	}

	user, err := h.authService.CreateUser(req.Username, req.Password, req.Email, req.FullName, req.Organization, req.Role, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Phone != nil && *req.Phone != "" {
		user.Phone = req.Phone
	}
	if req.PhoneDSN != nil && *req.PhoneDSN != "" {
		user.PhoneDSN = req.PhoneDSN
	}
	if (req.DefaultISMOffice != nil && *req.DefaultISMOffice != "") ||
		(req.ServiceBranch != nil && *req.ServiceBranch != "") ||
		(req.PayGrade != nil && *req.PayGrade != "") ||
		req.Phone != nil || req.PhoneDSN != nil {
		if req.DefaultISMOffice != nil {
			user.DefaultISMOffice = req.DefaultISMOffice
		}
		if req.ServiceBranch != nil {
			user.ServiceBranch = req.ServiceBranch
		}
		if req.PayGrade != nil {
			user.PayGrade = req.PayGrade
		}
		h.userRepo.UpdateUser(user)
	}

	c.JSON(http.StatusCreated, gin.H{"user": user})
}

// UpdateUser updates a user's info and/or role.
// PUT /api/admin/users/:id
func (h *AdminHandler) UpdateUser(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	user, err := h.userRepo.GetUserByID(id)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	var req struct {
		Email            string  `json:"email"`
		FullName         string  `json:"full_name"`
		Organization     string  `json:"organization"`
		Role             string  `json:"role"`
		IsActive         *bool   `json:"is_active"`
		Password         string  `json:"password"`
		Phone            *string `json:"phone"`
		PhoneDSN         *string `json:"phone_dsn"`
		DefaultISMOffice *string `json:"default_ism_office"`
		ServiceBranch    *string `json:"service_branch"`
		PayGrade         *string `json:"pay_grade"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if req.Email != "" {
		user.Email = req.Email
	}
	if req.FullName != "" {
		user.FullName = req.FullName
	}
	if req.Organization != "" {
		user.Organization = req.Organization
	}
	if req.Role != "" {
		if !validRoles[req.Role] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role"})
			return
		}
		user.Role = req.Role
	}
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}
	if req.Password != "" {
		hash, err := h.authService.HashPassword(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
			return
		}
		user.PasswordHash = &hash
	}
	if req.Phone != nil {
		if *req.Phone == "" {
			user.Phone = nil
		} else {
			user.Phone = req.Phone
		}
	}
	if req.PhoneDSN != nil {
		if *req.PhoneDSN == "" {
			user.PhoneDSN = nil
		} else {
			user.PhoneDSN = req.PhoneDSN
		}
	}
	if req.DefaultISMOffice != nil {
		if *req.DefaultISMOffice == "" {
			user.DefaultISMOffice = nil
		} else {
			user.DefaultISMOffice = req.DefaultISMOffice
		}
	}
	if req.ServiceBranch != nil {
		if *req.ServiceBranch == "" {
			user.ServiceBranch = nil
		} else {
			user.ServiceBranch = req.ServiceBranch
		}
	}
	if req.PayGrade != nil {
		if *req.PayGrade == "" {
			user.PayGrade = nil
		} else {
			user.PayGrade = req.PayGrade
		}
	}

	if err := h.userRepo.UpdateUser(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

// DeactivateUser disables a user account (soft delete).
// DELETE /api/admin/users/:id
func (h *AdminHandler) DeactivateUser(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	// Prevent self-deactivation
	currentUserID, _ := c.Get("user_id")
	if fmt.Sprintf("%v", currentUserID) == id.String() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot deactivate your own account"})
		return
	}

	if err := h.userRepo.SetUserActive(id, false); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to deactivate user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "user deactivated"})
}

// ListAccountRequests returns all account requests, optionally filtered by status.
// GET /api/admin/account-requests?status=pending
func (h *AdminHandler) ListAccountRequests(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}
	status := c.Query("status")
	reqs, err := h.accountReqRepo.List(status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch requests"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"requests": reqs})
}

// ApproveAccountRequest creates a user account from a pending request.
// POST /api/admin/account-requests/:id/approve
func (h *AdminHandler) ApproveAccountRequest(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request ID"})
		return
	}

	req, err := h.accountReqRepo.GetByID(id)
	if err != nil || req == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "request not found"})
		return
	}
	if req.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "request already reviewed"})
		return
	}

	var body struct {
		TempPassword   string     `json:"temp_password"`
		Notes          string     `json:"notes"`
		CreateNewUnit  bool       `json:"create_new_unit"`
		NewUnitName    string     `json:"new_unit_name"`
		NewUnitCode    string     `json:"new_unit_code"`
		OverrideUnitID *uuid.UUID `json:"override_unit_id"`
	}
	c.ShouldBindJSON(&body)

	// Generate a password if admin didn't provide one
	password := body.TempPassword
	if password == "" {
		b := make([]byte, 8)
		rand.Read(b)
		password = hex.EncodeToString(b)
	}

	user, err := h.authService.CreateUser(req.Username, password, req.Email, req.FullName, req.Organization, req.RequestedRole, req.InstallationID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to create user: " + err.Error()})
		return
	}

	// Get reviewer ID once
	var reviewerID *uuid.UUID
	if rid, ok := c.Get("userID"); ok {
		if uid, ok := rid.(uuid.UUID); ok {
			reviewerID = &uid
		}
	}

	// Determine which unit to assign
	var assignUnitID *uuid.UUID
	if body.CreateNewUnit && body.NewUnitName != "" && h.frequencyRepo != nil {
		unitCode := body.NewUnitCode
		if unitCode == "" {
			unitCode = body.NewUnitName
		}
		newUnit := &models.Unit{
			Name:           body.NewUnitName,
			UnitCode:       unitCode,
			InstallationID: req.InstallationID,
		}
		if createErr := h.frequencyRepo.CreateUnit(newUnit); createErr != nil {
			fmt.Printf("Warning: failed to create unit '%s': %v\n", body.NewUnitName, createErr)
		} else {
			assignUnitID = &newUnit.ID
		}
	} else if body.OverrideUnitID != nil {
		assignUnitID = body.OverrideUnitID
	} else if req.UnitID != nil {
		assignUnitID = req.UnitID
	}

	if assignUnitID != nil && h.frequencyRepo != nil {
		if assignErr := h.frequencyRepo.AssignUserToUnit(user.ID, *assignUnitID, "member", true, reviewerID); assignErr != nil {
			fmt.Printf("Warning: failed to assign user %s to unit %s: %v\n", user.ID, *assignUnitID, assignErr)
		}
	}

	h.accountReqRepo.UpdateStatus(id, "approved", reviewerID, body.Notes)

	resp := gin.H{
		"message":       "account approved and created",
		"user":          user,
		"temp_password": password,
	}
	if assignUnitID == nil && req.RequestedUnitName != nil && *req.RequestedUnitName != "" {
		resp["unit_note"] = "No unit was assigned. User had requested: " + *req.RequestedUnitName
	}
	c.JSON(http.StatusOK, resp)
}

// SearchUnits searches units by name or code for duplicate detection.
// GET /api/admin/units/search?q=query
func (h *AdminHandler) SearchUnits(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}
	q := c.Query("q")
	if len(q) < 2 {
		c.JSON(http.StatusOK, gin.H{"units": []interface{}{}})
		return
	}
	units, err := h.frequencyRepo.SearchUnitsByName(q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "search failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"units": units})
}

// DenyAccountRequest rejects a pending account request.
// POST /api/admin/account-requests/:id/deny
func (h *AdminHandler) DenyAccountRequest(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request ID"})
		return
	}

	req, err := h.accountReqRepo.GetByID(id)
	if err != nil || req == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "request not found"})
		return
	}
	if req.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "request already reviewed"})
		return
	}

	var body struct {
		Notes string `json:"notes"`
	}
	c.ShouldBindJSON(&body)

	var reviewerPtr *uuid.UUID
	if rid, ok := c.Get("userID"); ok {
		if uid, ok := rid.(uuid.UUID); ok {
			reviewerPtr = &uid
		}
	}
	if err := h.accountReqRepo.UpdateStatus(id, "denied", reviewerPtr, body.Notes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update request"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "request denied"})
}

// SubmitAccountRequest handles public self-service account requests.
// POST /api/auth/request-account
func SubmitAccountRequest(repo *repositories.AccountRequestRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.AccountRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
			return
		}

		if req.Username == "" || req.Email == "" || req.FullName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "username, email, and full name are required"})
			return
		}

		if req.UnitID == nil && (req.RequestedUnitName == nil || *req.RequestedUnitName == "") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "please select a unit or request a new one"})
			return
		}

		if req.RequestedRole == "" {
			req.RequestedRole = "operator"
		}
		if !validRoles[req.RequestedRole] {
			req.RequestedRole = "operator"
		}

		if err := repo.Create(&req); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to submit request"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message": "Account request submitted. An administrator will review your request.",
			"id":      req.ID,
		})
	}
}
