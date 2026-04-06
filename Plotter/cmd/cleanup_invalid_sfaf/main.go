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

	// First, show records that will be deleted
	fmt.Println("\n=== Records to be deleted (missing required fields) ===")
	rows, err := db.Query(`
		SELECT id, marker_id, field102, field005, field010, field110, field200
		FROM sfafs
		WHERE
			(field005 IS NULL OR field005 = '')
			OR (field010 IS NULL OR field010 = '')
			OR (field102 IS NULL OR field102 = '')
			OR (field110 IS NULL OR field110 = '')
			OR (field200 IS NULL OR field200 = '')
	`)
	if err != nil {
		log.Fatalf("Failed to query records: %v", err)
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var id, markerID, field102, field005, field010, field110, field200 sql.NullString
		if err := rows.Scan(&id, &markerID, &field102, &field005, &field010, &field110, &field200); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		count++
		fmt.Printf("\nRecord %d:\n", count)
		fmt.Printf("  ID: %s\n", id.String)
		fmt.Printf("  Marker ID: %s\n", markerID.String)
		fmt.Printf("  field102 (Serial): %s\n", field102.String)
		fmt.Printf("  field005 (Security): %s\n", field005.String)
		fmt.Printf("  field010 (Action): %s\n", field010.String)
		fmt.Printf("  field110 (Frequency): %s\n", field110.String)
		fmt.Printf("  field200 (Agency): %s\n", field200.String)

		missing := []string{}
		if field005.String == "" {
			missing = append(missing, "field005")
		}
		if field010.String == "" {
			missing = append(missing, "field010")
		}
		if field102.String == "" {
			missing = append(missing, "field102")
		}
		if field110.String == "" {
			missing = append(missing, "field110")
		}
		if field200.String == "" {
			missing = append(missing, "field200")
		}
		fmt.Printf("  Missing: %v\n", missing)
	}

	if count == 0 {
		fmt.Println("\n✅ No invalid records found. All SFAF records have required fields!")
		return
	}

	fmt.Printf("\n\nTotal invalid records: %d\n", count)
	fmt.Print("\nDo you want to DELETE these records? (yes/no): ")
	var response string
	fmt.Scanln(&response)

	if response != "yes" {
		fmt.Println("Deletion cancelled.")
		return
	}

	// Delete invalid records
	result, err := db.Exec(`
		DELETE FROM sfafs
		WHERE
			(field005 IS NULL OR field005 = '')
			OR (field010 IS NULL OR field010 = '')
			OR (field102 IS NULL OR field102 = '')
			OR (field110 IS NULL OR field110 = '')
			OR (field200 IS NULL OR field200 = '')
	`)
	if err != nil {
		log.Fatalf("Failed to delete records: %v", err)
	}

	rowsAffected, _ := result.RowsAffected()
	fmt.Printf("\n✅ Successfully deleted %d invalid SFAF records\n", rowsAffected)

	// Show remaining count
	var remaining int
	err = db.QueryRow("SELECT COUNT(*) FROM sfafs").Scan(&remaining)
	if err != nil {
		log.Fatalf("Failed to count remaining records: %v", err)
	}

	fmt.Printf("✅ Remaining valid SFAF records: %d\n", remaining)
}
