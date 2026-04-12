// cmd/generate_test_data/main.go
// Generates 100,000 test SFAF records across the United States
package main

import (
	"database/sql"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

// US Major Cities with coordinates for geographic distribution
var usCities = []struct {
	Name      string
	Lat       float64
	Lng       float64
	Weight    int // Higher weight = more records
	Region    string
}{
	// CONUS Major Cities
	{"New York, NY", 40.7128, -74.0060, 15, "CONUS"},
	{"Los Angeles, CA", 34.0522, -118.2437, 15, "CONUS"},
	{"Chicago, IL", 41.8781, -87.6298, 12, "CONUS"},
	{"Houston, TX", 29.7604, -95.3698, 12, "CONUS"},
	{"Phoenix, AZ", 33.4484, -112.0740, 10, "CONUS"},
	{"Philadelphia, PA", 39.9526, -75.1652, 10, "CONUS"},
	{"San Antonio, TX", 29.4241, -98.4936, 8, "CONUS"},
	{"San Diego, CA", 32.7157, -117.1611, 10, "CONUS"},
	{"Dallas, TX", 32.7767, -96.7970, 10, "CONUS"},
	{"San Jose, CA", 37.3382, -121.8863, 8, "CONUS"},
	{"Austin, TX", 30.2672, -97.7431, 8, "CONUS"},
	{"Jacksonville, FL", 30.3322, -81.6557, 7, "CONUS"},
	{"Fort Worth, TX", 32.7555, -97.3308, 7, "CONUS"},
	{"Columbus, OH", 39.9612, -82.9988, 7, "CONUS"},
	{"Charlotte, NC", 35.2271, -80.8431, 7, "CONUS"},
	{"San Francisco, CA", 37.7749, -122.4194, 12, "CONUS"},
	{"Seattle, WA", 47.6062, -122.3321, 10, "CONUS"},
	{"Denver, CO", 39.7392, -104.9903, 9, "CONUS"},
	{"Washington, DC", 38.9072, -77.0369, 12, "CONUS"},
	{"Boston, MA", 42.3601, -71.0589, 10, "CONUS"},
	{"Nashville, TN", 36.1627, -86.7816, 7, "CONUS"},
	{"Detroit, MI", 42.3314, -83.0458, 8, "CONUS"},
	{"Portland, OR", 45.5152, -122.6784, 8, "CONUS"},
	{"Las Vegas, NV", 36.1699, -115.1398, 8, "CONUS"},
	{"Memphis, TN", 35.1495, -90.0490, 6, "CONUS"},
	{"Louisville, KY", 38.2527, -85.7585, 6, "CONUS"},
	{"Baltimore, MD", 39.2904, -76.6122, 8, "CONUS"},
	{"Milwaukee, WI", 43.0389, -87.9065, 6, "CONUS"},
	{"Albuquerque, NM", 35.0844, -106.6504, 6, "CONUS"},
	{"Tucson, AZ", 32.2226, -110.9747, 6, "CONUS"},
	{"Fresno, CA", 36.7378, -119.7871, 5, "CONUS"},
	{"Sacramento, CA", 38.5816, -121.4944, 7, "CONUS"},
	{"Atlanta, GA", 33.7490, -84.3880, 10, "CONUS"},
	{"Kansas City, MO", 39.0997, -94.5786, 7, "CONUS"},
	{"Miami, FL", 25.7617, -80.1918, 9, "CONUS"},
	{"Raleigh, NC", 35.7796, -78.6382, 6, "CONUS"},
	{"Omaha, NE", 41.2565, -95.9345, 5, "CONUS"},
	{"Colorado Springs, CO", 38.8339, -104.8214, 6, "CONUS"},
	{"Virginia Beach, VA", 36.8529, -75.9780, 6, "CONUS"},
	{"Oakland, CA", 37.8044, -122.2712, 7, "CONUS"},

	// Military Bases (high concentration)
	{"Fort Bragg, NC", 35.1391, -79.0064, 8, "CONUS"},
	{"Fort Campbell, KY", 36.6582, -87.4616, 7, "CONUS"},
	{"Fort Hood, TX", 31.1350, -97.7757, 7, "CONUS"},
	{"Fort Benning, GA", 32.3543, -84.9497, 6, "CONUS"},
	{"Joint Base Lewis-McChord, WA", 47.0979, -122.5814, 7, "CONUS"},
	{"Eglin AFB, FL", 30.4834, -86.5254, 8, "CONUS"},
	{"Nellis AFB, NV", 36.2361, -115.0344, 7, "CONUS"},
	{"Edwards AFB, CA", 34.9054, -117.8839, 6, "CONUS"},
	{"Fort Walton Beach, FL", 30.4266, -86.6195, 10, "CONUS"}, // SFAF Plotter default location
}

// Frequency bands with realistic allocations
var frequencyBands = []struct {
	Name      string
	MinMHz    float64
	MaxMHz    float64
	Type      string
	Weight    int
}{
	{"HF", 3.0, 30.0, "HF", 15},
	{"VHF Low", 30.0, 88.0, "VHF", 20},
	{"VHF High", 108.0, 174.0, "VHF", 25},
	{"UHF Low", 225.0, 400.0, "UHF", 30},
	{"UHF High", 400.0, 512.0, "UHF", 25},
	{"L-Band", 1000.0, 2000.0, "L-Band", 10},
	{"S-Band", 2000.0, 4000.0, "S-Band", 8},
	{"C-Band", 4000.0, 8000.0, "C-Band", 5},
}

// Equipment types
var equipmentTypes = []string{
	"AN/PRC-152 Handheld Radio",
	"AN/PRC-117G Multiband Radio",
	"AN/VRC-104 Vehicle Radio",
	"AN/ARC-210 Airborne Radio",
	"AN/PRC-148 MBITR",
	"AN/PSC-5 SATCOM Terminal",
	"AN/TRC-170 Troposcatter",
	"Harris Falcon III",
	"Motorola XTS 5000",
	"Thales MBITR",
	"General Dynamics MUOS",
	"Raytheon RT-1556",
}

// Emission designators
var emissionDesignators = []string{
	"16K0F3E", "25K0F3E", "6K00A3E", "8K10F1E",
	"20K0F3E", "12K5F3E", "16K0F1E", "50K0F3E",
	"8K00F1D", "16K0F1D", "25K0F1D", "12K5F1D",
}

// Organization units
var organizations = []string{
	"1st Infantry Division",
	"82nd Airborne Division",
	"101st Airborne Division",
	"3rd Infantry Division",
	"10th Mountain Division",
	"1st Cavalry Division",
	"4th Infantry Division",
	"25th Infantry Division",
	"1st Marine Division",
	"2nd Marine Division",
	"3rd Marine Division",
	"Air Force Special Operations Command",
	"Naval Special Warfare Command",
	"Joint Special Operations Command",
	"Army Cyber Command",
	"Marine Corps Forces Cyberspace Command",
	"Air Force Cyber Command",
}

// Agency codes for serial numbers (AA or AAA format)
var agencyCodes = []string{
	"AF",  // Air Force
	"AR",  // Army
	"NV",  // Navy
	"MC",  // Marine Corps
	"CG",  // Coast Guard
	"DLA", // Defense Logistics Agency
	"NSA", // National Security Agency
	"DIA", // Defense Intelligence Agency
	"SOC", // Special Operations Command
	"JCS", // Joint Chiefs of Staff
}

func main() {
	rand.Seed(time.Now().UnixNano())

	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Connect to database
	db, err := connectDB()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	log.Println("🚀 Starting test data generation...")
	log.Println("📊 Target: 100,000 SFAF records across the United States")

	startTime := time.Now()

	// Generate records in batches for better performance
	batchSize := 1000
	totalRecords := 100000

	for i := 0; i < totalRecords; i += batchSize {
		remaining := totalRecords - i
		if remaining < batchSize {
			batchSize = remaining
		}

		if err := generateBatch(db, i, batchSize); err != nil {
			log.Fatal("Failed to generate batch:", err)
		}

		if (i+batchSize)%10000 == 0 {
			elapsed := time.Since(startTime)
			recordsPerSec := float64(i+batchSize) / elapsed.Seconds()
			log.Printf("✅ Generated %d / %d records (%.0f records/sec)", i+batchSize, totalRecords, recordsPerSec)
		}
	}

	elapsed := time.Since(startTime)
	log.Printf("🎉 Successfully generated %d records in %s", totalRecords, elapsed)
	log.Printf("📈 Average: %.0f records/second", float64(totalRecords)/elapsed.Seconds())
}

func connectDB() (*sql.DB, error) {
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "5432"),
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", ""),
		getEnv("DB_NAME", "sfaf_plotter"),
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	if err = db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}

