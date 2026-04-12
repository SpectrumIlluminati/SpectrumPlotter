// handlers/auth_handler.go
package handlers

import (
	"net/http"
	"sfaf-plotter/models"
	"sfaf-plotter/repositories"
	"sfaf-plotter/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	authService *services.AuthService
	userRepo    *repositories.UserRepository
}

func NewAuthHandler(authService *services.AuthService, userRepo *repositories.UserRepository) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		userRepo:    userRepo,
	}
}

// Login handles password-based login
// POST /api/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.PasswordLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.PasswordLoginResponse{
			Success: false,
			Message: "Invalid request format",
		})
		return
	}

	// Get client info
	ipAddress := c.ClientIP()
	userAgent := c.Request.UserAgent()

	// Authenticate
	user, token, err := h.authService.AuthenticatePassword(req.Username, req.Password, ipAddress, userAgent)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.PasswordLoginResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	// Set session cookie
	c.SetCookie(
		"session_token",
		token,
		86400, // 24 hours
		"/",
		"",
		false, // Set to true if using HTTPS
		true,  // HttpOnly
	)

	c.JSON(http.StatusOK, models.PasswordLoginResponse{
		Success: true,
		Message: "Login successful",
		Token:   token,
		User:    user,
	})
}

// Logout handles session logout
// POST /api/auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// Get token from cookie or header
	token, err := c.Cookie("session_token")
	if err != nil {
		// Try Authorization header
		token = c.GetHeader("Authorization")
		if token == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "No session found",
			})
			return
		}
	}

	// Delete session — always clear the cookie regardless of whether the
	// server-side delete succeeded, so the browser can never get stuck
	// with a cookie pointing at a dead session.
	_ = h.authService.Logout(token)
	c.SetCookie("session_token", "", -1, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logged out successfully",
	})
}

// VerifySession validates the current session
// GET /api/auth/session
func (h *AuthHandler) VerifySession(c *gin.Context) {
	// In dev mode, DevAuthMiddleware injects auth context keys directly (no session token)
	if via, _ := c.Get("authenticated_via"); via == "development" {
		userID, _ := c.Get("userID")
		username, _ := c.Get("username")
		role, _ := c.Get("role")
		c.JSON(http.StatusOK, gin.H{
			"valid": true,
			"user": gin.H{
				"id":       userID,
				"username": username,
				"role":     role,
			},
		})
		return
	}

	// Get token from cookie or header
	token, err := c.Cookie("session_token")
	if err != nil {
		token = c.GetHeader("Authorization")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"valid": false,
				"message": "No session found",
			})
			return
		}
	}

	// Validate session
	user, err := h.authService.ValidateSession(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"valid": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid": true,
		"user":  user,
	})
}

// CreateSuperuser creates the initial superuser account (development only)
// POST /api/auth/create-superuser
func (h *AuthHandler) CreateSuperuser(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
		Email    string `json:"email" binding:"required"`
		FullName string `json:"full_name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
		})
		return
	}

	user, err := h.authService.CreateSuperuser(req.Username, req.Password, req.Email, req.FullName)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Superuser created successfully",
		"user":    user,
	})
}

// ChangePassword allows an authenticated user to change their own password.
// POST /api/auth/change-password
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	rawID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}
	userID, ok := rawID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user ID in context"})
		return
	}

	var req struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "current_password and new_password are required"})
		return
	}
	if len(req.NewPassword) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "new password must be at least 8 characters"})
		return
	}

	user, err := h.userRepo.GetUserByID(userID)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if user.PasswordHash == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password authentication not available for this account"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "current password is incorrect"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	_, err = h.userRepo.DB().Exec(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, string(hash), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Password changed successfully"})
}

// GetProfile returns the current user's full profile.
// GET /api/user/profile
func (h *AuthHandler) GetProfile(c *gin.Context) {
	rawID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}
	userID, ok := rawID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user ID in context"})
		return
	}

	user, err := h.userRepo.GetUserByID(userID)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Also return the user's primary unit if set
	var primaryUnitID *string
	var primaryUnitName *string
	var primaryUnitCode *string
	row := h.userRepo.DB().QueryRow(`
		SELECT u.id::text, u.name, u.unit_code
		FROM user_units uu
		JOIN units u ON u.id = uu.unit_id
		WHERE uu.user_id = $1 AND uu.is_primary = true
		LIMIT 1`, userID)
	var uid, uname, ucode string
	if err := row.Scan(&uid, &uname, &ucode); err == nil {
		primaryUnitID = &uid
		primaryUnitName = &uname
		primaryUnitCode = &ucode
	}

	c.JSON(http.StatusOK, gin.H{
		"user":              user,
		"primary_unit_id":   primaryUnitID,
		"primary_unit_name": primaryUnitName,
		"primary_unit_code": primaryUnitCode,
	})
}

// UpdateProfile lets the current user update their own editable profile fields.
// PUT /api/user/profile
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	rawID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}
	userID, ok := rawID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user ID in context"})
		return
	}

	user, err := h.userRepo.GetUserByID(userID)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	var req struct {
		Email            string  `json:"email"`
		FullName         string  `json:"full_name"`
		Organization     string  `json:"organization"`
		Phone            string  `json:"phone"`
		PhoneDSN         string  `json:"phone_dsn"`
		UnifiedCommand   string  `json:"unified_command"`
		InstallationID   *string `json:"installation_id"`
		UnitID           *string `json:"unit_id"`
		DefaultISMOffice string  `json:"default_ism_office"`
		ServiceBranch    string  `json:"service_branch"`
		PayGrade         string  `json:"pay_grade"`
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
	if req.Phone != "" {
		user.Phone = &req.Phone
	} else {
		user.Phone = nil
	}
	if req.PhoneDSN != "" {
		user.PhoneDSN = &req.PhoneDSN
	} else {
		user.PhoneDSN = nil
	}
	if req.UnifiedCommand != "" {
		user.UnifiedCommand = &req.UnifiedCommand
	} else {
		user.UnifiedCommand = nil
	}

	if req.InstallationID != nil && *req.InstallationID != "" {
		uid, err := uuid.Parse(*req.InstallationID)
		if err == nil {
			user.InstallationID = &uid
		}
	} else if req.InstallationID != nil {
		user.InstallationID = nil
	}

	if req.DefaultISMOffice != "" {
		user.DefaultISMOffice = &req.DefaultISMOffice
	} else {
		user.DefaultISMOffice = nil
	}
	if req.ServiceBranch != "" {
		user.ServiceBranch = &req.ServiceBranch
	} else {
		user.ServiceBranch = nil
	}
	if req.PayGrade != "" {
		user.PayGrade = &req.PayGrade
	} else {
		user.PayGrade = nil
	}

	if err := h.userRepo.UpdateUserProfile(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
		return
	}

	// Update primary unit assignment if provided
	if req.UnitID != nil {
		unitUUID, err := uuid.Parse(*req.UnitID)
		if err == nil {
			// Clear existing primary, then upsert
			h.userRepo.DB().Exec(`UPDATE user_units SET is_primary = false WHERE user_id = $1`, userID)
			h.userRepo.DB().Exec(`
				INSERT INTO user_units (user_id, unit_id, is_primary)
				VALUES ($1, $2, true)
				ON CONFLICT (user_id, unit_id) DO UPDATE SET is_primary = true`, userID, unitUUID)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "user": user})
}
