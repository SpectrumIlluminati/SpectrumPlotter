// repositories/frequency_repository.go
package repositories

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"sfaf-plotter/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type FrequencyRepository struct {
	db *sqlx.DB
}

func NewFrequencyRepository(db *sqlx.DB) *FrequencyRepository {
	return &FrequencyRepository{db: db}
}

// ============================================
// Unit Operations
// ============================================

func (r *FrequencyRepository) CreateUnit(unit *models.Unit) error {
	query := `
		INSERT INTO units (
			name, unit_code, parent_unit_id, unit_type, organization, location,
			commander_name, commander_email, s6_poc_name, s6_poc_email, s6_poc_phone,
			installation_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, created_at, updated_at`

	return r.db.QueryRowx(query,
		unit.Name, unit.UnitCode, unit.ParentUnitID, unit.UnitType, unit.Organization,
		unit.Location, unit.CommanderName, unit.CommanderEmail, unit.CommPocName,
		unit.CommPocEmail, unit.CommPocPhone, unit.InstallationID,
	).Scan(&unit.ID, &unit.CreatedAt, &unit.UpdatedAt)
}

func (r *FrequencyRepository) GetUnitByID(id uuid.UUID) (*models.Unit, error) {
	var unit models.Unit
	query := `SELECT * FROM units WHERE id = $1 AND is_active = true`
	err := r.db.Get(&unit, query, id)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("unit not found")
	}
	return &unit, err
}

func (r *FrequencyRepository) GetUnitByCode(unitCode string) (*models.Unit, error) {
	var unit models.Unit
	query := `SELECT * FROM units WHERE unit_code = $1 AND is_active = true`
	err := r.db.Get(&unit, query, unitCode)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("unit not found")
	}
	return &unit, err
}

func (r *FrequencyRepository) GetUserUnits(userID uuid.UUID) ([]models.Unit, error) {
	var units []models.Unit
	query := `
		SELECT u.* FROM units u
		INNER JOIN user_units uu ON u.id = uu.unit_id
		WHERE uu.user_id = $1 AND u.is_active = true
		ORDER BY uu.is_primary DESC, u.name`
	err := r.db.Select(&units, query, userID)
	return units, err
}

// GetUserPrimaryUnit returns the user's primary unit regardless of type, or nil if none.
func (r *FrequencyRepository) GetUserPrimaryUnit(userID uuid.UUID) (*models.Unit, error) {
	var unit models.Unit
	err := r.db.Get(&unit, `
		SELECT u.* FROM units u
		INNER JOIN user_units uu ON u.id = uu.unit_id
		WHERE uu.user_id = $1
		  AND u.is_active = true
		ORDER BY uu.is_primary DESC, u.name
		LIMIT 1`, userID)
	if err != nil {
		return nil, err // sql.ErrNoRows — caller checks nil
	}
	return &unit, nil
}

// GetUserISMUnit returns the ISM-type unit the user belongs to, or nil if none.
// Serials are only ever allocated to ISM units, so this is the authoritative
// lookup for determining which serial pool a user can access.
func (r *FrequencyRepository) GetUserISMUnit(userID uuid.UUID) (*models.Unit, error) {
	var unit models.Unit
	err := r.db.Get(&unit, `
		SELECT u.* FROM units u
		INNER JOIN user_units uu ON u.id = uu.unit_id
		WHERE uu.user_id = $1
		  AND u.is_active = true
		  AND u.unit_type = 'ISM'
		ORDER BY uu.is_primary DESC, u.name
		LIMIT 1`, userID)
	if err != nil {
		return nil, err
	}
	return &unit, nil
}

func (r *FrequencyRepository) GetAllUnits() ([]models.Unit, error) {
	var units []models.Unit
	query := `SELECT * FROM units WHERE is_active = true ORDER BY organization, name`
	err := r.db.Select(&units, query)
	return units, err
}

func (r *FrequencyRepository) GetMajcomUnits() ([]models.Unit, error) {
	var units []models.Unit
	err := r.db.Select(&units,
		`SELECT * FROM units WHERE is_active = true AND unit_type = 'MAJCOM' ORDER BY name`)
	return units, err
}

// GetSubordinateUnits returns all active units whose parent_unit_id matches the given unit.
func (r *FrequencyRepository) GetSubordinateUnits(parentUnitID uuid.UUID) ([]models.Unit, error) {
	var units []models.Unit
	err := r.db.Select(&units,
		`SELECT * FROM units WHERE is_active = true AND parent_unit_id = $1 ORDER BY name`,
		parentUnitID)
	return units, err
}

