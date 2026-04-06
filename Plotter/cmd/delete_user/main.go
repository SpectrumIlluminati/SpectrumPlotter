package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env file found")
	}

	username := "superadmin"
	if len(os.Args) > 1 {
		username = os.Args[1]
	}

	// Build connection string
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
		log.Fatalf("Failed to connect: %v", err)
	}
	defer db.Close()

	// Delete user
	result, err := db.Exec("DELETE FROM users WHERE username = $1", username)
	if err != nil {
		log.Fatalf("Failed to delete user: %v", err)
	}

	rows, _ := result.RowsAffected()
	if rows > 0 {
		fmt.Printf("✅ Deleted user: %s\n", username)
	} else {
		fmt.Printf("⚠️  User not found: %s\n", username)
	}
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
