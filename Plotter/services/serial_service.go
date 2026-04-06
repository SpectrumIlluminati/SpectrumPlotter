// serial_service.go
package services

import (
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"sync"

	"github.com/jmoiron/sqlx"
)

type SerialService struct {
	db      *sqlx.DB
	counter int
	mutex   sync.Mutex
}

func NewSerialService(db *sqlx.DB) *SerialService {
	return &SerialService{
		db:      db,
		counter: getLastSerialFromDB(db) + 1,
		mutex:   sync.Mutex{},
	}
}

func (ss *SerialService) GenerateSerial() string {
	ss.mutex.Lock()
	defer ss.mutex.Unlock()

	for {
		serial := fmt.Sprintf("FREQ%06d", ss.counter)

		// Check if serial exists in database (Source: table_info.txt shows markers.serial unique constraint)
		var exists bool
		err := ss.db.QueryRow("SELECT EXISTS(SELECT 1 FROM markers WHERE serial = $1)", serial).Scan(&exists)
		if err != nil || !exists {
			ss.counter++
			return serial
		}
		ss.counter++
	}
}

func getLastSerialFromDB(db *sqlx.DB) int {
	var maxSerial string
	err := db.QueryRow("SELECT serial FROM markers WHERE serial LIKE 'FREQ%' ORDER BY serial DESC LIMIT 1").Scan(&maxSerial)
	if err == sql.ErrNoRows {
		return 0 // Start from beginning if no records
	}
	if err != nil {
		return 0 // Handle other errors gracefully
	}

	// Extract number from FREQ000001 format
	numStr := strings.TrimPrefix(maxSerial, "FREQ")
	if num, err := strconv.Atoi(numStr); err == nil {
		return num
	}
	return 0
}
