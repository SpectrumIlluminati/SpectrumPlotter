// models/frequency_models.go
package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Unit represents a military unit or organization
type Unit struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	Name           string     `json:"name" db:"name"`
	UnitCode       string     `json:"unit_code" db:"unit_code"`
	ParentUnitID   *uuid.UUID `json:"parent_unit_id,omitempty" db:"parent_unit_id"`
	UnitType       *string    `json:"unit_type,omitempty" db:"unit_type"`
	Organization   *string    `json:"organization,omitempty" db:"organization"`
	Location       *string    `json:"location,omitempty" db:"location"`
	CommanderName  *string    `json:"commander_name,omitempty" db:"commander_name"`
	CommanderEmail *string    `json:"commander_email,omitempty" db:"commander_email"`
	CommPocName    *string    `json:"comm_poc_name,omitempty" db:"s6_poc_name"`
	CommPocEmail   *string    `json:"comm_poc_email,omitempty" db:"s6_poc_email"`
	CommPocPhone    *string    `json:"comm_poc_phone,omitempty" db:"s6_poc_phone"`
	InstallationID  *uuid.UUID `json:"installation_id,omitempty" db:"installation_id"`
	IsActive        bool       `json:"is_active" db:"is_active"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
}

// UserUnit represents a user's assignment to a unit
type UserUnit struct {
	ID         uuid.UUID  `json:"id" db:"id"`
	UserID     uuid.UUID  `json:"user_id" db:"user_id"`
	UnitID     uuid.UUID  `json:"unit_id" db:"unit_id"`
	Role       string     `json:"role" db:"role"` // commander, s6, member, viewer
	IsPrimary  bool       `json:"is_primary" db:"is_primary"`
	AssignedAt time.Time  `json:"assigned_at" db:"assigned_at"`
	AssignedBy *uuid.UUID `json:"assigned_by,omitempty" db:"assigned_by"`
}

// FrequencyAssignment represents a frequency assigned to a unit
type FrequencyAssignment struct {
	ID                    uuid.UUID  `json:"id" db:"id"`
	UnitID                uuid.UUID  `json:"unit_id" db:"unit_id"`
	Serial                *string    `json:"serial,omitempty" db:"serial"`
	SFAFId                *uuid.UUID `json:"sfaf_id,omitempty" db:"sfaf_id"`
	// SFAFRecordType: A=Permanent Assignment, P=Permanent Proposal,
	//                 S=Temporary Proposal,   T=Temporary Assignment
	SFAFRecordType        string     `json:"sfaf_record_type" db:"sfaf_record_type"`
	Frequency             string     `json:"frequency" db:"frequency"`
	FrequencyMhz          *float64   `json:"frequency_mhz,omitempty" db:"frequency_mhz"`
	AssignmentType        string     `json:"assignment_type" db:"assignment_type"`
	Purpose               *string    `json:"purpose,omitempty" db:"purpose"`
	NetName               *string    `json:"net_name,omitempty" db:"net_name"`
	Callsign              *string    `json:"callsign,omitempty" db:"callsign"`
	EmissionDesignator    *string    `json:"emission_designator,omitempty" db:"emission_designator"`
	Bandwidth             *string    `json:"bandwidth,omitempty" db:"bandwidth"`
	PowerWatts            *int       `json:"power_watts,omitempty" db:"power_watts"`
	AuthorizedRadiusKm    *float64   `json:"authorized_radius_km,omitempty" db:"authorized_radius_km"`
	AssignmentDate        *time.Time `json:"assignment_date,omitempty" db:"assignment_date"`
	ExpirationDate        *time.Time `json:"expiration_date,omitempty" db:"expiration_date"`
	AssignmentAuthority   *string    `json:"assignment_authority,omitempty" db:"assignment_authority"`
	AuthorizationNumber   *string    `json:"authorization_number,omitempty" db:"authorization_number"`
	Priority              string     `json:"priority" db:"priority"`
	IsEncrypted           bool       `json:"is_encrypted" db:"is_encrypted"`
	EncryptionType        *string    `json:"encryption_type,omitempty" db:"encryption_type"`
	Classification        string     `json:"classification" db:"classification"`
	Notes                 *string    `json:"notes,omitempty" db:"notes"`
	IsActive              bool       `json:"is_active" db:"is_active"`
	CreatedBy             *uuid.UUID `json:"created_by,omitempty" db:"created_by"`
	ApprovedBy            *uuid.UUID `json:"approved_by,omitempty" db:"approved_by"`
	// RoutedTo (legacy) — user UUID routing, superseded by RoutedToWorkbox.
	RoutedTo              *uuid.UUID `json:"routed_to,omitempty" db:"routed_to"`
	// RoutedToWorkbox is the named workbox (e.g. "GAFC", "Barksdale ISM") this P/S proposal is routed to.
	// NULL means visible to all ISM workboxes.
	RoutedToWorkbox       *string    `json:"routed_to_workbox,omitempty" db:"routed_to_workbox"`
	// PoolSerial is the serial of the pool assignment selected during approval (SFAF field 105).
	PoolSerial            *string    `json:"pool_serial,omitempty" db:"pool_serial"`
	CreatedAt             time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at" db:"updated_at"`
}

