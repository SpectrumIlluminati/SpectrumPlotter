package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env file found")
	}

	if len(os.Args) < 5 {
		fmt.Println("Usage: create_user <username> <password> <email> <full_name> [role] [organization]")
		fmt.Println("  role defaults to 'operator'")
		os.Exit(1)
	}

	username := os.Args[1]
	password := os.Args[2]
	email := os.Args[3]
	fullName := os.Args[4]
	role := "operator"
	organization := ""
	if len(os.Args) > 5 {
		role = os.Args[5]
	}
	if len(os.Args) > 6 {
		organization = os.Args[6]
	}

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

	_, err = db.Exec(`
		INSERT INTO users (username, email, full_name, organization, role, password_hash, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, true)
	`, username, email, fullName, organization, role, string(hash))
	if err != nil {
		log.Fatalf("Failed to create user: %v", err)
	}

	fmt.Printf("✅ Created user: %s (role: %s)\n", username, role)
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
