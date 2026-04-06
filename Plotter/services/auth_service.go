// services/auth_service.go
package services

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sfaf-plotter/models"
	"sfaf-plotter/repositories"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userRepo    *repositories.UserRepository
	sessionRepo *repositories.SessionRepository
}

func NewAuthService(userRepo *repositories.UserRepository, sessionRepo *repositories.SessionRepository) *AuthService {
	return &AuthService{
		userRepo:    userRepo,
		sessionRepo: sessionRepo,
	}
}

// HashPassword generates a bcrypt hash of the password
func (s *AuthService) HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(hash), nil
}

// VerifyPassword checks if the password matches the hash
func (s *AuthService) VerifyPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// AuthenticatePassword validates username/password and creates a session
func (s *AuthService) AuthenticatePassword(username, password, ipAddress, userAgent string) (*models.User, string, error) {
	// Get user by username
	user, err := s.userRepo.GetByUsername(username)
	if err != nil || user == nil {
		return nil, "", fmt.Errorf("invalid username or password")
	}

	// Check if user is active
	if !user.IsActive {
		return nil, "", fmt.Errorf("user account is disabled")
	}

	// Verify password
	if user.PasswordHash == nil {
		return nil, "", fmt.Errorf("invalid username or password")
	}
	if !s.VerifyPassword(password, *user.PasswordHash) {
		return nil, "", fmt.Errorf("invalid username or password")
	}

	// Generate session token
	token, err := s.generateSecureToken()
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate session token: %w", err)
	}

	// Create session
	session := &models.Session{
		ID:           uuid.New(),
		UserID:       user.ID,
		Token:        token,
		AuthMethod:   "password",
		IPAddress:    &ipAddress,
		UserAgent:    &userAgent,
		ExpiresAt:    time.Now().Add(24 * time.Hour), // 24 hour session
		LastActivity: time.Now(),
		CreatedAt:    time.Now(),
	}

	err = s.sessionRepo.CreateSession(session)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create session: %w", err)
	}

	// Update last login
	now := time.Now()
	user.LastLogin = &now
	err = s.userRepo.UpdateLastLogin(user.ID, now)
	if err != nil {
		// Log but don't fail login
		fmt.Printf("Warning: failed to update last login: %v\n", err)
	}

	return user, token, nil
}

// ValidateSession validates a session token and returns the user
func (s *AuthService) ValidateSession(token string) (*models.User, error) {
	session, err := s.sessionRepo.GetByToken(token)
	if err != nil || session == nil {
		return nil, fmt.Errorf("invalid session")
	}

	// Check if session is expired
	if time.Now().After(session.ExpiresAt) {
		s.sessionRepo.DeleteSession(session.ID)
		return nil, fmt.Errorf("session expired")
	}

	// Get user
	user, err := s.userRepo.GetByID(session.UserID)
	if err != nil || user == nil {
		return nil, fmt.Errorf("user not found")
	}

	// Check if user is still active
	if !user.IsActive {
		s.sessionRepo.DeleteSession(session.ID)
		return nil, fmt.Errorf("user account is disabled")
	}

	// Update last activity
	s.sessionRepo.UpdateLastActivity(session.ID, time.Now())

	return user, nil
}

// Logout invalidates a session. Idempotent — if the session has already
// been deleted or expired, the call is treated as a success.
func (s *AuthService) Logout(token string) error {
	session, err := s.sessionRepo.GetByToken(token)
	if err != nil {
		// Session not found means it's already gone — that's fine.
		return nil
	}
	return s.sessionRepo.DeleteSession(session.ID)
}

// CreateSuperuser creates the initial superuser account
func (s *AuthService) CreateSuperuser(username, password, email, fullName string) (*models.User, error) {
	// Check if superuser already exists
	existing, _ := s.userRepo.GetByUsername(username)
	if existing != nil {
		return nil, fmt.Errorf("user already exists")
	}

	// Hash password
	passwordHash, err := s.HashPassword(password)
	if err != nil {
		return nil, err
	}

	// Create user
	user := &models.User{
		ID:           uuid.New(),
		Username:     username,
		Email:        email,
		PasswordHash: &passwordHash,
		FullName:     fullName,
		Organization: "System",
		Role:         "admin",
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	err = s.userRepo.CreateUser(user)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// CreateUser creates a new user with the specified role (admin-controlled)
func (s *AuthService) CreateUser(username, password, email, fullName, organization, role string, installationID *uuid.UUID) (*models.User, error) {
	existing, _ := s.userRepo.GetByUsername(username)
	if existing != nil {
		return nil, fmt.Errorf("username already taken")
	}

	passwordHash, err := s.HashPassword(password)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Username:       username,
		Email:          email,
		PasswordHash:   &passwordHash,
		FullName:       fullName,
		Organization:   organization,
		Role:           role,
		IsActive:       true,
		InstallationID: installationID,
	}

	if err = s.userRepo.CreateUser(user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// generateSecureToken creates a cryptographically secure random token
func (s *AuthService) generateSecureToken() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
