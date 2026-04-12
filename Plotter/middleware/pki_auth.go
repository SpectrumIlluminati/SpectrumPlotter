// middleware/pki_auth.go
package middleware

import (
	"crypto/sha256"
	"crypto/x509"
	"encoding/hex"
	"encoding/pem"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// PKIConfig holds PKI authentication configuration
type PKIConfig struct {
	Enabled            bool
	TrustedCAPath      string
	RequireClientCert  bool
	AllowedOrgs        []string
	CertificateExpiry  time.Duration
}

// CertificateInfo contains extracted certificate information
type CertificateInfo struct {
	SerialNumber   string
	CommonName     string
	Organization   string
	EmailAddress   string
	Issuer         string
	NotBefore      time.Time
	NotAfter       time.Time
	Fingerprint    string
	IsValid        bool
	ValidationMsg  string
}

// PKIAuthMiddleware creates middleware for PKI authentication
func PKIAuthMiddleware(config PKIConfig, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if PKI is enabled
		if !config.Enabled {
			c.Next()
			return
		}

		// Extract client certificate from TLS connection
		if c.Request.TLS != nil && len(c.Request.TLS.PeerCertificates) > 0 {
			cert := c.Request.TLS.PeerCertificates[0]
			certInfo := extractCertificateInfo(cert)

			// Validate certificate
			if !certInfo.IsValid {
				logger.Warn("Invalid client certificate",
					zap.String("reason", certInfo.ValidationMsg),
					zap.String("cn", certInfo.CommonName),
				)
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Invalid client certificate: " + certInfo.ValidationMsg,
				})
				c.Abort()
				return
			}

			// Check organization if restricted
			if len(config.AllowedOrgs) > 0 {
				allowed := false
				for _, org := range config.AllowedOrgs {
					if certInfo.Organization == org {
						allowed = true
						break
					}
				}
				if !allowed {
					logger.Warn("Certificate from unauthorized organization",
						zap.String("org", certInfo.Organization),
						zap.String("cn", certInfo.CommonName),
					)
					c.JSON(http.StatusForbidden, gin.H{
						"error": "Organization not authorized",
					})
					c.Abort()
					return
				}
			}

			// Store certificate info in context
			c.Set("certificate_info", certInfo)
			c.Set("authenticated_via", "pki")

			logger.Info("PKI authentication successful",
				zap.String("cn", certInfo.CommonName),
				zap.String("org", certInfo.Organization),
				zap.String("serial", certInfo.SerialNumber),
			)
		} else if config.RequireClientCert {
			logger.Warn("Client certificate required but not provided")
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Client certificate required",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// ParseCertificatePEM parses a PEM-encoded certificate
func ParseCertificatePEM(certPEM string) (*CertificateInfo, error) {
	block, _ := pem.Decode([]byte(certPEM))
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM block")
	}

	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse certificate: %w", err)
	}

	certInfo := extractCertificateInfo(cert)
	return &certInfo, nil
}

// extractCertificateInfo extracts information from an x509 certificate
func extractCertificateInfo(cert *x509.Certificate) CertificateInfo {
	info := CertificateInfo{
		SerialNumber: cert.SerialNumber.String(),
		CommonName:   cert.Subject.CommonName,
		Issuer:       cert.Issuer.CommonName,
		NotBefore:    cert.NotBefore,
		NotAfter:     cert.NotAfter,
		IsValid:      true,
	}

	// Extract organization
	if len(cert.Subject.Organization) > 0 {
		info.Organization = cert.Subject.Organization[0]
	}

	// Extract email
	if len(cert.EmailAddresses) > 0 {
		info.EmailAddress = cert.EmailAddresses[0]
	}

	// Calculate fingerprint (SHA-256)
	hash := sha256.Sum256(cert.Raw)
	info.Fingerprint = hex.EncodeToString(hash[:])

	// Validate certificate
	now := time.Now()

	// Check expiration
	if now.Before(cert.NotBefore) {
		info.IsValid = false
		info.ValidationMsg = "Certificate not yet valid"
		return info
	}

	if now.After(cert.NotAfter) {
		info.IsValid = false
		info.ValidationMsg = "Certificate has expired"
		return info
	}

	// Check basic constraints
	if cert.KeyUsage&x509.KeyUsageDigitalSignature == 0 {
		info.IsValid = false
		info.ValidationMsg = "Certificate missing digital signature key usage"
		return info
	}

	info.ValidationMsg = "Certificate is valid"
	return info
}

// RequireSessionAuth validates the session_token cookie against the database.
// Pass a closure that calls authService.ValidateSession and sets user context keys.
func RequireSessionAuth(validateSession func(token string, c *gin.Context) error, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try cookie first, then Authorization header
		token, err := c.Cookie("session_token")
		if err != nil || token == "" {
			token = c.GetHeader("Authorization")
		}

		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		if err := validateSession(token, c); err != nil {
			logger.Warn("Invalid session",
				zap.String("path", c.Request.URL.Path),
				zap.String("ip", c.ClientIP()),
				zap.Error(err),
			)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Session invalid or expired"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// DevAuthMiddleware provides authentication bypass for development/testing
// This middleware should ONLY be used in development mode
func DevAuthMiddleware(enabled bool, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !enabled {
			c.Next()
			return
		}

		// Check if already authenticated (PKI or session takes precedence)
		if _, exists := c.Get("userID"); exists {
			c.Next()
			return
		}

		// Inject test user credentials for development
		// Using a fixed UUID for consistent testing
		testUserID := uuid.MustParse("00000000-0000-0000-0000-000000000001")

		c.Set("userID", testUserID)
		c.Set("username", "dev_user")
		c.Set("role", "admin")
		c.Set("authenticated_via", "development")

		logger.Debug("Development authentication bypass active",
			zap.String("userID", testUserID.String()),
			zap.String("path", c.Request.URL.Path),
		)

		c.Next()
	}
}
