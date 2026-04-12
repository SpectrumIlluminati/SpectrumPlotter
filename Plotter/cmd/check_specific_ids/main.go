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

	// IDs from the most recent delete attempt
	ids := []string{
		"61cb3375-f7c2-4646-9566-785edbd1ce79",
		"ec031da2-1bcf-451a-9ddb-2bd56c2d60f8",
		"fa6a2441-784d-45f8-8911-5a20220f204e",
		"fe3471b6-2806-4082-aefd-167969d96521",
		"50526089-a706-4fd2-9a2c-430a60a620dd",
		"7d53ecbb-05d2-403d-8726-ce454fed9994",
		"4a8f3a4d-8ce9-4e54-87b3-74431baa097d",
	}

	fmt.Println("=== Checking if IDs exist in database ===")

	for _, id := range ids {
		var exists bool
		var field102 string
		var markerID *string

		// Check if SFAF exists
		err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM sfafs WHERE id = $1), COALESCE((SELECT field102 FROM sfafs WHERE id = $1), ''), (SELECT marker_id FROM sfafs WHERE id = $1)", id).Scan(&exists, &field102, &markerID)
		if err != nil {
			log.Printf("Error checking ID %s: %v", id, err)
			continue
		}

		if exists {
			fmt.Printf("✓ ID %s EXISTS - Serial: %s, Marker ID: %v\n", id[:8], field102, markerID)
		} else {
			fmt.Printf("✗ ID %s DOES NOT EXIST\n", id[:8])
		}
	}

	// Check total counts
	var sfafCount, markerCount int
	db.QueryRow("SELECT COUNT(*) FROM sfafs").Scan(&sfafCount)
	db.QueryRow("SELECT COUNT(*) FROM markers").Scan(&markerCount)

	fmt.Printf("\nTotal SFAFs: %d\n", sfafCount)
	fmt.Printf("Total Markers: %d\n", markerCount)
}