// FrequencyRequest represents a request for a new frequency or modification
type FrequencyRequest struct {
	ID                   uuid.UUID  `json:"id" db:"id"`
	UnitID               uuid.UUID  `json:"unit_id" db:"unit_id"`
	RequestedBy          uuid.UUID  `json:"requested_by" db:"requested_by"`
	RequestType          string     `json:"request_type" db:"request_type"`
	Status               string     `json:"status" db:"status"`
	Priority             string     `json:"priority" db:"priority"`
	RequestedFrequency   *string    `json:"requested_frequency,omitempty" db:"requested_frequency"`
	FrequencyRangeMin    *float64   `json:"frequency_range_min,omitempty" db:"frequency_range_min"`
	FrequencyRangeMax    *float64   `json:"frequency_range_max,omitempty" db:"frequency_range_max"`
	Purpose              string     `json:"purpose" db:"purpose"`
	NetName              *string    `json:"net_name,omitempty" db:"net_name"`
	Callsign             *string    `json:"callsign,omitempty" db:"callsign"`
	AssignmentType       *string    `json:"assignment_type,omitempty" db:"assignment_type"`
	EmissionDesignator   *string    `json:"emission_designator,omitempty" db:"emission_designator"`
	Bandwidth            *string    `json:"bandwidth,omitempty" db:"bandwidth"`
	PowerWatts           *int       `json:"power_watts,omitempty" db:"power_watts"`
	AntennaMakeModel     *string    `json:"antenna_make_model,omitempty" db:"antenna_make_model"`
	AntennaType          *string    `json:"antenna_type,omitempty" db:"antenna_type"`
	AntennaGainDbi       *float64   `json:"antenna_gain_dbi,omitempty" db:"antenna_gain_dbi"`
	AntennaPolarization  *string    `json:"antenna_polarization,omitempty" db:"antenna_polarization"`
	AntennaOrientation   *string    `json:"antenna_orientation,omitempty" db:"antenna_orientation"`
	CoverageArea              *string          `json:"coverage_area,omitempty" db:"coverage_area"`
	OperatingAreaGeoJSON      *json.RawMessage `json:"operating_area_geojson,omitempty" db:"operating_area_geojson"`
	AuthorizedRadiusKm        *float64         `json:"authorized_radius_km,omitempty" db:"authorized_radius_km"`
	OperatingAreaAppliesTo    string           `json:"operating_area_applies_to" db:"operating_area_applies_to"`
	StartDate               time.Time        `json:"start_date" db:"start_date"`
	EndDate              *time.Time `json:"end_date,omitempty" db:"end_date"`
	HoursOfOperation     *string    `json:"hours_of_operation,omitempty" db:"hours_of_operation"`
	NumTransmitters      *int       `json:"num_transmitters,omitempty" db:"num_transmitters"`
	NumReceivers         *int       `json:"num_receivers,omitempty" db:"num_receivers"`
	IsEncrypted          bool       `json:"is_encrypted" db:"is_encrypted"`
	EncryptionType       *string    `json:"encryption_type,omitempty" db:"encryption_type"`
	Classification       string     `json:"classification" db:"classification"`
	RequiresCoordination bool       `json:"requires_coordination" db:"requires_coordination"`
	CoordinationNotes    *string    `json:"coordination_notes,omitempty" db:"coordination_notes"`
	Justification        string     `json:"justification" db:"justification"`
	StopBuzzer           *string    `json:"stop_buzzer,omitempty" db:"stop_buzzer"`
	MissionImpact        *string    `json:"mission_impact,omitempty" db:"mission_impact"`
	// Transmitter station fields (migration 039)
	TxStationType       *string  `json:"tx_station_type,omitempty" db:"tx_station_type"`
	TxElevationM        *float64 `json:"tx_elevation_m,omitempty" db:"tx_elevation_m"`
	TxFeedpointHeightM  *float64 `json:"tx_feedpoint_height_m,omitempty" db:"tx_feedpoint_height_m"`
	// Receiver station fields (migration 039)
	RxSameAsTx          bool     `json:"rx_same_as_tx" db:"rx_same_as_tx"`
	RxMakeModel         *string  `json:"rx_make_model,omitempty" db:"rx_make_model"`
	RxAntennaType       *string  `json:"rx_antenna_type,omitempty" db:"rx_antenna_type"`
	RxStationType       *string  `json:"rx_station_type,omitempty" db:"rx_station_type"`
	RxElevationM        *float64 `json:"rx_elevation_m,omitempty" db:"rx_elevation_m"`
	RxFeedpointHeightM  *float64 `json:"rx_feedpoint_height_m,omitempty" db:"rx_feedpoint_height_m"`
	// Beamwidth fields (migration 044) — SFAF 360, 361, 460, 461
	TxHorizBeamwidthDeg *float64 `json:"tx_horiz_beamwidth_deg,omitempty" db:"tx_horiz_beamwidth_deg"`
	TxVertBeamwidthDeg  *float64 `json:"tx_vert_beamwidth_deg,omitempty" db:"tx_vert_beamwidth_deg"`
	RxHorizBeamwidthDeg *float64 `json:"rx_horiz_beamwidth_deg,omitempty" db:"rx_horiz_beamwidth_deg"`
	RxVertBeamwidthDeg  *float64 `json:"rx_vert_beamwidth_deg,omitempty" db:"rx_vert_beamwidth_deg"`
	ReviewedBy           *uuid.UUID `json:"reviewed_by,omitempty" db:"reviewed_by"`
	ReviewedAt           *time.Time `json:"reviewed_at,omitempty" db:"reviewed_at"`
	ReviewNotes          *string    `json:"review_notes,omitempty" db:"review_notes"`
	ApprovedBy           *uuid.UUID `json:"approved_by,omitempty" db:"approved_by"`
	ApprovedAt           *time.Time `json:"approved_at,omitempty" db:"approved_at"`
	ApprovalNotes        *string    `json:"approval_notes,omitempty" db:"approval_notes"`
	DeniedReason         *string    `json:"denied_reason,omitempty" db:"denied_reason"`
	AssignmentID         *uuid.UUID `json:"assignment_id,omitempty" db:"assignment_id"`
	CreatedAt            time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at" db:"updated_at"`
}

