// config/config.go
package config

import (
	"fmt"
	"log"
	"strings"
)

// AppConfig holds all application configuration
type AppConfig struct {
	Server   ServerConfig
	Database DatabaseConfig
	CORS     CORSConfig
}

// ServerConfig holds server-related configuration
type ServerConfig struct {
	Host     string
	Port     string
	GinMode  string
	LogLevel string
}

// CORSConfig holds CORS-related configuration
type CORSConfig struct {
	AllowedOrigins []string
	AllowedMethods []string
	AllowedHeaders []string
}

// Load loads the complete application configuration from environment variables
func Load() *AppConfig {
	log.Println("📝 Loading application configuration from environment variables...")

	return &AppConfig{
		Server:   loadServerConfig(),
		Database: *NewDatabaseConfig(),
		CORS:     loadCORSConfig(),
	}
}

func loadServerConfig() ServerConfig {
	return ServerConfig{
		Host:     getEnv("SERVER_HOST", "0.0.0.0"),
		Port:     getEnv("SERVER_PORT", "8080"),
		GinMode:  getEnv("GIN_MODE", "debug"),
		LogLevel: getEnv("LOG_LEVEL", "info"),
	}
}

func loadCORSConfig() CORSConfig {
	return CORSConfig{
		AllowedOrigins: strings.Split(getEnv("CORS_ALLOWED_ORIGINS", "*"), ","),
		AllowedMethods: strings.Split(getEnv("CORS_ALLOWED_METHODS", "GET,POST,PUT,DELETE,OPTIONS"), ","),
		AllowedHeaders: strings.Split(getEnv("CORS_ALLOWED_HEADERS", "Content-Type,Authorization"), ","),
	}
}

// GetServerAddress returns the full server address
func (c *AppConfig) GetServerAddress() string {
	return fmt.Sprintf("%s:%s", c.Server.Host, c.Server.Port)
}

// GetDatabaseConnectionString returns the database connection string
func (c *AppConfig) GetDatabaseConnectionString() string {
	return c.Database.GetConnectionString()
}

// PrintConfiguration logs the loaded configuration (without sensitive data)
func (c *AppConfig) PrintConfiguration() {
	log.Println("⚙️  Configuration loaded:")
	log.Printf("   Server: %s (mode: %s)", c.GetServerAddress(), c.Server.GinMode)
	log.Printf("   Database: %s:%s/%s", c.Database.Host, c.Database.Port, c.Database.DBName)
	log.Printf("   CORS Origins: %v", c.CORS.AllowedOrigins)
}