func generateBatch(db *sql.DB, startIdx, count int) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for i := 0; i < count; i++ {
		marker, _ := generateRecord(startIdx + i)

		// Insert marker
		_, err := insertMarker(tx, marker)
		if err != nil {
			return fmt.Errorf("failed to insert marker: %w", err)
		}

		// Note: SFAF records skipped for simplified test data generation
		// The markers table is sufficient for map viewer testing
	}

	return tx.Commit()
}

func generateRecord(index int) (*Marker, *SFAF) {
	// Select city based on weighted distribution
	city := selectWeightedCity()

	// Add random offset to coordinates (±0.5 degrees ≈ 55km)
	lat := city.Lat + (rand.Float64()-0.5)*0.5
	lng := city.Lng + (rand.Float64()-0.5)*0.5

	// Select frequency band
	band := selectWeightedBand()
	frequencyMHz := band.MinMHz + rand.Float64()*(band.MaxMHz-band.MinMHz)

	// Format frequency with K or M prefix per MC4EB standard
	formattedFreq := formatFrequency(frequencyMHz)

	// Generate serial number in format: FREQ000001
	// Note: Using FREQ prefix to match system default format
	serial := fmt.Sprintf("FREQ%06d", index+1)

	// Generate marker
	marker := &Marker{
		Serial:      serial,
		Latitude:    lat,
		Longitude:   lng,
		Frequency:   formattedFreq,
		Notes:       fmt.Sprintf("Test record %d - %s", index+1, city.Name),
		MarkerType:  "imported",
		IsDraggable: false,
	}

	// Generate SFAF record
	sfaf := &SFAF{
		Field100: serial,                           // Serial
		Field110: formattedFreq,                              // Frequency
		Field114: selectRandom(emissionDesignators),                           // Emission
		Field115: fmt.Sprintf("%.2f", 1.0+rand.Float64()*99.0),               // Power (watts)
		Field300: fmt.Sprintf("%.6f,%.6f", lat, lng),                         // Location
		Field340: selectRandom(equipmentTypes),                               // Equipment
		Field350: selectRandom(organizations),                                // Organization
		Field400: time.Now().Add(-time.Duration(rand.Intn(365)) * 24 * time.Hour).Format("2006-01-02"), // Date
		Region:   "CONUS",
	}

	return marker, sfaf
}

