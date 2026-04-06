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
	godotenv.Load()

	if len(os.Args) < 3 {
		fmt.Println("Usage: reset_password <username> <new_password>")
		os.Exit(1)
	}

	username := os.Args[1]
	password := os.Args[2]

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

	res, err := db.Exec(`UPDATE users SET password_hash = $1 WHERE username = $2`, string(hash), username)
	if err != nil {
		log.Fatalf("Failed to reset password: %v", err)
	}

	n, _ := res.RowsAffected()
	if n == 0 {
		log.Fatalf("User '%s' not found", username)
	}

	fmt.Printf("✅ Password reset for user: %s\n", username)
}

func getEnv(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}
