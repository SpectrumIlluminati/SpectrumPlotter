// cmd/update_frequencies/main.go
// Updates existing marker frequencies to add K or M prefix per MC4EB standard
package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load environment variables from project root
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Connect to database
	db, err := connectDB()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	log.Println("🔄 Starting frequency format update...")

	// Get all markers with unprefixed frequencies
	query := `SELECT id, frequency FROM markers WHERE frequency !~ '^[KM]'`
	rows, err := db.Query(query)
	if err != nil {
		log.Fatal("Failed to query markers:", err)
	}
	defer rows.Close()

	updateCount := 0
	for rows.Next() {
		var id string
		var frequency string

		if err := rows.Scan(&id, &frequency); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		// Parse frequency
		freqFloat, err := strconv.ParseFloat(frequency, 64)
		if err != nil {
			log.Printf("Warning: Could not parse frequency '%s' for marker %s", frequency, id)
			continue
		}

		// Format with K or M prefix
		formattedFreq := formatFrequency(freqFloat)

		// Update marker
		updateQuery := `UPDATE markers SET frequency = $1 WHERE id = $2`
		_, err = db.Exec(updateQuery, formattedFreq, id)
		if err != nil {
			log.Printf("Error updating marker %s: %v", id, err)
			continue
		}

		updateCount++
		if updateCount%10000 == 0 {
			log.Printf("✅ Updated %d markers...", updateCount)
		}
	}

	log.Printf("🎉 Successfully updated %d marker frequencies", updateCount)

	// Verify update
	var prefixedCount int
	err = db.QueryRow(`SELECT COUNT(*) FROM markers WHERE frequency ~ '^[KM]'`).Scan(&prefixedCount)
	if err != nil {
		log.Printf("Warning: Could not verify count: %v", err)
	} else {
		log.Printf("📊 Total markers with K/M prefix: %d", prefixedCount)
	}
}

func connectDB() (*sql.DB, error) {
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "5432"),
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", ""),
		getEnv("DB_NAME", "sfaf_plotter"),
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	if err = db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

// formatFrequency formats frequency with K or M prefix per MC4EB standard
// K for 2000-29999 KHz (2.000-29.999 MHz)
// M for everything else
func formatFrequency(freqMHz float64) string {
	// Convert MHz to KHz
	freqKHz := freqMHz * 1000

	// Check if frequency is in K range (2000-29999 KHz)
	if freqKHz >= 2000 && freqKHz <= 29999 {
		// Return formatted KHz with K prefix
		return fmt.Sprintf("K%.4f", freqKHz)
	}

	// Otherwise use M prefix for MHz
	return fmt.Sprintf("M%.4f", freqMHz)
}