func selectWeightedCity() struct {
	Name      string
	Lat       float64
	Lng       float64
	Weight    int
	Region    string
} {
	// Calculate total weight
	totalWeight := 0
	for _, city := range usCities {
		totalWeight += city.Weight
	}

	// Select random weighted city
	r := rand.Intn(totalWeight)
	currentWeight := 0

	for _, city := range usCities {
		currentWeight += city.Weight
		if r < currentWeight {
			return city
		}
	}

	return usCities[0] // Fallback
}

func selectWeightedBand() struct {
	Name      string
	MinMHz    float64
	MaxMHz    float64
	Type      string
	Weight    int
} {
	totalWeight := 0
	for _, band := range frequencyBands {
		totalWeight += band.Weight
	}

	r := rand.Intn(totalWeight)
	currentWeight := 0

	for _, band := range frequencyBands {
		currentWeight += band.Weight
		if r < currentWeight {
			return band
		}
	}

	return frequencyBands[0]
}

func selectRandom(items []string) string {
	return items[rand.Intn(len(items))]
}

// formatFrequency formats frequency with K or M prefix per MC4EB standard
// K for 2000-29999 KHz (2.000-29.999 MHz)
// M for everything else
func formatFrequency(freqMHz float64) string {
	// Convert MHz to KHz
	freqKHz := freqMHz * 1000

	// Check if frequency is in K range (2000-29999 KHz)
	if freqKHz >= 2000 && freqKHz <= 29999 {
		return fmt.Sprintf("K%.4f", freqKHz)
	}

	// Otherwise use M prefix
	return fmt.Sprintf("M%.4f", freqMHz)
}

func insertMarker(tx *sql.Tx, m *Marker) (uuid.UUID, error) {
	id := uuid.New()
	query := `
		INSERT INTO markers (id, serial, latitude, longitude, frequency, notes, marker_type, is_draggable, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id`

	now := time.Now()
	err := tx.QueryRow(query, id, m.Serial, m.Latitude, m.Longitude, m.Frequency,
		m.Notes, m.MarkerType, m.IsDraggable, now, now).Scan(&id)

	return id, err
}

func insertSFAF(tx *sql.Tx, s *SFAF) error {
	id := uuid.New()
	query := `
		INSERT INTO sfaf_records (id, marker_id, field_100, field_110, field_114, field_115, field_300, field_340, field_350, field_400, region, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`

	now := time.Now()
	_, err := tx.Exec(query, id, s.MarkerID, s.Field100, s.Field110, s.Field114, s.Field115,
		s.Field300, s.Field340, s.Field350, s.Field400, s.Region, now, now)

	return err
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

// Data structures
type Marker struct {
	Serial      string
	Latitude    float64
	Longitude   float64
	Frequency   string
	Notes       string
	MarkerType  string
	IsDraggable bool
}

type SFAF struct {
	MarkerID uuid.UUID
	Field100 string // Serial
	Field110 string // Frequency
	Field114 string // Emission
	Field115 string // Power
	Field300 string // Location
	Field340 string // Equipment
	Field350 string // Organization
	Field400 string // Date
	Region   string
}
