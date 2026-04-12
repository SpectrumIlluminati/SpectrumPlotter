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

	fmt.Println("=== Checking Marker-SFAF Linkage ===\n")

	var totalMarkers, markersWithSFAF int

	// Count total markers
	db.QueryRow("SELECT COUNT(*) FROM markers").Scan(&totalMarkers)

	// Count markers with SFAF records
	db.QueryRow("SELECT COUNT(DISTINCT marker_id) FROM sfafs WHERE marker_id IS NOT NULL").Scan(&markersWithSFAF)

	markersWithoutSFAF := totalMarkers - markersWithSFAF

	fmt.Printf("Total markers: %d\n", totalMarkers)
	fmt.Printf("Markers with SFAF records: %d\n", markersWithSFAF)
	fmt.Printf("Markers without SFAF records: %d\n", markersWithoutSFAF)

	if markersWithoutSFAF > 0 {
		fmt.Println("\n⚠️ There are markers without SFAF records!")
		fmt.Println("These markers will only show auto-populated fields (frequency + coordinates).")
	} else {
		fmt.Println("\n✅ All markers have SFAF records linked!")
	}
}
