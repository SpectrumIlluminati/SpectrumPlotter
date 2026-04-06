package main

import (
	"fmt"
	"log"
	"strings"

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

	fmt.Println("=== Creating Unit Table Entries from Field 207 ===\n")

	// Get all distinct Field 207 values from SFAFs
	query := `
		SELECT DISTINCT COALESCE(field207, '') as field207
		FROM sfafs
		WHERE field207 IS NOT NULL AND field207 != ''
		ORDER BY field207
	`

	rows, err := db.Query(query)
	if err != nil {
		log.Fatalf("Failed to query Field 207 values: %v", err)
	}
	defer rows.Close()

	var field207Values []string
	for rows.Next() {
		var value string
		if err := rows.Scan(&value); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		field207Values = append(field207Values, value)
	}

	fmt.Printf("Found %d distinct Field 207 values\n\n", len(field207Values))

	if len(field207Values) == 0 {
		fmt.Println("No Field 207 values found in database")
		return
	}

	// Create units for each Field 207 value
	createdCount := 0
	skippedCount := 0

	for _, field207 := range field207Values {
		// Generate unit_code from field207 (remove spaces, limit length)
		unitCode := strings.ReplaceAll(strings.TrimSpace(field207), " ", "_")
		if len(unitCode) > 50 {
			unitCode = unitCode[:50]
		}

		// Check if unit already exists
		var existingID string
		checkQuery := `SELECT id FROM units WHERE unit_code = $1`
		err := db.QueryRow(checkQuery, unitCode).Scan(&existingID)

		if err == nil {
			// Unit already exists
			fmt.Printf("⏭️  Skipped (exists): %s\n", field207)
			skippedCount++
			continue
		}

		// Create new unit
		insertQuery := `
			INSERT INTO units (name, unit_code, organization, is_active)
			VALUES ($1, $2, $3, true)
			RETURNING id
		`

		var newID string
		err = db.QueryRow(insertQuery, field207, unitCode, field207).Scan(&newID)
		if err != nil {
			log.Printf("❌ Failed to create unit for '%s': %v", field207, err)
			continue
		}

		fmt.Printf("✅ Created unit: %s (ID: %s)\n", field207, newID[:8])
		createdCount++
	}

	fmt.Printf("\n=== Summary ===\n")
	fmt.Printf("Total Field 207 values: %d\n", len(field207Values))
	fmt.Printf("Units created: %d\n", createdCount)
	fmt.Printf("Units skipped (already exist): %d\n", skippedCount)

	// Show final unit count
	var totalUnits int
	db.QueryRow("SELECT COUNT(*) FROM units").Scan(&totalUnits)
	fmt.Printf("\nTotal units in database: %d\n", totalUnits)
}
