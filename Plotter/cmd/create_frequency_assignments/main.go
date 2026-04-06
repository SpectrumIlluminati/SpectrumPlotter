package main

import (
	"database/sql"
	"fmt"
	"log"
	"strconv"
	"strings"

	"github.com/google/uuid"
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

	fmt.Println("=== Creating Frequency Assignments from SFAF Records ===\n")

	// Query SFAF records with Field 110 (frequency) and Field 207 (unit)
	query := `
		SELECT
			s.id as sfaf_id,
			m.id as marker_id,
			m.serial,
			COALESCE(s.field110, '') as frequency,
			COALESCE(s.field207, '') as unit_code,
			COALESCE(s.field114, '') as emission_designator,
			COALESCE(s.field200, '') as agency,
			u.id as unit_id
		FROM sfafs s
		JOIN markers m ON s.marker_id = m.id
		LEFT JOIN units u ON u.unit_code = REPLACE(TRIM(s.field207), ' ', '_')
		WHERE s.field110 IS NOT NULL
		  AND s.field110 != ''
		  AND s.field207 IS NOT NULL
		  AND s.field207 != ''
		ORDER BY s.field207, s.field110
	`

	rows, err := db.Query(query)
	if err != nil {
		log.Fatalf("Failed to query SFAF records: %v", err)
	}
	defer rows.Close()

	createdCount := 0
	skippedCount := 0
	noUnitCount := 0

	for rows.Next() {
		var sfafID, markerID, serial, frequency, unitCode, emissionDesignator, agency string
		var unitID sql.NullString

		if err := rows.Scan(&sfafID, &markerID, &serial, &frequency, &unitCode, &emissionDesignator, &agency, &unitID); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		// Skip if no unit found
		if !unitID.Valid {
			noUnitCount++
			continue
		}

		// Check if assignment already exists for this serial
		var existingID string
		checkQuery := `SELECT id FROM frequency_assignments WHERE serial = $1`
		err := db.QueryRow(checkQuery, serial).Scan(&existingID)

		if err == nil {
			// Assignment already exists
			skippedCount++
			continue
		}

		// Parse frequency to get numeric value (remove "MHz" suffix if present)
		frequencyMHz := parseFrequencyMHz(frequency)

		// Create frequency assignment
		insertQuery := `
			INSERT INTO frequency_assignments (
				id, unit_id, sfaf_id, serial, frequency, frequency_mhz,
				assignment_type, purpose, emission_designator,
				assignment_authority, notes, is_active
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			RETURNING id
		`

		newID := uuid.New()
		_, err = db.Exec(insertQuery,
			newID,
			unitID.String,
			sfafID,
			serial,
			frequency,
			frequencyMHz,
			"primary",
			"Imported from SFAF",
			emissionDesignator,
			agency,
			fmt.Sprintf("Auto-created from SFAF record for unit %s", unitCode),
			true,
		)

		if err != nil {
			log.Printf("❌ Failed to create assignment for serial %s: %v", serial, err)
			continue
		}

		createdCount++
		if createdCount%100 == 0 {
			fmt.Printf("  Created %d assignments...\n", createdCount)
		}
	}

	fmt.Printf("\n=== Summary ===\n")
	fmt.Printf("Frequency assignments created: %d\n", createdCount)
	fmt.Printf("Assignments skipped (already exist): %d\n", skippedCount)
	fmt.Printf("SFAFs without matching unit: %d\n", noUnitCount)

	// Show final statistics
	var totalAssignments int
	var unitsWithFreqs int

	db.QueryRow("SELECT COUNT(*) FROM frequency_assignments").Scan(&totalAssignments)
	db.QueryRow(`
		SELECT COUNT(DISTINCT unit_id)
		FROM frequency_assignments
		WHERE unit_id IS NOT NULL
	`).Scan(&unitsWithFreqs)

	fmt.Printf("\nTotal frequency assignments in database: %d\n", totalAssignments)
	fmt.Printf("Units with frequency assignments: %d\n", unitsWithFreqs)

	// Show top units by frequency count
	fmt.Println("\n=== Top 10 Units by Frequency Count ===")
	topRows, err := db.Query(`
		SELECT u.name, u.unit_code, COUNT(fa.id) as freq_count
		FROM units u
		JOIN frequency_assignments fa ON u.id = fa.unit_id
		GROUP BY u.id, u.name, u.unit_code
		ORDER BY freq_count DESC
		LIMIT 10
	`)
	if err != nil {
		log.Printf("Failed to query unit statistics: %v", err)
		return
	}
	defer topRows.Close()

	for topRows.Next() {
		var name, unitCode string
		var count int
		if err := topRows.Scan(&name, &unitCode, &count); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		fmt.Printf("  %3d frequencies - %s\n", count, name)
	}
}

func parseFrequencyMHz(frequency string) sql.NullFloat64 {
	// Remove "MHz" suffix and any whitespace
	freq := strings.TrimSpace(strings.ReplaceAll(strings.ToUpper(frequency), "MHZ", ""))
	freq = strings.TrimSpace(freq)

	// Try to parse as float
	if val, err := strconv.ParseFloat(freq, 64); err == nil {
		return sql.NullFloat64{Float64: val, Valid: true}
	}

	return sql.NullFloat64{Valid: false}
}
