package repositories

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type SerialNumberRepository struct {
	db *sqlx.DB
}

func NewSerialNumberRepository(db *sqlx.DB) *SerialNumberRepository {
	return &SerialNumberRepository{db: db}
}

type SerialNumberRow struct {
	ID              int        `db:"id"               json:"id"`
	Prefix          string     `db:"prefix"           json:"prefix"`
	Number          int        `db:"number"           json:"number"`
	Serial          string     `db:"serial"           json:"serial"`
	Status          string     `db:"status"           json:"status"`
	AssignedTo      *uuid.UUID `db:"assigned_to"      json:"assigned_to,omitempty"`
	AllocatedUnitID *uuid.UUID `db:"allocated_unit_id" json:"allocated_unit_id,omitempty"`
}

// AllocationSummaryRow is one row in the AFSMO allocation dashboard.
type AllocationSummaryRow struct {
	Prefix          string     `db:"prefix" json:"prefix"`
	AllocatedUnitID *uuid.UUID `db:"allocated_unit_id" json:"allocated_unit_id"`
	UnitName        string     `db:"unit_name" json:"unit_name"`
	UnitCode        string     `db:"unit_code" json:"unit_code"`
	TotalAllocated  int        `db:"total_allocated" json:"total_allocated"`
	AvailableCount  int        `db:"available_count" json:"available_count"`
	UsedCount       int        `db:"used_count" json:"used_count"`
}

// GetNext returns the next `limit` available serial numbers for a given prefix.
// If unitIDs is non-empty, only serials allocated to one of those units are returned.
// If unitIDs is empty/nil, returns all available serials for the prefix (privileged callers only).
func (r *SerialNumberRepository) GetNext(prefix string, unitIDs []uuid.UUID, limit int) ([]SerialNumberRow, error) {
	if limit <= 0 || limit > 200 {
		limit = 25
	}
	var rows []SerialNumberRow
	var err error
	if len(unitIDs) > 0 {
		// Build $3, $4, … placeholders for the IN clause
		args := []interface{}{prefix, limit}
		placeholders := make([]string, len(unitIDs))
		for i, id := range unitIDs {
			args = append(args, id)
			placeholders[i] = fmt.Sprintf("$%d", i+3)
		}
		q := fmt.Sprintf(`
			SELECT id, prefix, number, serial, status, allocated_unit_id
			  FROM serial_numbers
			 WHERE status = 'available'
			   AND prefix = $1
			   AND allocated_unit_id IN (%s)
			   AND assigned_to IS NULL
			 ORDER BY number
			 LIMIT $2`, strings.Join(placeholders, ","))
		err = r.db.Select(&rows, q, args...)
	} else {
		err = r.db.Select(&rows,
			`SELECT id, prefix, number, serial, status
			   FROM serial_numbers
			  WHERE status = 'available' AND prefix = $1
			  ORDER BY number
			  LIMIT $2`,
			prefix, limit)
	}
	return rows, err
}

// GetPoolSummaryForUnits returns per-prefix availability for a set of units.
func (r *SerialNumberRepository) GetPoolSummaryForUnits(unitIDs []uuid.UUID) ([]AllocationSummaryRow, error) {
	if len(unitIDs) == 0 {
		return nil, nil
	}
	args := []interface{}{}
	placeholders := make([]string, len(unitIDs))
	for i, id := range unitIDs {
		args = append(args, id)
		placeholders[i] = fmt.Sprintf("$%d", i+1)
	}
	q := fmt.Sprintf(`
		SELECT
		    sn.prefix,
		    sn.allocated_unit_id,
		    COALESCE(u.name, '— Unallocated —') AS unit_name,
		    COALESCE(u.unit_code, '')            AS unit_code,
		    COUNT(*)                             AS total_allocated,
		    COUNT(*) FILTER (WHERE sn.assigned_to IS NULL) AS available_count,
		    COUNT(*) FILTER (WHERE sn.assigned_to IS NOT NULL) AS used_count
		FROM serial_numbers sn
		LEFT JOIN units u ON u.id = sn.allocated_unit_id
		WHERE sn.allocated_unit_id IN (%s)
		GROUP BY sn.prefix, sn.allocated_unit_id, u.name, u.unit_code
		ORDER BY sn.prefix, unit_name`, strings.Join(placeholders, ","))
	var rows []AllocationSummaryRow
	err := r.db.Select(&rows, q, args...)
	return rows, err
}

