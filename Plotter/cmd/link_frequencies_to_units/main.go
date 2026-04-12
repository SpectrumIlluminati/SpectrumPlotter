package main

import (
	"database/sql"
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

	fmt.Println("=== Linking Frequency Assignments to Units Based on Field 207 ===\n")

	// Query to link frequency assignments to units via serial -> marker -> SFAF -> field207 -> unit
	query := `
		UPDATE frequency_assignments fa
		SET unit_id = u.id
		FROM markers m
		JOIN sfafs s ON m.id = s.marker_id
		JOIN units u ON u.unit_code = REPLACE(TRIM(s.field207), ' ', '_')
		WHERE fa.serial = m.serial
		  AND fa.unit_id IS NULL
	`

	result, err := db.Exec(query)
	if err != nil {
		log.Fatalf("Failed to link frequency assignments to units: %v", err)
	}

	rowsAffected, _ := result.RowsAffected()
	fmt.Printf("✅ Linked %d frequency assignments to units\n\n", rowsAffected)

	// Show statistics
	var totalAssignments int
	var linkedAssignments int
	var unlinkedAssignments int

	db.QueryRow("SELECT COUNT(*) FROM frequency_assignments").Scan(&totalAssignments)
	db.QueryRow("SELECT COUNT(*) FROM frequency_assignments WHERE unit_id IS NOT NULL").Scan(&linkedAssignments)
	db.QueryRow("SELECT COUNT(*) FROM frequency_assignments WHERE unit_id IS NULL").Scan(&unlinkedAssignments)

	fmt.Println("=== Statistics ===")
	fmt.Printf("Total frequency assignments: %d\n", totalAssignments)
	fmt.Printf("Linked to units: %d\n", linkedAssignments)
	fmt.Printf("Unlinked (no matching unit): %d\n", unlinkedAssignments)

	// Show top units by frequency count
	fmt.Println("\n=== Top 20 Units by Frequency Count ===")
	rows, err := db.Query(`
		SELECT u.name, u.unit_code, COUNT(fa.id) as freq_count
		FROM units u
		LEFT JOIN frequency_assignments fa ON u.id = fa.unit_id
		GROUP BY u.id, u.name, u.unit_code
		HAVING COUNT(fa.id) > 0
		ORDER BY freq_count DESC
		LIMIT 20
	`)
	if err != nil {
		log.Printf("Failed to query unit statistics: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var name, unitCode string
		var count int
		if err := rows.Scan(&name, &unitCode, &count); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		fmt.Printf("  %3d frequencies - %s (%s)\n", count, name, unitCode)
	}

	// Show sample of unlinked assignments
	fmt.Println("\n=== Sample Unlinked Assignments (no matching unit) ===")
	unlinkedRows, err := db.Query(`
		SELECT fa.serial, m.serial as marker_serial, s.field207
		FROM frequency_assignments fa
		LEFT JOIN markers m ON fa.serial = m.serial
		LEFT JOIN sfafs s ON m.id = s.marker_id
		WHERE fa.unit_id IS NULL
		LIMIT 10
	`)
	if err != nil {
		log.Printf("Failed to query unlinked assignments: %v", err)
		return
	}
	defer unlinkedRows.Close()

	hasUnlinked := false
	for unlinkedRows.Next() {
		hasUnlinked = true
		var faSerial sql.NullString
		var markerSerial sql.NullString
		var field207 sql.NullString

		if err := unlinkedRows.Scan(&faSerial, &markerSerial, &field207); err != nil {
			log.Printf("Error scanning unlinked row: %v", err)
			continue
		}

		fmt.Printf("  Serial: %s | Marker: %s | Field207: %s\n",
			nullStringValue(faSerial),
			nullStringValue(markerSerial),
			nullStringValue(field207))
	}

	if !hasUnlinked {
		fmt.Println("  (None - all assignments linked!)")
	}
}

func nullStringValue(ns sql.NullString) string {
	if ns.Valid {
		return ns.String
	}
	return "(null)"
}
