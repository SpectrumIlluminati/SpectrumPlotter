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
	godotenv.Load()
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		getEnv("DB_HOST", "localhost"), getEnv("DB_PORT", "5432"), getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", ""), getEnv("DB_NAME", "sfaf_plotter"), getEnv("DB_SSLMODE", "disable"))

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	rows, err := db.Query(`SELECT username, role, is_active, password_hash IS NOT NULL FROM users ORDER BY role, username`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Printf("%-20s %-12s %-8s %s\n", "USERNAME", "ROLE", "ACTIVE", "HAS_PASSWORD")
	fmt.Println("---------------------------------------------------")
	for rows.Next() {
		var username, role string
		var isActive, hasPassword bool
		rows.Scan(&username, &role, &isActive, &hasPassword)
		fmt.Printf("%-20s %-12s %-8v %v\n", username, role, isActive, hasPassword)
	}
}

func getEnv(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}