// FrequencyConflict tracks potential interference between assignments
type FrequencyConflict struct {
	ID                       uuid.UUID  `json:"id" db:"id"`
	FrequencyAssignmentID    uuid.UUID  `json:"frequency_assignment_id" db:"frequency_assignment_id"`
	ConflictingAssignmentID  uuid.UUID  `json:"conflicting_assignment_id" db:"conflicting_assignment_id"`
	ConflictType             string     `json:"conflict_type" db:"conflict_type"`
	DistanceKm               *float64   `json:"distance_km,omitempty" db:"distance_km"`
	Severity                 string     `json:"severity" db:"severity"`
	MitigationNotes          string     `json:"mitigation_notes,omitempty" db:"mitigation_notes"`
	Resolved                 bool       `json:"resolved" db:"resolved"`
	ResolvedAt               *time.Time `json:"resolved_at,omitempty" db:"resolved_at"`
	ResolvedBy               *uuid.UUID `json:"resolved_by,omitempty" db:"resolved_by"`
	CreatedAt                time.Time  `json:"created_at" db:"created_at"`
}

// FrequencyUsageLog tracks when frequencies are actively used
type FrequencyUsageLog struct {
	ID                    uuid.UUID  `json:"id" db:"id"`
	FrequencyAssignmentID uuid.UUID  `json:"frequency_assignment_id" db:"frequency_assignment_id"`
	UsedBy                *uuid.UUID `json:"used_by,omitempty" db:"used_by"`
	UsageStart            time.Time  `json:"usage_start" db:"usage_start"`
	UsageEnd              *time.Time `json:"usage_end,omitempty" db:"usage_end"`
	Location              string     `json:"location,omitempty" db:"location"`
	Notes                 string     `json:"notes,omitempty" db:"notes"`
	CreatedAt             time.Time  `json:"created_at" db:"created_at"`
}

