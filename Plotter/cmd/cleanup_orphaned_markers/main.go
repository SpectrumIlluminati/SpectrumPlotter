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

	// Connect to database using config package
	db, err := config.ConnectDatabase()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	fmt.Println("Connected to database successfully")

	// First, count markers without SFAF data
	fmt.Println("\n=== Analyzing markers and SFAF records ===")

	var totalMarkers, markersWithSFAF, markersWithoutSFAF int

	// Count total markers
	err = db.QueryRow("SELECT COUNT(*) FROM markers").Scan(&totalMarkers)
	if err != nil {
		log.Fatalf("Failed to count markers: %v", err)
	}

	// Count markers with SFAF records
	err = db.QueryRow(`
		SELECT COUNT(DISTINCT m.id)
		FROM markers m
		INNER JOIN sfafs s ON m.id = s.marker_id
	`).Scan(&markersWithSFAF)
	if err != nil {
		log.Fatalf("Failed to count markers with SFAF: %v", err)
	}

	markersWithoutSFAF = totalMarkers - markersWithSFAF

	fmt.Printf("\nTotal markers: %d\n", totalMarkers)
	fmt.Printf("Markers WITH SFAF records: %d\n", markersWithSFAF)
	fmt.Printf("Markers WITHOUT SFAF records (orphaned): %d\n", markersWithoutSFAF)

	if markersWithoutSFAF == 0 {
		fmt.Println("\n✅ No orphaned markers found. All markers have SFAF records!")
		return
	}

	// Show sample of orphaned markers
	fmt.Println("\n=== Sample of orphaned markers (first 10) ===")
	rows, err := db.Query(`
		SELECT m.id, m.serial, m.frequency, m.created_at
		FROM markers m
		LEFT JOIN sfafs s ON m.id = s.marker_id
		WHERE s.id IS NULL
		LIMIT 10
	`)
	if err != nil {
		log.Fatalf("Failed to query orphaned markers: %v", err)
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var id, serial string
		var frequency sql.NullString
		var createdAt string

		if err := rows.Scan(&id, &serial, &frequency, &createdAt); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		count++
		fmt.Printf("\n%d. ID: %s\n", count, id)
		fmt.Printf("   Serial: %s\n", serial)
		fmt.Printf("   Frequency: %s\n", frequency.String)
		fmt.Printf("   Created: %s\n", createdAt)
	}

	fmt.Printf("\n\nTotal orphaned markers to delete: %d\n", markersWithoutSFAF)
	fmt.Print("\nDo you want to DELETE all markers without SFAF records? (yes/no): ")
	var response string
	fmt.Scanln(&response)

	if response != "yes" {
		fmt.Println("Deletion cancelled.")
		return
	}

	// Delete orphaned markers
	result, err := db.Exec(`
		DELETE FROM markers
		WHERE id NOT IN (SELECT DISTINCT marker_id FROM sfafs WHERE marker_id IS NOT NULL)
	`)
	if err != nil {
		log.Fatalf("Failed to delete orphaned markers: %v", err)
	}

	rowsAffected, _ := result.RowsAffected()
	fmt.Printf("\n✅ Successfully deleted %d orphaned markers\n", rowsAffected)

	// Show remaining count
	var remainingMarkers int
	err = db.QueryRow("SELECT COUNT(*) FROM markers").Scan(&remainingMarkers)
	if err != nil {
		log.Fatalf("Failed to count remaining markers: %v", err)
	}

	var remainingSFAF int
	err = db.QueryRow("SELECT COUNT(*) FROM sfafs").Scan(&remainingSFAF)
	if err != nil {
		log.Fatalf("Failed to count remaining SFAF records: %v", err)
	}

	fmt.Printf("✅ Remaining markers: %d\n", remainingMarkers)
	fmt.Printf("✅ SFAF records: %d\n", remainingSFAF)
	fmt.Println("\n✅ All markers now have corresponding SFAF records!")
}
