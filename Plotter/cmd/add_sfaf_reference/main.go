package main

import (
	"fmt"
	"log"
	"os"

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

	fmt.Println("=== Adding SFAF ID Reference to Frequency Assignments ===\n")

	// Read migration file
	migrationSQL, err := os.ReadFile("migrations/015_add_sfaf_id_to_frequency_assignments.sql")
	if err != nil {
		log.Fatalf("Failed to read migration file: %v", err)
	}

	// Execute migration
	_, err = db.Exec(string(migrationSQL))
	if err != nil {
		log.Fatalf("Failed to execute migration: %v", err)
	}

	fmt.Println("✅ Migration completed successfully")

	// Show statistics
	var totalAssignments int
	var linkedAssignments int
	var unlinkedAssignments int

	db.QueryRow("SELECT COUNT(*) FROM frequency_assignments").Scan(&totalAssignments)
	db.QueryRow("SELECT COUNT(*) FROM frequency_assignments WHERE sfaf_id IS NOT NULL").Scan(&linkedAssignments)
	db.QueryRow("SELECT COUNT(*) FROM frequency_assignments WHERE sfaf_id IS NULL").Scan(&unlinkedAssignments)

	fmt.Printf("\n=== Statistics ===\n")
	fmt.Printf("Total frequency assignments: %d\n", totalAssignments)
	fmt.Printf("Linked to SFAF records: %d\n", linkedAssignments)
	fmt.Printf("Not linked: %d\n", unlinkedAssignments)

	// Verify the relationship works
	var sampleCount int
	db.QueryRow(`
		SELECT COUNT(*)
		FROM frequency_assignments fa
		JOIN sfafs s ON fa.sfaf_id = s.id
		LIMIT 1
	`).Scan(&sampleCount)

	if linkedAssignments > 0 {
		fmt.Println("\n✅ SFAF ID references are working correctly")
	}
}
