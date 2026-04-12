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

	// Page 11 with 50 records per page = offset 500, limit 50
	// But we need to filter out NULL marker_id records like the UI does
	offset := 500
	limit := 50

	fmt.Printf("=== Page 11 (offset %d, limit %d) - Only SFAFs with markers ===\n\n", offset, limit)

	rows, err := db.Query(`
		SELECT s.id, s.field102, s.marker_id, s.created_at
		FROM sfafs s
		WHERE s.marker_id IS NOT NULL
		ORDER BY s.created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		log.Fatalf("Query failed: %v", err)
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var id, field102, markerID, createdAt string

		if err := rows.Scan(&id, &field102, &markerID, &createdAt); err != nil {
			log.Printf("Scan error: %v", err)
			continue
		}

		count++
		fmt.Printf("%d. ID: %s | Serial: %s | Marker: %s | Created: %s\n",
			count, id, field102, markerID[:8], createdAt[:19])
	}

	if count == 0 {
		fmt.Println("No records found on page 11")
	}
}
