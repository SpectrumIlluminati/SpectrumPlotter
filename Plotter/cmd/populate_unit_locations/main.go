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

	fmt.Println("=== Populating Unit Locations from SFAF Records (Field 300 + Field 301) ===\n")

	// Query to update unit locations based on Field 300 and Field 301 from SFAF records
	// We'll take the most common location for each unit
	query := `
		UPDATE units u
		SET location = location_data.location
		FROM (
			SELECT
				REPLACE(TRIM(s.field207), ' ', '_') as unit_code,
				TRIM(
					CASE
						WHEN COALESCE(s.field301, '') != '' AND COALESCE(s.field300, '') != ''
							THEN s.field301 || ', ' || s.field300
						WHEN COALESCE(s.field301, '') != ''
							THEN s.field301
						WHEN COALESCE(s.field300, '') != ''
							THEN s.field300
						ELSE ''
					END
				) as location,
				COUNT(*) as freq_count
			FROM sfafs s
			WHERE s.field207 IS NOT NULL
			  AND s.field207 != ''
			  AND (s.field300 IS NOT NULL OR s.field301 IS NOT NULL)
			GROUP BY
				REPLACE(TRIM(s.field207), ' ', '_'),
				TRIM(
					CASE
						WHEN COALESCE(s.field301, '') != '' AND COALESCE(s.field300, '') != ''
							THEN s.field301 || ', ' || s.field300
						WHEN COALESCE(s.field301, '') != ''
							THEN s.field301
						WHEN COALESCE(s.field300, '') != ''
							THEN s.field300
						ELSE ''
					END
				)
		) as location_data
		WHERE u.unit_code = location_data.unit_code
		  AND location_data.location != ''
		  AND (u.location IS NULL OR u.location = '')
	`

	result, err := db.Exec(query)
	if err != nil {
		log.Fatalf("Failed to update unit locations: %v", err)
	}

	rowsAffected, _ := result.RowsAffected()
	fmt.Printf("✅ Updated %d units with location information\n\n", rowsAffected)

	// Show statistics
	var totalUnits int
	var unitsWithLocation int
	var unitsWithoutLocation int

	db.QueryRow("SELECT COUNT(*) FROM units").Scan(&totalUnits)
	db.QueryRow("SELECT COUNT(*) FROM units WHERE location IS NOT NULL AND location != ''").Scan(&unitsWithLocation)
	db.QueryRow("SELECT COUNT(*) FROM units WHERE location IS NULL OR location = ''").Scan(&unitsWithoutLocation)

	fmt.Println("=== Statistics ===")
	fmt.Printf("Total units: %d\n", totalUnits)
	fmt.Printf("Units with location: %d\n", unitsWithLocation)
	fmt.Printf("Units without location: %d\n", unitsWithoutLocation)

	// Show sample of updated units
	fmt.Println("\n=== Sample Updated Units (First 20) ===")
	rows, err := db.Query(`
		SELECT u.unit_code, u.name, u.location
		FROM units u
		WHERE u.location IS NOT NULL AND u.location != ''
		ORDER BY u.name
		LIMIT 20
	`)
	if err != nil {
		log.Printf("Failed to query sample units: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var unitCode, name, location string
		if err := rows.Scan(&unitCode, &name, &location); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		// Truncate long names for display
		displayName := name
		if len(displayName) > 40 {
			displayName = displayName[:37] + "..."
		}

		fmt.Printf("  %-20s %-43s %s\n", unitCode, displayName, location)
	}

	// Show units without locations
	fmt.Println("\n=== Sample Units Without Locations (First 10) ===")
	noLocRows, err := db.Query(`
		SELECT u.unit_code, u.name
		FROM units u
		WHERE u.location IS NULL OR u.location = ''
		ORDER BY u.name
		LIMIT 10
	`)
	if err != nil {
		log.Printf("Failed to query units without location: %v", err)
		return
	}
	defer noLocRows.Close()

	hasNoLoc := false
	for noLocRows.Next() {
		hasNoLoc = true
		var unitCode, name string
		if err := noLocRows.Scan(&unitCode, &name); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		displayName := name
		if len(displayName) > 50 {
			displayName = displayName[:47] + "..."
		}

		fmt.Printf("  %-20s %s\n", unitCode, displayName)
	}

	if !hasNoLoc {
		fmt.Println("  (None - all units have locations!)")
	}
}