// Extended response models with joined data

// UnitWithAssignments includes unit info and its frequency assignments
type UnitWithAssignments struct {
	Unit                *Unit                  `json:"unit"`
	FrequencyAssignments []FrequencyAssignment `json:"frequency_assignments"`
	PendingRequests     []FrequencyRequest     `json:"pending_requests"`
	MemberCount         int                    `json:"member_count"`
}

// FrequencyRequestWithDetails includes request and related information
type FrequencyRequestWithDetails struct {
	Request         *FrequencyRequest  `json:"request"`
	Unit            *Unit              `json:"unit"`
	Installation    *Installation      `json:"installation,omitempty"`
	RequestedBy     *User              `json:"requested_by"`
	ReviewedBy      *User              `json:"reviewed_by,omitempty"`
	ApprovedBy      *User              `json:"approved_by,omitempty"`
	Assignment      *FrequencyAssignment `json:"assignment,omitempty"`
	Comments        []RequestComment   `json:"comments,omitempty"`
	CoordinatedWith []string           `json:"coordinated_with,omitempty"`
}

// FrequencyAssignmentWithDetails includes assignment and unit info
type FrequencyAssignmentWithDetails struct {
	Assignment      *FrequencyAssignment `json:"assignment"`
	Unit            *Unit                `json:"unit"`
	CreatedBy       *User                `json:"created_by,omitempty"`
	ApprovedBy      *User                `json:"approved_by,omitempty"`
	RoutedToWorkbox *string              `json:"routed_to_workbox,omitempty"`
	CoordinatedWith []string             `json:"coordinated_with,omitempty"`
	Comments        []AssignmentComment  `json:"comments,omitempty"`
	Conflicts       []FrequencyConflict  `json:"conflicts,omitempty"`
	UsageLogs       []FrequencyUsageLog  `json:"usage_logs,omitempty"`
}

// AssignmentComment is a single entry in the lateral-coordination comment log.
type AssignmentComment struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	AssignmentID uuid.UUID  `json:"assignment_id" db:"assignment_id"`
	CreatedBy    *uuid.UUID `json:"created_by,omitempty" db:"created_by"`
	Workbox      string     `json:"workbox" db:"workbox"`
	Body         string     `json:"body" db:"body"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	AuthorName   string     `json:"author_name,omitempty" db:"-"`
}

// RequestComment is a single entry in the workbox status log for a pending request.
type RequestComment struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	RequestID uuid.UUID  `json:"request_id" db:"request_id"`
	CreatedBy *uuid.UUID `json:"created_by,omitempty" db:"created_by"`
	Workbox   string     `json:"workbox" db:"workbox"`
	Body      string     `json:"body" db:"body"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	AuthorName string    `json:"author_name,omitempty" db:"-"`
}

// Request/Response models for API

// CreateFrequencyRequestInput for submitting new frequency requests
type CreateFrequencyRequestInput struct {
	UnitID               uuid.UUID  `json:"unit_id" binding:"required"`
	RequestType          string     `json:"request_type" binding:"required"` // new_assignment, modification, renewal, cancellation
	Priority             string     `json:"priority" binding:"required"`     // emergency, urgent, priority, routine
	RequestedFrequency   string     `json:"requested_frequency,omitempty"`
	FrequencyRangeMin    *float64   `json:"frequency_range_min,omitempty"`
	FrequencyRangeMax    *float64   `json:"frequency_range_max,omitempty"`
	Purpose              string     `json:"purpose" binding:"required"`
	NetName              string     `json:"net_name,omitempty"`
	Callsign             string     `json:"callsign,omitempty"`
	AssignmentType       string     `json:"assignment_type,omitempty"`
	EmissionDesignator   string     `json:"emission_designator,omitempty"`
	Bandwidth            string     `json:"bandwidth,omitempty"`
	PowerWatts           *int       `json:"power_watts,omitempty"`
	AntennaMakeModel     string     `json:"antenna_make_model,omitempty"`
	AntennaType          string     `json:"antenna_type,omitempty"`
	AntennaGainDbi       *float64   `json:"antenna_gain_dbi,omitempty"`
	AntennaPolarization  string     `json:"antenna_polarization,omitempty"`
	AntennaOrientation   string     `json:"antenna_orientation,omitempty"`
	TxHorizBeamwidthDeg *float64   `json:"tx_horiz_beamwidth_deg,omitempty"`
	TxVertBeamwidthDeg  *float64   `json:"tx_vert_beamwidth_deg,omitempty"`
	RxHorizBeamwidthDeg *float64   `json:"rx_horiz_beamwidth_deg,omitempty"`
	RxVertBeamwidthDeg  *float64   `json:"rx_vert_beamwidth_deg,omitempty"`
	CoverageArea              string           `json:"coverage_area,omitempty"`
	OperatingAreaGeoJSON      *json.RawMessage `json:"operating_area_geojson,omitempty"`
	AuthorizedRadiusKm        *float64         `json:"authorized_radius_km,omitempty"`
	OperatingAreaAppliesTo    string           `json:"operating_area_applies_to,omitempty"`
	StartDate               time.Time  `json:"start_date" binding:"required"`
	EndDate                 *time.Time `json:"end_date,omitempty"` // optional for permanent requests
	HoursOfOperation     string     `json:"hours_of_operation,omitempty"`
	NumTransmitters      *int       `json:"num_transmitters,omitempty"`
	NumReceivers         *int       `json:"num_receivers,omitempty"`
	IsEncrypted          bool       `json:"is_encrypted"`
	EncryptionType       string     `json:"encryption_type,omitempty"`
	Classification       string     `json:"classification"`
	RequiresCoordination bool       `json:"requires_coordination"`
	CoordinationNotes    string     `json:"coordination_notes,omitempty"`
	Justification        string     `json:"justification" binding:"required"`
	StopBuzzer           string     `json:"stop_buzzer,omitempty"`
	MissionImpact        string     `json:"mission_impact,omitempty"`
}

