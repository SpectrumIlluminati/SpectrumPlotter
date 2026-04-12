// cmd/run_migration/main.go
package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env file found")
	}

	// Get migration file path from command line or use default
	migrationFile := "migrations/009_create_frequency_assignments.sql"
	if len(os.Args) > 1 {
		migrationFile = os.Args[1]
	}

	// Read migration file
	sqlBytes, err := os.ReadFile(migrationFile)
	if err != nil {
		log.Fatalf("Failed to read migration file %s: %v", migrationFile, err)
	}

	// Build connection string from environment variables
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "5432"),
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", ""),
		getEnv("DB_NAME", "sfaf_plotter"),
		getEnv("DB_SSLMODE", "disable"),
	)

	// Connect to database
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	log.Printf("✓ Connected to database: %s@%s/%s",
		getEnv("DB_USER", "postgres"),
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_NAME", "sfaf_plotter"),
	)

	// Run migration
	log.Printf("Running migration: %s", filepath.Base(migrationFile))
	_, err = db.Exec(string(sqlBytes))
	if err != nil {
		log.Fatalf("Failed to run migration: %v", err)
	}

	log.Printf("✓ Migration completed successfully!")
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
