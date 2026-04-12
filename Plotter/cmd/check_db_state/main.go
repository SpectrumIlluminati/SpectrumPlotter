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

	var sfafCount, markerCount, matchingCount int

	// Count total SFAF records
	err = db.QueryRow("SELECT COUNT(*) FROM sfafs").Scan(&sfafCount)
	if err != nil {
		log.Fatalf("Failed to count SFAFs: %v", err)
	}

	// Count total markers
	err = db.QueryRow("SELECT COUNT(*) FROM markers").Scan(&markerCount)
	if err != nil {
		log.Fatalf("Failed to count markers: %v", err)
	}

	// Count markers with matching SFAF records
	err = db.QueryRow(`
		SELECT COUNT(DISTINCT m.id)
		FROM markers m
		INNER JOIN sfafs s ON m.id = s.marker_id
	`).Scan(&matchingCount)
	if err != nil {
		log.Fatalf("Failed to count matching records: %v", err)
	}

	fmt.Println("=== Database State ===")
	fmt.Printf("Total SFAF records: %d\n", sfafCount)
	fmt.Printf("Total markers: %d\n", markerCount)
	fmt.Printf("Markers with SFAF records: %d\n", matchingCount)
	fmt.Printf("Orphaned markers (no SFAF): %d\n", markerCount-matchingCount)
	fmt.Printf("Orphaned SFAFs (no marker): %d\n", sfafCount-matchingCount)
}
