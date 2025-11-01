// config/database.go
package config

import (
	"database/sql"
	"fmt"
	"log"
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

func NewDatabaseConfig() *DatabaseConfig {
	return &DatabaseConfig{
		Host:     getEnv("DB_HOST", "jelly"),
		Port:     getEnv("DB_PORT", "5432"),
		User:     getEnv("DB_USER", "freqman"),
		Password: getEnv("DB_PASSWORD", "3h0MX!21dZjQ1T"),
		DBName:   getEnv("DB_NAME", "freqnom_DB"),
		SSLMode:  getEnv("DB_SSLMODE", "disable"),
	}
}

func (config *DatabaseConfig) GetConnectionString() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		config.Host, config.Port, config.User, config.Password, config.DBName, config.SSLMode)
}

func ConnectDatabase() (*sql.DB, error) {
	config := NewDatabaseConfig()
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

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