// UpdateFrequencyRequestStatusInput for reviewing/approving requests
type UpdateFrequencyRequestStatusInput struct {
	Status        string `json:"status" binding:"required"` // under_review, approved, denied, cancelled
	ReviewNotes   string `json:"review_notes,omitempty"`
	ApprovalNotes string `json:"approval_notes,omitempty"`
	DeniedReason  string `json:"denied_reason,omitempty"`
}

// CreateFrequencyAssignmentInput for creating new assignments
type CreateFrequencyAssignmentInput struct {
	UnitID              uuid.UUID  `json:"unit_id" binding:"required"`
	Serial              string     `json:"serial" binding:"required"`
	// SFAFRecordType: A=Permanent Assignment, P=Permanent Proposal,
	//                 S=Temporary Proposal,   T=Temporary Assignment
	SFAFRecordType      string     `json:"sfaf_record_type"`
	Frequency           string     `json:"frequency" binding:"required"`
	FrequencyMhz        *float64   `json:"frequency_mhz,omitempty"`
	AssignmentType      string     `json:"assignment_type" binding:"required"`
	Purpose             string     `json:"purpose,omitempty"`
	NetName             string     `json:"net_name,omitempty"`
	Callsign            string     `json:"callsign,omitempty"`
	EmissionDesignator  string     `json:"emission_designator,omitempty"`
	Bandwidth           string     `json:"bandwidth,omitempty"`
	PowerWatts          *int       `json:"power_watts,omitempty"`
	AuthorizedRadiusKm  *float64   `json:"authorized_radius_km,omitempty"`
	AssignmentDate      *time.Time `json:"assignment_date,omitempty"`
	ExpirationDate      *time.Time `json:"expiration_date,omitempty"`
	AssignmentAuthority string     `json:"assignment_authority,omitempty"`
	AuthorizationNumber string     `json:"authorization_number,omitempty"`
	Priority            string     `json:"priority"`
	IsEncrypted         bool       `json:"is_encrypted"`
	EncryptionType      string     `json:"encryption_type,omitempty"`
	Classification      string     `json:"classification"`
	Notes               string     `json:"notes,omitempty"`
	RoutedToWorkbox     *string    `json:"routed_to_workbox,omitempty"`
	PoolSerial          string     `json:"pool_serial,omitempty"`
}

// FrequencySearchQuery for searching available frequencies
type FrequencySearchQuery struct {
	MinFrequency       *float64 `json:"min_frequency,omitempty"`
	MaxFrequency       *float64 `json:"max_frequency,omitempty"`
	Location           string   `json:"location,omitempty"`
	RadiusKm           *float64 `json:"radius_km,omitempty"`
	ExcludeUnitID      *uuid.UUID `json:"exclude_unit_id,omitempty"`
	RequiredBandwidth  *float64 `json:"required_bandwidth,omitempty"`
}
