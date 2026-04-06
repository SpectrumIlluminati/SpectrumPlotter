// cmd/seed_test_isms/main.go
// Creates one test ISM account per installation in the database.
// All accounts share the same password (TEST_ISM_PASSWORD env var, default "Test1234!").
// Safe to re-run — skips installations that already have a matching ism_<code> user.
package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env file found")
	}

	password := getEnv("TEST_ISM_PASSWORD", "Test1234!")
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "5432"),
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", ""),
		getEnv("DB_NAME", "sfaf_plotter"),
		getEnv("DB_SSLMODE", "disable"),
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer db.Close()

	rows, err := db.Query(`SELECT id, name, code, organization FROM installations ORDER BY organization, name`)
	if err != nil {
		log.Fatalf("Failed to query installations: %v", err)
	}
	defer rows.Close()

	type installation struct {
		id           string
		name         string
		code         string
		organization string
	}
	var installs []installation
	for rows.Next() {
		var i installation
		if err := rows.Scan(&i.id, &i.name, &i.code, &i.organization); err != nil {
			log.Fatalf("Failed to scan row: %v", err)
		}
		installs = append(installs, i)
	}

	created := 0
	skipped := 0
	for _, inst := range installs {
		// Build a clean username: ism_<lowercase-code>, stripping spaces and special chars
		rawCode := strings.ToLower(inst.code)
		rawCode = strings.ReplaceAll(rawCode, " ", "_")
		rawCode = strings.Map(func(r rune) rune {
			if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' {
				return r
			}
			return '_'
		}, rawCode)
		username := "ism_" + rawCode

		// Check if user already exists
		var exists bool
		err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)`, username).Scan(&exists)
		if err != nil {
			log.Fatalf("Failed to check user existence: %v", err)
		}
		if exists {
			fmt.Printf("  SKIP  %s (already exists)\n", username)
			skipped++
			continue
		}

		email := username + "@test.local"
		fullName := "ISM " + inst.name
		org := inst.organization

		_, err = db.Exec(`
			INSERT INTO users (username, email, full_name, organization, role, password_hash, is_active, installation_id)
			VALUES ($1, $2, $3, $4, 'ism', $5, true, $6)
		`, username, email, fullName, org, string(hash), inst.id)
		if err != nil {
			log.Printf("  ERROR %s: %v\n", username, err)
			continue
		}
		fmt.Printf("  OK    %s  →  %s\n", username, inst.name)
		created++
	}

	fmt.Printf("\nDone. Created: %d  Skipped: %d\n", created, skipped)
	fmt.Printf("Password for all new accounts: %s\n", password)
}

func getEnv(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}
