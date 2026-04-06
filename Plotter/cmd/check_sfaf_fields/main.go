package main

import (
	"fmt"
	"log"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"sfaf-plotter/config"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	// Connect to database
	db, err := config.ConnectDatabase()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	fmt.Println("=== Checking SFAF Field Population ===\n")

	// Get a sample SFAF record and count non-empty fields
	query := `
		SELECT
			field110, field200, field207, field300, field301, field303,
			field114, field113, field115, field201, field202, field204
		FROM sfafs
		LIMIT 1
	`

	var f110, f200, f207, f300, f301, f303, f114, f113, f115, f201, f202, f204 *string
	err = db.QueryRow(query).Scan(&f110, &f200, &f207, &f300, &f301, &f303, &f114, &f113, &f115, &f201, &f202, &f204)
	if err != nil {
		log.Fatalf("Failed to query SFAF: %v", err)
	}

	fmt.Println("Sample SFAF Record Fields:")
	fields := map[string]*string{
		"field110 (Frequency)": f110,
		"field200 (Agency)":    f200,
		"field207 (Unit)":      f207,
		"field300 (State)":     f300,
		"field301 (Location)":  f301,
		"field303 (Coords)":    f303,
		"field114 (Emission)":  f114,
		"field113 (Class)":     f113,
		"field115 (Power)":     f115,
		"field201 (Command)":   f201,
		"field202 (Service)":   f202,
		"field204 (Command)":   f204,
	}

	populatedCount := 0
	for name, val := range fields {
		if val != nil && *val != "" {
			fmt.Printf("  ✅ %s = %s\n", name, *val)
			populatedCount++
		} else {
			fmt.Printf("  ❌ %s = (empty)\n", name)
		}
	}

	fmt.Printf("\nTotal fields populated: %d out of 12\n", populatedCount)
}