// GetAvailable returns all available serial numbers, optionally filtered by prefix.
func (r *SerialNumberRepository) GetAvailable(prefix string) ([]SerialNumberRow, error) {
	var rows []SerialNumberRow
	var err error
	if prefix != "" {
		err = r.db.Select(&rows,
			`SELECT id, prefix, number, serial, status
			   FROM serial_numbers
			  WHERE status = 'available' AND prefix = $1
			  ORDER BY prefix, number`,
			prefix)
	} else {
		err = r.db.Select(&rows,
			`SELECT id, prefix, number, serial, status
			   FROM serial_numbers
			  WHERE status = 'available'
			  ORDER BY prefix, number`)
	}
	return rows, err
}

// GetAllocationSummary returns per-unit allocation stats for each prefix.
// Includes one synthetic row per prefix for unallocated serials.
func (r *SerialNumberRepository) GetAllocationSummary(prefix string) ([]AllocationSummaryRow, error) {
	var rows []AllocationSummaryRow
	q := `
		SELECT
		    sn.prefix,
		    sn.allocated_unit_id,
		    COALESCE(u.name, '— Unallocated —') AS unit_name,
		    COALESCE(u.unit_code, '')            AS unit_code,
		    COUNT(*)                             AS total_allocated,
		    COUNT(*) FILTER (WHERE sn.assigned_to IS NULL) AS available_count,
		    COUNT(*) FILTER (WHERE sn.assigned_to IS NOT NULL) AS used_count
		FROM serial_numbers sn
		LEFT JOIN units u ON u.id = sn.allocated_unit_id`
	args := []interface{}{}
	if prefix != "" {
		q += ` WHERE sn.prefix = $1`
		args = append(args, prefix)
	}
	q += `
		GROUP BY sn.prefix, sn.allocated_unit_id, u.name, u.unit_code
		ORDER BY sn.prefix, unit_name`
	err := r.db.Select(&rows, q, args...)
	return rows, err
}

// AllocateToUnit assigns `count` unallocated, unassigned serials of the given prefix
// to the target unit. Returns the number of serials actually allocated.
func (r *SerialNumberRepository) AllocateToUnit(prefix string, unitID uuid.UUID, count int) (int, error) {
	if count <= 0 {
		return 0, fmt.Errorf("count must be positive")
	}
	result, err := r.db.Exec(`
		UPDATE serial_numbers
		SET allocated_unit_id = $1, updated_at = NOW()
		WHERE id IN (
		    SELECT id FROM serial_numbers
		     WHERE prefix = $2
		       AND allocated_unit_id IS NULL
		       AND assigned_to IS NULL
		       AND status = 'available'
		     ORDER BY number
		     LIMIT $3
		     FOR UPDATE SKIP LOCKED
		)`,
		unitID, prefix, count)
	if err != nil {
		return 0, err
	}
	n, _ := result.RowsAffected()
	return int(n), nil
}

// SubAllocateToUnit moves `count` unassigned serials of `prefix` from fromUnit's pool
// to toUnit's pool. Returns the number of serials actually moved.
func (r *SerialNumberRepository) SubAllocateToUnit(fromUnitID, toUnitID uuid.UUID, prefix string, count int) (int, error) {
	if count <= 0 {
		return 0, fmt.Errorf("count must be positive")
	}
	result, err := r.db.Exec(`
		UPDATE serial_numbers
		SET allocated_unit_id = $1, updated_at = NOW()
		WHERE id IN (
		    SELECT id FROM serial_numbers
		     WHERE prefix = $2
		       AND allocated_unit_id = $3
		       AND assigned_to IS NULL
		       AND status = 'available'
		     ORDER BY number
		     LIMIT $4
		     FOR UPDATE SKIP LOCKED
		)`,
		toUnitID, prefix, fromUnitID, count)
	if err != nil {
		return 0, err
	}
	n, _ := result.RowsAffected()
	return int(n), nil
}

