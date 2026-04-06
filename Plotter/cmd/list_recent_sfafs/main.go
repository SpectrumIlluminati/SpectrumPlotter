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

	fmt.Println("=== First 20 SFAF records (sorted by created_at DESC) ===\n")

	rows, err := db.Query(`
		SELECT id, field102, marker_id, created_at
		FROM sfafs
		ORDER BY created_at DESC
		LIMIT 20
	`)
	if err != nil {
		log.Fatalf("Query failed: %v", err)
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var id, field102 string
		var markerID *string
		var createdAt string

		if err := rows.Scan(&id, &field102, &markerID, &createdAt); err != nil {
			log.Printf("Scan error: %v", err)
			continue
		}

		count++
		markerStr := "NULL"
		if markerID != nil {
			markerStr = (*markerID)[:8]
		}
		fmt.Printf("%d. ID: %s | Serial: %s | Marker: %s | Created: %s\n",
			count, id[:8], field102, markerStr, createdAt[:19])
	}
}
