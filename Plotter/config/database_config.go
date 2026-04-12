// config/database_config.go
package config

import (
	"database/sql"
	"fmt"
	"log"
	"net/url"
	"os"

	_ "github.com/lib/pq"
)

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// NewDatabaseConfig creates a new database configuration from environment variables
// No default credentials are provided for security - they must be set in .env file
func NewDatabaseConfig() *DatabaseConfig {
	return &DatabaseConfig{
		Host:     getEnvRequired("DB_HOST"),
		Port:     getEnv("DB_PORT", "5432"),
		User:     getEnvRequired("DB_USER"),
		Password: getEnvRequired("DB_PASSWORD"),
		DBName:   getEnvRequired("DB_NAME"),
		SSLMode:  getEnv("DB_SSLMODE", "disable"),
	}
}

func (config *DatabaseConfig) GetConnectionString() string {
	// Use PostgreSQL URL format for proper password encoding
	// URL-encode the password to handle special characters like $, *, !, %, &
	encodedPassword := url.QueryEscape(config.Password)
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		config.User, encodedPassword, config.Host, config.Port, config.DBName, config.SSLMode)
}

func ConnectDatabase() (*sql.DB, error) {
	config := NewDatabaseConfig()

	log.Printf("🔌 Connecting to PostgreSQL database at %s:%s/%s", config.Host, config.Port, config.DBName)

	db, err := sql.Open("postgres", config.GetConnectionString())
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("✅ Successfully connected to PostgreSQL database")
	return db, nil
}

// getEnv retrieves an environment variable with a fallback default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvRequired retrieves a required environment variable and panics if not found
func getEnvRequired(key string) string {
	value := os.Getenv(key)
	if value == "" {
		log.Fatalf("❌ Required environment variable %s is not set. Please check your .env file.", key)
	}
	return value
}