// ReclaimFromUnit moves `count` unassigned serials back from toUnit to fromUnit.
// Pass count=0 to reclaim all unassigned serials.
func (r *SerialNumberRepository) ReclaimFromUnit(fromUnitID, toUnitID uuid.UUID, count int) (int, error) {
	var result interface {
		RowsAffected() (int64, error)
	}
	var err error
	if count <= 0 {
		result, err = r.db.Exec(`
			UPDATE serial_numbers
			SET allocated_unit_id = $1, updated_at = NOW()
			WHERE allocated_unit_id = $2 AND assigned_to IS NULL`,
			fromUnitID, toUnitID)
	} else {
		result, err = r.db.Exec(`
			UPDATE serial_numbers
			SET allocated_unit_id = $1, updated_at = NOW()
			WHERE id IN (
			    SELECT id FROM serial_numbers
			     WHERE allocated_unit_id = $2 AND assigned_to IS NULL
			     ORDER BY number DESC
			     LIMIT $3
			     FOR UPDATE SKIP LOCKED
			)`,
			fromUnitID, toUnitID, count)
	}
	if err != nil {
		return 0, err
	}
	n, _ := result.RowsAffected()
	return int(n), nil
}

// GetUnitPoolSummary returns per-prefix allocation stats for a specific unit's pool,
// including how much of that pool has been sub-allocated to child units.
func (r *SerialNumberRepository) GetUnitPoolSummary(unitID uuid.UUID) ([]AllocationSummaryRow, error) {
	var rows []AllocationSummaryRow
	err := r.db.Select(&rows, `
		SELECT
		    sn.prefix,
		    sn.allocated_unit_id,
		    COALESCE(u.name, '— Unallocated —') AS unit_name,
		    COALESCE(u.unit_code, '')            AS unit_code,
		    COUNT(*)                             AS total_allocated,
		    COUNT(*) FILTER (WHERE sn.assigned_to IS NULL) AS available_count,
		    COUNT(*) FILTER (WHERE sn.assigned_to IS NOT NULL) AS used_count
		FROM serial_numbers sn
		LEFT JOIN units u ON u.id = sn.allocated_unit_id
		WHERE sn.allocated_unit_id = $1
		GROUP BY sn.prefix, sn.allocated_unit_id, u.name, u.unit_code
		ORDER BY sn.prefix`, unitID)
	return rows, err
}

// DeallocateFromUnit removes the allocation tag from `count` unassigned serials
// belonging to the given unit. Pass count=0 to deallocate all unassigned serials.
func (r *SerialNumberRepository) DeallocateFromUnit(unitID uuid.UUID, count int) (int, error) {
	var result interface {
		RowsAffected() (int64, error)
	}
	var err error
	if count <= 0 {
		result, err = r.db.Exec(`
			UPDATE serial_numbers
			SET allocated_unit_id = NULL, updated_at = NOW()
			WHERE allocated_unit_id = $1 AND assigned_to IS NULL`,
			unitID)
	} else {
		result, err = r.db.Exec(`
			UPDATE serial_numbers
			SET allocated_unit_id = NULL, updated_at = NOW()
			WHERE id IN (
			    SELECT id FROM serial_numbers
			     WHERE allocated_unit_id = $1 AND assigned_to IS NULL
			     ORDER BY number DESC
			     LIMIT $2
			     FOR UPDATE SKIP LOCKED
			)`,
			unitID, count)
	}
	if err != nil {
		return 0, err
	}
	n, _ := result.RowsAffected()
	return int(n), nil
}
