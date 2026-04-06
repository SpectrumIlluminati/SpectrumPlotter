// cmd/init_database/main.go
// Initializes the database by running all migrations in order
package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/url"
	"os"
	"path/filepath"
	"sort"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env file found")
	}

	// Build connection string from environment variables
	// Use PostgreSQL URL format for proper password encoding
	password := getEnv("DB_PASSWORD", "")
	encodedPassword := url.QueryEscape(password)

	connStr := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		getEnv("DB_USER", "postgres"),
		encodedPassword,
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "5432"),
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

	// Get all migration files
	migrationsDir := "migrations"
	files, err := filepath.Glob(filepath.Join(migrationsDir, "*.sql"))
	if err != nil {
		log.Fatalf("Failed to read migrations directory: %v", err)
	}

	if len(files) == 0 {
		log.Fatalf("No migration files found in %s", migrationsDir)
	}

	// Sort migration files by name (they should be numbered)
	sort.Strings(files)

	log.Printf("\nFound %d migration files:", len(files))
	for _, file := range files {
		log.Printf("  - %s", filepath.Base(file))
	}

	// Create migrations tracking table
	log.Println("\n📊 Creating migrations tracking table...")
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		log.Fatalf("Failed to create migrations table: %v", err)
	}

	// Run each migration
	log.Println("\n🚀 Running migrations...")
	successCount := 0
	skipCount := 0

	for _, file := range files {
		version := filepath.Base(file)

		// Check if migration already applied
		var exists bool
		err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)", version).Scan(&exists)
		if err != nil {
			log.Printf("⚠️  Warning: Could not check migration status for %s: %v", version, err)
			continue
		}

		if exists {
			log.Printf("⏭️  Skipping %s (already applied)", version)
			skipCount++
			continue
		}

		// Read migration file
		sqlBytes, err := os.ReadFile(file)
		if err != nil {
			log.Printf("❌ Failed to read %s: %v", version, err)
			continue
		}

		// Execute migration
		log.Printf("⚙️  Applying %s...", version)
		_, err = db.Exec(string(sqlBytes))
		if err != nil {
			log.Printf("❌ Failed to apply %s: %v", version, err)
			log.Println("   Continuing with remaining migrations...")
			continue
		}

		// Record migration
		_, err = db.Exec("INSERT INTO schema_migrations (version) VALUES ($1)", version)
		if err != nil {
			log.Printf("⚠️  Warning: Migration succeeded but failed to record: %v", err)
		}

		log.Printf("✅ Successfully applied %s", version)
		successCount++
	}

	// Summary
	separator := "============================================================"
	log.Println("\n" + separator)
	log.Println("📋 Migration Summary:")
	log.Printf("   ✅ Applied: %d", successCount)
	log.Printf("   ⏭️  Skipped: %d", skipCount)
	log.Printf("   📁 Total:   %d", len(files))
	log.Println(separator)

	if successCount > 0 {
		log.Println("\n🎉 Database initialization complete!")
	} else if skipCount == len(files) {
		log.Println("\n✅ Database already initialized - all migrations already applied")
	} else {
		log.Println("\n⚠️  Database initialization completed with warnings")
	}
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