func (r *FrequencyRepository) UpdateUnit(unit *models.Unit) error {
	unit.UpdatedAt = time.Now()
	query := `
		UPDATE units SET
			name = $1, parent_unit_id = $2, unit_type = $3, organization = $4,
			location = $5, commander_name = $6, commander_email = $7,
			s6_poc_name = $8, s6_poc_email = $9, s6_poc_phone = $10,
			installation_id = $11, updated_at = $12
		WHERE id = $13 AND is_active = true`

	result, err := r.db.Exec(query,
		unit.Name, unit.ParentUnitID, unit.UnitType, unit.Organization, unit.Location,
		unit.CommanderName, unit.CommanderEmail, unit.CommPocName, unit.CommPocEmail,
		unit.CommPocPhone, unit.InstallationID, unit.UpdatedAt, unit.ID,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("unit not found")
	}
	return nil
}

func (r *FrequencyRepository) DeleteUnit(id uuid.UUID) error {
	query := `UPDATE units SET is_active = false WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func (r *FrequencyRepository) SearchUnitsByName(query string) ([]models.Unit, error) {
	var units []models.Unit
	err := r.db.Select(&units, `
		SELECT * FROM units
		WHERE (name ILIKE $1 OR unit_code ILIKE $1) AND is_active = true
		ORDER BY name LIMIT 10`,
		"%"+query+"%")
	return units, err
}

// ============================================
// User-Unit Assignment Operations
// ============================================

func (r *FrequencyRepository) AssignUserToUnit(userID, unitID uuid.UUID, role string, isPrimary bool, assignedBy *uuid.UUID) error {
	query := `
		INSERT INTO user_units (user_id, unit_id, role, is_primary, assigned_by)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id, unit_id) DO UPDATE
		SET role = $3, is_primary = $4, assigned_at = CURRENT_TIMESTAMP`

	_, err := r.db.Exec(query, userID, unitID, role, isPrimary, assignedBy)
	return err
}

func (r *FrequencyRepository) RemoveUserFromUnit(userID, unitID uuid.UUID) error {
	query := `DELETE FROM user_units WHERE user_id = $1 AND unit_id = $2`
	_, err := r.db.Exec(query, userID, unitID)
	return err
}

func (r *FrequencyRepository) GetUnitMembers(unitID uuid.UUID) ([]models.User, error) {
	var users []models.User
	query := `
		SELECT u.* FROM users u
		INNER JOIN user_units uu ON u.id = uu.user_id
		WHERE uu.unit_id = $1 AND u.is_active = true
		ORDER BY uu.role, u.full_name`
	err := r.db.Select(&users, query, unitID)
	return users, err
}

// ============================================
// Frequency Assignment Operations
// ============================================

func (r *FrequencyRepository) CreateFrequencyAssignment(assignment *models.FrequencyAssignment) error {
	query := `
		INSERT INTO frequency_assignments (
			unit_id, serial, sfaf_record_type, frequency, frequency_mhz, assignment_type,
			purpose, net_name, callsign, emission_designator, bandwidth, power_watts,
			authorized_radius_km, assignment_date, expiration_date, assignment_authority,
			authorization_number, priority, is_encrypted, encryption_type, classification,
			notes, created_by, routed_to_workbox, pool_serial
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
		RETURNING id, created_at, updated_at`

	return r.db.QueryRowx(query,
		assignment.UnitID, assignment.Serial, assignment.SFAFRecordType,
		assignment.Frequency, assignment.FrequencyMhz, assignment.AssignmentType,
		assignment.Purpose, assignment.NetName, assignment.Callsign, assignment.EmissionDesignator,
		assignment.Bandwidth, assignment.PowerWatts, assignment.AuthorizedRadiusKm,
		assignment.AssignmentDate, assignment.ExpirationDate, assignment.AssignmentAuthority,
		assignment.AuthorizationNumber, assignment.Priority, assignment.IsEncrypted,
		assignment.EncryptionType, assignment.Classification, assignment.Notes, assignment.CreatedBy,
		assignment.RoutedToWorkbox, assignment.PoolSerial,
	).Scan(&assignment.ID, &assignment.CreatedAt, &assignment.UpdatedAt)
}

func (r *FrequencyRepository) GetFrequencyAssignmentByID(id uuid.UUID) (*models.FrequencyAssignment, error) {
	var assignment models.FrequencyAssignment
	query := `SELECT * FROM frequency_assignments WHERE id = $1`
	err := r.db.Get(&assignment, query, id)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("frequency assignment not found")
	}
	return &assignment, err
}

func (r *FrequencyRepository) GetUnitFrequencyAssignments(unitID uuid.UUID) ([]models.FrequencyAssignment, error) {
	var assignments []models.FrequencyAssignment
	query := `
		SELECT * FROM frequency_assignments
		WHERE unit_id = $1 AND is_active = true
		ORDER BY assignment_type, frequency_mhz`
	err := r.db.Select(&assignments, query, unitID)
	return assignments, err
}

func (r *FrequencyRepository) GetUserUnitFrequencyAssignments(userID uuid.UUID) ([]models.FrequencyAssignment, error) {
	var assignments []models.FrequencyAssignment
	query := `
		SELECT fa.* FROM frequency_assignments fa
		INNER JOIN user_units uu ON fa.unit_id = uu.unit_id
		WHERE uu.user_id = $1 AND fa.is_active = true
		ORDER BY fa.assignment_type, fa.frequency_mhz`
	err := r.db.Select(&assignments, query, userID)
	return assignments, err
}

func (r *FrequencyRepository) GetExpiringAssignments(daysThreshold int) ([]models.FrequencyAssignment, error) {
	var assignments []models.FrequencyAssignment
	query := `
		SELECT * FROM frequency_assignments
		WHERE is_active = true
		AND expiration_date IS NOT NULL
		AND expiration_date <= CURRENT_DATE + $1 * INTERVAL '1 day'
		AND expiration_date >= CURRENT_DATE
		ORDER BY expiration_date`
	err := r.db.Select(&assignments, query, daysThreshold)
	return assignments, err
}

func (r *FrequencyRepository) UpdateFrequencyAssignment(assignment *models.FrequencyAssignment) error {
	assignment.UpdatedAt = time.Now()
	query := `
		UPDATE frequency_assignments SET
			frequency = $1, frequency_mhz = $2, assignment_type = $3, purpose = $4,
			net_name = $5, callsign = $6, emission_designator = $7, bandwidth = $8,
			power_watts = $9, authorized_radius_km = $10, assignment_date = $11,
			expiration_date = $12, assignment_authority = $13, authorization_number = $14,
			priority = $15, is_encrypted = $16, encryption_type = $17, classification = $18,
			notes = $19, updated_at = $20
		WHERE id = $21 AND is_active = true`

	result, err := r.db.Exec(query,
		assignment.Frequency, assignment.FrequencyMhz, assignment.AssignmentType, assignment.Purpose,
		assignment.NetName, assignment.Callsign, assignment.EmissionDesignator, assignment.Bandwidth,
		assignment.PowerWatts, assignment.AuthorizedRadiusKm, assignment.AssignmentDate,
		assignment.ExpirationDate, assignment.AssignmentAuthority, assignment.AuthorizationNumber,
		assignment.Priority, assignment.IsEncrypted, assignment.EncryptionType, assignment.Classification,
		assignment.Notes, assignment.UpdatedAt, assignment.ID,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("frequency assignment not found")
	}
	return nil
}

func (r *FrequencyRepository) DeactivateFrequencyAssignment(id uuid.UUID) error {
	query := `UPDATE frequency_assignments SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

// RetractProposalAssignment deactivates a P or S proposal, verifying the caller
// created it.  Final assignments (A/T) cannot be retracted this way.
// If a linked FrequencyRequest exists it is reset to 'pending'.
// If no linked request exists a new pending request is synthesised from the
// assignment data so the item always returns to the workbox action items.
// Returns the number of requests that ended up (back) in the workbox.
func (r *FrequencyRepository) RetractProposalAssignment(id uuid.UUID, createdBy uuid.UUID) (int64, error) {
	tx, err := r.db.Beginx()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	// Fetch the assignment before deactivating so we can rebuild a request if needed.
	var a models.FrequencyAssignment
	if err = tx.Get(&a, `SELECT * FROM frequency_assignments WHERE id = $1`, id); err != nil {
		return 0, fmt.Errorf("proposal not found")
	}
	// Only P/S proposals can be retracted (A/T are final assignments).
	if (a.SFAFRecordType != "P" && a.SFAFRecordType != "S") || !a.IsActive {
		return 0, fmt.Errorf("cannot retract: only active P/S proposals may be retracted")
	}

	if _, err = tx.Exec(`UPDATE frequency_assignments SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, id); err != nil {
		return 0, err
	}

	// Try to reset a linked request first.
	linked, err := tx.Exec(`
		UPDATE frequency_requests
		SET status = 'pending', assignment_id = NULL, updated_at = CURRENT_TIMESTAMP
		WHERE assignment_id = $1`, id)
	if err != nil {
		return 0, err
	}
	resetCount, _ := linked.RowsAffected()

	// No linked request — synthesise one from the assignment so the item always
	// appears in the workbox action items inbox.
	if resetCount == 0 {
		purpose := ""
		if a.Purpose != nil {
			purpose = *a.Purpose
		}
		justification := "Retracted from submitted proposals — pending re-issuance"
		if a.Notes != nil && *a.Notes != "" {
			justification = *a.Notes
		}
		startDate := time.Now()
		if a.AssignmentDate != nil {
			startDate = *a.AssignmentDate
		}
		req := &models.FrequencyRequest{
			UnitID:             a.UnitID,
			RequestedBy:        createdBy,
			RequestType:        "new_assignment",
			Status:             "pending",
			Priority:           a.Priority,
			RequestedFrequency: &a.Frequency,
			Purpose:            purpose,
			AssignmentType:     &a.AssignmentType,
			NetName:            a.NetName,
			Callsign:           a.Callsign,
			EmissionDesignator: a.EmissionDesignator,
			Bandwidth:          a.Bandwidth,
			PowerWatts:         a.PowerWatts,
			AuthorizedRadiusKm: a.AuthorizedRadiusKm,
			StartDate:          startDate,
			EndDate:            a.ExpirationDate,
			IsEncrypted:        a.IsEncrypted,
			EncryptionType:     a.EncryptionType,
			Classification:     a.Classification,
			Justification:      justification,
		}
		var newID uuid.UUID
		var createdAt, updatedAt time.Time
		err = tx.QueryRowx(`
			INSERT INTO frequency_requests (
				unit_id, requested_by, request_type, status, priority, requested_frequency,
				purpose, net_name, callsign, assignment_type, emission_designator, bandwidth,
				power_watts, authorized_radius_km, start_date, end_date,
				is_encrypted, encryption_type, classification, justification
			) VALUES (
				$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
			) RETURNING id, created_at, updated_at`,
			req.UnitID, req.RequestedBy, req.RequestType, req.Status, req.Priority,
			req.RequestedFrequency, req.Purpose, req.NetName, req.Callsign, req.AssignmentType,
			req.EmissionDesignator, req.Bandwidth, req.PowerWatts, req.AuthorizedRadiusKm,
			req.StartDate, req.EndDate, req.IsEncrypted, req.EncryptionType,
			req.Classification, req.Justification,
		).Scan(&newID, &createdAt, &updatedAt)
		if err != nil {
			return 0, fmt.Errorf("failed to create workbox request: %w", err)
		}
		resetCount = 1
	}

	return resetCount, tx.Commit()
}

// ============================================
// Frequency Request Operations
// ============================================

func (r *FrequencyRepository) CreateFrequencyRequest(request *models.FrequencyRequest) error {
	query := `
		INSERT INTO frequency_requests (
			unit_id, requested_by, request_type, status, priority, requested_frequency,
			frequency_range_min, frequency_range_max, purpose, net_name, callsign,
			assignment_type, emission_designator, bandwidth, power_watts,
			antenna_make_model, antenna_type, antenna_gain_dbi, antenna_polarization, antenna_orientation,
			tx_horiz_beamwidth_deg, tx_vert_beamwidth_deg, rx_horiz_beamwidth_deg, rx_vert_beamwidth_deg,
			coverage_area, operating_area_geojson, authorized_radius_km, operating_area_applies_to,
			start_date, end_date, hours_of_operation,
			num_transmitters, num_receivers, is_encrypted, encryption_type, classification,
			requires_coordination, coordination_notes, justification, stop_buzzer, mission_impact
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
			$16, $17, $18, $19, $20,
			$21, $22, $23, $24,
			$25, $26, $27, $28, $29, $30,
			$31, $32, $33, $34, $35,
			$36, $37, $38, $39, $40, $41
		)
		RETURNING id, created_at, updated_at`

	return r.db.QueryRowx(query,
		request.UnitID, request.RequestedBy, request.RequestType, request.Status, request.Priority,
		request.RequestedFrequency, request.FrequencyRangeMin, request.FrequencyRangeMax,
		request.Purpose, request.NetName, request.Callsign, request.AssignmentType,
		request.EmissionDesignator, request.Bandwidth, request.PowerWatts,
		request.AntennaMakeModel, request.AntennaType, request.AntennaGainDbi, request.AntennaPolarization, request.AntennaOrientation,
		request.TxHorizBeamwidthDeg, request.TxVertBeamwidthDeg, request.RxHorizBeamwidthDeg, request.RxVertBeamwidthDeg,
		request.CoverageArea, request.OperatingAreaGeoJSON, request.AuthorizedRadiusKm, request.OperatingAreaAppliesTo,
		request.StartDate, request.EndDate, request.HoursOfOperation,
		request.NumTransmitters, request.NumReceivers, request.IsEncrypted, request.EncryptionType,
		request.Classification, request.RequiresCoordination, request.CoordinationNotes,
		request.Justification, request.StopBuzzer, request.MissionImpact,
	).Scan(&request.ID, &request.CreatedAt, &request.UpdatedAt)
}

func (r *FrequencyRepository) GetFrequencyRequestByID(id uuid.UUID) (*models.FrequencyRequest, error) {
	var request models.FrequencyRequest
	query := `SELECT * FROM frequency_requests WHERE id = $1`
	err := r.db.Get(&request, query, id)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("frequency request not found")
	}
	return &request, err
}

func (r *FrequencyRepository) GetUnitFrequencyRequests(unitID uuid.UUID) ([]models.FrequencyRequest, error) {
	var requests []models.FrequencyRequest
	query := `
		SELECT * FROM frequency_requests
		WHERE unit_id = $1
		ORDER BY priority DESC, created_at DESC`
	err := r.db.Select(&requests, query, unitID)
	return requests, err
}

func (r *FrequencyRepository) GetUserFrequencyRequests(userID uuid.UUID) ([]models.FrequencyRequest, error) {
	var requests []models.FrequencyRequest
	query := `
		SELECT * FROM frequency_requests
		WHERE requested_by = $1
		ORDER BY created_at DESC`
	err := r.db.Select(&requests, query, userID)
	return requests, err
}

func (r *FrequencyRepository) GetPendingRequests() ([]models.FrequencyRequest, error) {
	var requests []models.FrequencyRequest
	query := `
		SELECT * FROM frequency_requests
		WHERE status IN ('pending', 'under_review')
		ORDER BY priority DESC, created_at`
	err := r.db.Select(&requests, query)
	return requests, err
}

// DeleteFrequencyRequest permanently removes a cancelled or denied request.
// Admins may delete any qualifying request; others may only delete their own.
func (r *FrequencyRepository) DeleteFrequencyRequest(id uuid.UUID, requestedBy uuid.UUID, isAdmin bool) error {
	var result sql.Result
	var err error
	if isAdmin {
		result, err = r.db.Exec(`
			DELETE FROM frequency_requests
			WHERE id = $1 AND status IN ('cancelled', 'denied')`, id)
	} else {
		result, err = r.db.Exec(`
			DELETE FROM frequency_requests
			WHERE id = $1 AND requested_by = $2 AND status IN ('cancelled', 'denied')`, id, requestedBy)
	}
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("request not found, not owned by you, or cannot be deleted in its current state")
	}
	return nil
}

// RetractFrequencyRequest cancels a request, verifying ownership and that it
// hasn't already been approved, denied, or cancelled.
func (r *FrequencyRepository) RetractFrequencyRequest(id uuid.UUID, requestedBy uuid.UUID) error {
	now := time.Now()
	result, err := r.db.Exec(`
		UPDATE frequency_requests
		SET status = 'cancelled', updated_at = $1
		WHERE id = $2
		  AND requested_by = $3
		  AND status IN ('pending', 'under_review')`,
		now, id, requestedBy)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("request not found, not owned by you, or cannot be retracted in its current state")
	}
	return nil
}

// ResubmitFrequencyRequest updates a denied request's fields and resets it to pending.
// Only the owning user may call this, and only while the request is in 'denied' state.
func (r *FrequencyRepository) ResubmitFrequencyRequest(id uuid.UUID, requestedBy uuid.UUID, input models.CreateFrequencyRequestInput) (*models.FrequencyRequest, error) {
	var req models.FrequencyRequest
	err := r.db.Get(&req, `
		UPDATE frequency_requests SET
			request_type          = $1,
			priority              = $2,
			requested_frequency   = NULLIF($3, ''),
			frequency_range_min   = $4,
			frequency_range_max   = $5,
			purpose               = $6,
			net_name              = NULLIF($7, ''),
			callsign              = NULLIF($8, ''),
			assignment_type       = NULLIF($9, ''),
			emission_designator   = NULLIF($10, ''),
			bandwidth             = NULLIF($11, ''),
			power_watts           = $12,
			antenna_make_model    = NULLIF($13, ''),
			antenna_type          = NULLIF($14, ''),
			antenna_gain_dbi      = $15,
			antenna_polarization  = NULLIF($16, ''),
			antenna_orientation   = NULLIF($17, ''),
			tx_horiz_beamwidth_deg = $18,
			tx_vert_beamwidth_deg  = $19,
			rx_horiz_beamwidth_deg = $20,
			rx_vert_beamwidth_deg  = $21,
			coverage_area              = NULLIF($22, ''),
			authorized_radius_km       = $23,
			operating_area_applies_to  = $24,
			start_date                 = $25,
			end_date                   = $26,
			hours_of_operation         = NULLIF($27, ''),
			num_transmitters           = $28,
			num_receivers              = $29,
			is_encrypted               = $30,
			encryption_type            = NULLIF($31, ''),
			classification             = $32,
			requires_coordination      = $33,
			coordination_notes         = NULLIF($34, ''),
			justification              = $35,
			stop_buzzer                = NULLIF($36, ''),
			mission_impact             = NULLIF($37, ''),
			status                     = 'pending',
			denied_reason              = NULL,
			review_notes               = NULL,
			reviewed_by                = NULL,
			reviewed_at                = NULL,
			updated_at                 = NOW()
		WHERE id = $38 AND requested_by = $39 AND status = 'denied'
		RETURNING *`,
		input.RequestType,
		input.Priority,
		input.RequestedFrequency,
		input.FrequencyRangeMin,
		input.FrequencyRangeMax,
		input.Purpose,
		input.NetName,
		input.Callsign,
		input.AssignmentType,
		input.EmissionDesignator,
		input.Bandwidth,
		input.PowerWatts,
		input.AntennaMakeModel,
		input.AntennaType,
		input.AntennaGainDbi,
		input.AntennaPolarization,
		input.AntennaOrientation,
		input.TxHorizBeamwidthDeg,
		input.TxVertBeamwidthDeg,
		input.RxHorizBeamwidthDeg,
		input.RxVertBeamwidthDeg,
		input.CoverageArea,
		input.AuthorizedRadiusKm,
		input.OperatingAreaAppliesTo,
		input.StartDate,
		input.EndDate,
		input.HoursOfOperation,
		input.NumTransmitters,
		input.NumReceivers,
		input.IsEncrypted,
		input.EncryptionType,
		input.Classification,
		input.RequiresCoordination,
		input.CoordinationNotes,
		input.Justification,
		input.StopBuzzer,
		input.MissionImpact,
		id,
		requestedBy,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("request not found, not owned by you, or not in denied state")
	}
	if err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *FrequencyRepository) UpdateFrequencyRequestStatus(
	id uuid.UUID,
	status string,
	reviewedBy *uuid.UUID,
	reviewNotes, approvalNotes, deniedReason string,
) error {
	now := time.Now()
	query := `
		UPDATE frequency_requests SET
			status = $1,
			reviewed_by = $2,
			reviewed_at = $3,
			review_notes = $4,
			approval_notes = $5,
			denied_reason = $6,
			updated_at = $7
		WHERE id = $8`

	_, err := r.db.Exec(query, status, reviewedBy, now, reviewNotes, approvalNotes, deniedReason, now, id)
	return err
}

func (r *FrequencyRepository) ApproveFrequencyRequest(id uuid.UUID, approvedBy uuid.UUID, assignmentID uuid.UUID) error {
	now := time.Now()
	query := `
		UPDATE frequency_requests SET
			status = 'approved',
			approved_by = $1,
			approved_at = $2,
			assignment_id = $3,
			updated_at = $4
		WHERE id = $5`

	_, err := r.db.Exec(query, approvedBy, now, assignmentID, now, id)
	return err
}

// ============================================
// Search and Query Operations
// ============================================

func (r *FrequencyRepository) SearchAvailableFrequencies(query *models.FrequencySearchQuery) ([]models.FrequencyAssignment, error) {
	// Build dynamic query based on search criteria
	conditions := []string{"is_active = true"}
	args := []interface{}{}
	argCount := 1

	if query.MinFrequency != nil {
		conditions = append(conditions, fmt.Sprintf("frequency_mhz >= $%d", argCount))
		args = append(args, *query.MinFrequency)
		argCount++
	}

	if query.MaxFrequency != nil {
		conditions = append(conditions, fmt.Sprintf("frequency_mhz <= $%d", argCount))
		args = append(args, *query.MaxFrequency)
		argCount++
	}

	if query.ExcludeUnitID != nil {
		conditions = append(conditions, fmt.Sprintf("unit_id != $%d", argCount))
		args = append(args, *query.ExcludeUnitID)
		argCount++
	}

	sqlQuery := fmt.Sprintf(`
		SELECT * FROM frequency_assignments
		WHERE %s
		ORDER BY frequency_mhz`,
		strings.Join(conditions, " AND "),
	)

	var assignments []models.FrequencyAssignment
	err := r.db.Select(&assignments, sqlQuery, args...)
	return assignments, err
}

// GetAssignmentsInRange returns all active assignments whose frequency falls within
// [minMhz, maxMhz], ordered by frequency ascending. Includes all record types (A/T/P/S).
func (r *FrequencyRepository) GetAssignmentsInRange(minMhz, maxMhz float64) ([]models.FrequencyAssignment, error) {
	var assignments []models.FrequencyAssignment
	err := r.db.Select(&assignments, `
		SELECT * FROM frequency_assignments
		WHERE is_active = true
		  AND frequency_mhz >= $1
		  AND frequency_mhz <= $2
		ORDER BY frequency_mhz ASC`, minMhz, maxMhz)
	return assignments, err
}

// GetSubmittedAssignments returns all active assignments created by the given user.
func (r *FrequencyRepository) GetSubmittedAssignments(userID uuid.UUID) ([]models.FrequencyAssignment, error) {
	var assignments []models.FrequencyAssignment
	err := r.db.Select(&assignments, `
		SELECT * FROM frequency_assignments
		WHERE created_by = $1 AND is_active = true
		ORDER BY created_at DESC`, userID)
	return assignments, err
}

// GetProposalAssignments returns active P/S proposals visible to the requesting user.
// agency/ntia/admin (roleLevel >= 5) see all proposals.
// ISM and below see all proposals; workbox-level filtering is done in the UI via routed_to_workbox.
func (r *FrequencyRepository) GetProposalAssignments(userID uuid.UUID, roleLevel int) ([]models.FrequencyAssignment, error) {
	var assignments []models.FrequencyAssignment
	err := r.db.Select(&assignments, `
		SELECT * FROM frequency_assignments
		WHERE sfaf_record_type IN ('P', 'S') AND is_active = true
		ORDER BY created_at DESC`)
	return assignments, err
}

// ElevateAssignment promotes P→A or S→T and records who approved it
func (r *FrequencyRepository) ElevateAssignment(id uuid.UUID, elevatedBy uuid.UUID, notes string) error {
	now := time.Now()
	query := `
		UPDATE frequency_assignments SET
			sfaf_record_type = CASE
				WHEN sfaf_record_type = 'P' THEN 'A'
				WHEN sfaf_record_type = 'S' THEN 'T'
				ELSE sfaf_record_type
			END,
			approved_by = $1,
			notes       = CASE WHEN $3 <> '' THEN $3 ELSE notes END,
			updated_at  = $2
		WHERE id = $4 AND sfaf_record_type IN ('P', 'S') AND is_active = true`
	result, err := r.db.Exec(query, elevatedBy, now, notes, id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("proposal not found or already a final assignment")
	}
	return nil
}

// GetFiveYearReviews returns permanent assignments (type 'A') scoped to the given
// installation that are due for 5-year review (assignment_date + 5 years within
// the next 6 months, or already overdue). If installationID is nil, returns all.
func (r *FrequencyRepository) GetFiveYearReviews(installationID *uuid.UUID) ([]models.FrequencyAssignment, error) {
	var assignments []models.FrequencyAssignment
	var err error
	if installationID != nil {
		err = r.db.Select(&assignments, `
			SELECT fa.* FROM frequency_assignments fa
			JOIN units u ON u.id = fa.unit_id
			WHERE fa.sfaf_record_type = 'A'
			  AND fa.is_active = true
			  AND fa.assignment_date IS NOT NULL
			  AND fa.assignment_date + INTERVAL '5 years' <= CURRENT_DATE + INTERVAL '6 months'
			  AND u.installation_id = $1
			ORDER BY fa.assignment_date ASC`, installationID)
	} else {
		err = r.db.Select(&assignments, `
			SELECT * FROM frequency_assignments
			WHERE sfaf_record_type = 'A'
			  AND is_active = true
			  AND assignment_date IS NOT NULL
			  AND assignment_date + INTERVAL '5 years' <= CURRENT_DATE + INTERVAL '6 months'
			ORDER BY assignment_date ASC`)
	}
	return assignments, err
}

// CleanupOrphanedAssignments deletes frequency assignments that don't have corresponding SFAF/marker records
func (r *FrequencyRepository) CleanupOrphanedAssignments() (int64, error) {
	query := `
		DELETE FROM frequency_assignments fa
		WHERE NOT EXISTS (
			SELECT 1
			FROM sfafs s
			WHERE s.field102 = fa.serial
		)
		AND NOT EXISTS (
			SELECT 1
			FROM markers m
			WHERE m.serial = fa.serial
		)
	`

	result, err := r.db.Exec(query)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected()
}

// BulkRouteAssignments sets routed_to_workbox on the given P/S proposal IDs.
// Passing nil for workbox clears the routing (unroutes).
// Only updates records owned by ownerID unless ownerID is nil (admin bypass).
func (r *FrequencyRepository) BulkRouteAssignments(ids []uuid.UUID, workbox *string, ownerID *uuid.UUID) (int64, error) {
	if len(ids) == 0 {
		return 0, nil
	}
	placeholders := make([]string, len(ids))
	args := make([]interface{}, 0, len(ids)+2)
	args = append(args, workbox)
	args = append(args, time.Now())
	for i, id := range ids {
		placeholders[i] = fmt.Sprintf("$%d", i+3)
		args = append(args, id)
	}
	ownerClause := ""
	if ownerID != nil {
		args = append(args, *ownerID)
		ownerClause = fmt.Sprintf(" AND created_by = $%d", len(args))
	}
	query := fmt.Sprintf(`
		UPDATE frequency_assignments
		SET routed_to_workbox = $1, updated_at = $2
		WHERE id IN (%s)
		  AND sfaf_record_type IN ('P', 'S')
		  AND is_active = true%s`,
		strings.Join(placeholders, ","), ownerClause)
	result, err := r.db.Exec(query, args...)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

// ── Lateral coordination ──────────────────────────────────────────────────────

// SetCoordinations replaces the full set of coordinated workboxes for an assignment.
// Pass an empty slice to clear all coordinations.
func (r *FrequencyRepository) SetCoordinations(assignmentID uuid.UUID, workboxes []string) error {
	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err = tx.Exec(`DELETE FROM assignment_coordinations WHERE assignment_id = $1`, assignmentID); err != nil {
		return err
	}
	for _, wb := range workboxes {
		if _, err = tx.Exec(
			`INSERT INTO assignment_coordinations (assignment_id, workbox) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			assignmentID, wb,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// GetCoordinations returns the list of coordinated workboxes for an assignment.
func (r *FrequencyRepository) GetCoordinations(assignmentID uuid.UUID) ([]string, error) {
	var workboxes []string
	err := r.db.Select(&workboxes,
		`SELECT workbox FROM assignment_coordinations WHERE assignment_id = $1 ORDER BY added_at`,
		assignmentID)
	return workboxes, err
}

// ── Comment log ───────────────────────────────────────────────────────────────

// AddComment inserts a new comment into the assignment comment log.
func (r *FrequencyRepository) AddComment(c *models.AssignmentComment) error {
	return r.db.QueryRowx(`
		INSERT INTO assignment_comments (assignment_id, created_by, workbox, body)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at`,
		c.AssignmentID, c.CreatedBy, c.Workbox, c.Body,
	).Scan(&c.ID, &c.CreatedAt)
}

// GetComments returns all comments for an assignment, oldest first, with author name joined.
func (r *FrequencyRepository) GetComments(assignmentID uuid.UUID) ([]models.AssignmentComment, error) {
	var comments []models.AssignmentComment
	err := r.db.Select(&comments, `
		SELECT ac.id, ac.assignment_id, ac.created_by, ac.workbox, ac.body, ac.created_at,
		       COALESCE(u.full_name, '') AS author_name
		FROM assignment_comments ac
		LEFT JOIN users u ON u.id = ac.created_by
		WHERE ac.assignment_id = $1
		ORDER BY ac.created_at ASC`,
		assignmentID)
	return comments, err
}

// ── Request-level comment log and coordinations ───────────────────────────────

// AddRequestComment inserts a new comment into the request status log.
func (r *FrequencyRepository) AddRequestComment(c *models.RequestComment) error {
	return r.db.QueryRowx(`
		INSERT INTO request_comments (request_id, created_by, workbox, body)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at`,
		c.RequestID, c.CreatedBy, c.Workbox, c.Body,
	).Scan(&c.ID, &c.CreatedAt)
}

// GetRequestComments returns all comments for a request, oldest first.
func (r *FrequencyRepository) GetRequestComments(requestID uuid.UUID) ([]models.RequestComment, error) {
	var comments []models.RequestComment
	err := r.db.Select(&comments, `
		SELECT rc.id, rc.request_id, rc.created_by, rc.workbox, rc.body, rc.created_at,
		       COALESCE(u.full_name, '') AS author_name
		FROM request_comments rc
		LEFT JOIN users u ON u.id = rc.created_by
		WHERE rc.request_id = $1
		ORDER BY rc.created_at ASC`,
		requestID)
	return comments, err
}

// SetRequestCoordinations replaces the full set of coordinated workboxes for a request.
func (r *FrequencyRepository) SetRequestCoordinations(requestID uuid.UUID, workboxes []string) error {
	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err = tx.Exec(`DELETE FROM request_coordinations WHERE request_id = $1`, requestID); err != nil {
		return err
	}
	for _, wb := range workboxes {
		if _, err = tx.Exec(
			`INSERT INTO request_coordinations (request_id, workbox) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			requestID, wb,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// GetRequestCoordinations returns the list of coordinated workboxes for a request.
func (r *FrequencyRepository) GetRequestCoordinations(requestID uuid.UUID) ([]string, error) {
	var workboxes []string
	err := r.db.Select(&workboxes,
		`SELECT workbox FROM request_coordinations WHERE request_id = $1 ORDER BY added_at`,
		requestID)
	return workboxes, err
}

// PublicUnit is a minimal projection used by the public account-request dropdown.
type PublicUnit struct {
	ID           string `json:"id" db:"id"`
	Name         string `json:"name" db:"name"`
	UnitCode     string `json:"unit_code" db:"unit_code"`
	Organization string `json:"organization" db:"organization"`
}

// GetPublicUnits returns id, name, unit_code, and organization for all active units.
// If installationID is non-empty the results are filtered to that installation.
// Intended for unauthenticated dropdowns.
func (r *FrequencyRepository) GetPublicUnits(installationID string) ([]PublicUnit, error) {
	var units []PublicUnit
	var err error
	if installationID != "" {
		err = r.db.Select(&units, `
			SELECT id::text, name, unit_code,
			       COALESCE(organization, '') AS organization
			FROM units
			WHERE is_active = true AND installation_id = $1
			ORDER BY name`, installationID)
	} else {
		err = r.db.Select(&units, `
			SELECT id::text, name, unit_code,
			       COALESCE(organization, '') AS organization
			FROM units
			WHERE is_active = true
			ORDER BY name`)
	}
	if units == nil {
		units = []PublicUnit{}
	}
	return units, err
}
