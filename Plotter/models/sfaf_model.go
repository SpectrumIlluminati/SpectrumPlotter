// models/sfaf_model.go
package models

import (
	"fmt"

	"strconv"
	"time"

	"github.com/google/uuid"
)

// SFAF represents a complete Standard Frequency Action Form record
// Maps directly to the sfafs table in PostgreSQL (Source: table_info.txt)
type SFAF struct {
	// Core identification fields
	ID        uuid.UUID  `json:"id" db:"id"`
	MarkerID  *uuid.UUID `json:"marker_id,omitempty" db:"marker_id"` // Nullable - SFAF may not have associated marker
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`

	// Individual SFAF fields matching database schema (Source: table_info.txt)
	// 000 Series - Basic Information
	Field005 string `json:"field005,omitempty" db:"field005"` // VARCHAR(10) - Agency identifiers
	Field006 string `json:"field006,omitempty" db:"field006"` // VARCHAR(10) - Agency codes
	Field007 string `json:"field007,omitempty" db:"field007"` // VARCHAR(1) - Status flags
	Field010 string `json:"field010,omitempty" db:"field010"` // VARCHAR(1) - Status indicators
	Field013 string `json:"field013,omitempty" db:"field013"` // VARCHAR(35) - Names/descriptions
	Field014 string `json:"field014,omitempty" db:"field014"` // VARCHAR(60) - Extended descriptions
	Field015 string `json:"field015,omitempty" db:"field015"` // VARCHAR(72) - Long text fields
	Field016 string `json:"field016,omitempty" db:"field016"` // VARCHAR(35) - Standard text
	Field017 string `json:"field017,omitempty" db:"field017"` // VARCHAR(8) - Date/time codes
	Field018 string `json:"field018,omitempty" db:"field018"` // VARCHAR(60) - Extended text
	Field019 string `json:"field019,omitempty" db:"field019"` // VARCHAR(35) - Standard identifiers
	Field020 string `json:"field020,omitempty" db:"field020"` // VARCHAR(64) - Extended identifiers

	// 100 Series - Agency Information (Source: services.txt shows field definitions)
	Field102 string `json:"field102,omitempty" db:"field102"` // VARCHAR(10) - Agency Serial Number
	Field103 string `json:"field103,omitempty" db:"field103"` // VARCHAR(8) - Expiration Date
	Field105 string `json:"field105,omitempty" db:"field105"` // VARCHAR(10) - Agency codes
	Field106 string `json:"field106,omitempty" db:"field106"` // VARCHAR(18) - Extended agency data
	Field107 string `json:"field107,omitempty" db:"field107"` // VARCHAR(8) - Processing codes
	Field108 string `json:"field108,omitempty" db:"field108"` // VARCHAR(35) - Agency descriptions
	Field110 string `json:"field110,omitempty" db:"field110"` // VARCHAR(15) - Frequency(ies)
	Field111 string `json:"field111,omitempty" db:"field111"` // VARCHAR(23) - Extended frequency data
	Field112 string `json:"field112,omitempty" db:"field112"` // VARCHAR(35) - System descriptions
	Field113 string `json:"field113,omitempty" db:"field113"` // VARCHAR(4) - System codes
	Field114 string `json:"field114,omitempty" db:"field114"` // VARCHAR(11) - Technical parameters
	Field115 string `json:"field115,omitempty" db:"field115"` // VARCHAR(9) - Performance data
	Field116 string `json:"field116,omitempty" db:"field116"` // VARCHAR(1) - Status flags
	Field117 string `json:"field117,omitempty" db:"field117"` // VARCHAR(6) - Classification codes
	Field118 string `json:"field118,omitempty" db:"field118"` // VARCHAR(1) - Processing flags
	Field130 string `json:"field130,omitempty" db:"field130"` // VARCHAR(4) - System identifiers
	Field131 string `json:"field131,omitempty" db:"field131"` // VARCHAR(2) - Status codes

	// Date fields using proper PostgreSQL DATE type (Source: table_info.txt)
	Field140 *time.Time `json:"field140,omitempty" db:"field140"` // DATE - Start dates
	Field141 *time.Time `json:"field141,omitempty" db:"field141"` // DATE - End dates
	Field142 *time.Time `json:"field142,omitempty" db:"field142"` // DATE - Processing dates
	Field143 *time.Time `json:"field143,omitempty" db:"field143"` // DATE - Expiration dates
	Field144 string     `json:"field144,omitempty" db:"field144"` // VARCHAR(1) - Date flags
	Field145 string     `json:"field145,omitempty" db:"field145"` // VARCHAR(20) - Extended identifiers
	Field146 string     `json:"field146,omitempty" db:"field146"` // VARCHAR(6) - Time codes
	Field147 string     `json:"field147,omitempty" db:"field147"` // VARCHAR(4) - Classification
	Field151 string     `json:"field151,omitempty" db:"field151"` // VARCHAR(1) - Status indicators
	Field152 string     `json:"field152,omitempty" db:"field152"` // VARCHAR(35) - Descriptive text

	// 200 Series - Organizational Information (Source: MC4EB Pub 7 CHG 1)
	Field200 string `json:"field200,omitempty" db:"field200"` // VARCHAR(6) - Agency
	Field201 string `json:"field201,omitempty" db:"field201"` // VARCHAR(8) - Unified Command
	Field202 string `json:"field202,omitempty" db:"field202"` // VARCHAR(8) - Unified Command Service
	Field203 string `json:"field203,omitempty" db:"field203"` // VARCHAR(4) - Bureau
	Field204 string `json:"field204,omitempty" db:"field204"` // VARCHAR(18) - System identifiers
	Field205 string `json:"field205,omitempty" db:"field205"` // VARCHAR(18) - Equipment codes
	Field206 string `json:"field206,omitempty" db:"field206"` // VARCHAR(18) - Configuration data
	Field207 string `json:"field207,omitempty" db:"field207"` // VARCHAR(18) - Technical specs
	Field208 string `json:"field208,omitempty" db:"field208"` // VARCHAR(6) - Performance codes
	Field209 string `json:"field209,omitempty" db:"field209"` // VARCHAR(18) - System parameters

	// 300 Series - Location Information (Source: services.txt)
	Field300 string `json:"field300,omitempty" db:"field300"` // VARCHAR(4) - State/Country
	Field301 string `json:"field301,omitempty" db:"field301"` // VARCHAR(24) - Antenna Location
	Field302 string `json:"field302,omitempty" db:"field302"` // VARCHAR(18) - Site Name
	Field303 string `json:"field303,omitempty" db:"field303"` // VARCHAR(15) - Antenna Coordinates
	Field304 string `json:"field304,omitempty" db:"field304"` // VARCHAR(10) - Ground Elevation
	Field305 string `json:"field305,omitempty" db:"field305"` // Antenna Height AGL
	Field306 string `json:"field306,omitempty" db:"field306"` // VARCHAR(5) - Authorization Radius
	Field307 string `json:"field307,omitempty" db:"field307"` // Area of Operation

	// Technical Parameter Fields (Source: table_info.txt)
	Field315 *float64 `json:"field315,omitempty" db:"field315"` // NUMERIC(5,2) - Frequencies/measurements
	Field316 *int     `json:"field316,omitempty" db:"field316"` // INTEGER - Counts/quantities
	Field317 *int     `json:"field317,omitempty" db:"field317"` // INTEGER - Technical values
	Field318 string   `json:"field318,omitempty" db:"field318"` // VARCHAR(7) - Technical codes
	Field319 *int     `json:"field319,omitempty" db:"field319"` // INTEGER - System parameters
	Field321 *float64 `json:"field321,omitempty" db:"field321"` // NUMERIC(6,2) - Precision measurements

	// 340+ Series - Equipment Information (continuing through all defined fields)
	Field340 string   `json:"field340,omitempty" db:"field340"` // VARCHAR(18) - Equipment identifiers
	Field341 string   `json:"field341,omitempty" db:"field341"` // VARCHAR(29) - Equipment descriptions
	Field342 string   `json:"field342,omitempty" db:"field342"` // VARCHAR(4) - Equipment codes
	Field343 string   `json:"field343,omitempty" db:"field343"` // VARCHAR(15) - Model numbers
	Field344 string   `json:"field344,omitempty" db:"field344"` // VARCHAR(6) - Serial numbers
	Field345 string   `json:"field345,omitempty" db:"field345"` // VARCHAR(2) - Type codes
	Field346 string   `json:"field346,omitempty" db:"field346"` // VARCHAR(9) - Technical specs
	Field347 string   `json:"field347,omitempty" db:"field347"` // VARCHAR(9) - Performance data
	Field348 string   `json:"field348,omitempty" db:"field348"` // VARCHAR(11) - Extended specs
	Field349 string   `json:"field349,omitempty" db:"field349"` // VARCHAR(1) - Status flags
	Field354 string   `json:"field354,omitempty" db:"field354"` // VARCHAR(10) - System identifiers
	Field355 string   `json:"field355,omitempty" db:"field355"` // VARCHAR(18) - Technical descriptions
	Field356 *int     `json:"field356,omitempty" db:"field356"` // INTEGER - Numeric parameters
	Field357 *float64 `json:"field357,omitempty" db:"field357"` // NUMERIC(5,2) - Precision values
	Field358 *float64 `json:"field358,omitempty" db:"field358"` // NUMERIC(6,2) - Extended precision
	Field359 *float64 `json:"field359,omitempty" db:"field359"` // NUMERIC(6,2) - Measurement values
	Field360 *float64 `json:"field360,omitempty" db:"field360"` // NUMERIC(5,2) - Performance metrics
	Field361 *int     `json:"field361,omitempty" db:"field361"` // INTEGER - Count parameters
	Field362 string   `json:"field362,omitempty" db:"field362"` // VARCHAR(3) - Short codes
	Field363 string   `json:"field363,omitempty" db:"field363"` // VARCHAR(1) - Single flags
	Field364 *float64 `json:"field364,omitempty" db:"field364"` // NUMERIC(6,2) - Technical measurements
	Field365 *float64 `json:"field365,omitempty" db:"field365"` // NUMERIC(5,2) - System values
	Field373 string   `json:"field373,omitempty" db:"field373"` // VARCHAR(1) - Operational flags
	Field374 string   `json:"field374,omitempty" db:"field374"` // VARCHAR(1) - Status indicators

	// 400+ Series - Receiver Location Data (Source: MC4EB Pub 7 CHG 1)
	Field400 string   `json:"field400,omitempty" db:"field400"` // VARCHAR(4) - State/Country
	Field401 string   `json:"field401,omitempty" db:"field401"` // VARCHAR(24) - Alternate Frequency
	Field402 string   `json:"field402,omitempty" db:"field402"` // Power (Watts)
	Field403 string   `json:"field403,omitempty" db:"field403"` // VARCHAR(15) - Receiver Coordinates
	Field404 string   `json:"field404,omitempty" db:"field404"` // Emission Designator
	Field405 string   `json:"field405,omitempty" db:"field405"` // Bandwidth (kHz)
	Field406 string   `db:"field406"`                           // VARCHAR(4) - Modulation (AM, FM, PM, DSB, SSB, CW, FSK, PSK, QAM, OFDM, Digital)
	Field407 string   `db:"field407"`                           // VARCHAR(5) - Tolerance (Hz) - frequency tolerance
	Field408 string   `db:"field408"`                           // VARCHAR(1) - Stability - frequency stability specification
	Field409 string   `db:"field409"`                           // Spurious Emissions - compliance standard
	Field415 *float64 `db:"field415"`                           // NUMERIC(5,2) - Power measurements
	Field416 *int     `db:"field416"`                           // INTEGER - Technical counts
	Field417 *int     `db:"field417"`                           // INTEGER - System parameters
	Field418 string   `db:"field418"`                           // VARCHAR(7) - Technical codes
	Field419 *int     `db:"field419"`                           // INTEGER - Performance values

	// 440+ Series - System Configuration (Source: table_info.txt)
	Field440 string   `db:"field440"` // VARCHAR(18) - System identifiers
	Field442 string   `db:"field442"` // VARCHAR(4) - Configuration codes
	Field443 string   `db:"field443"` // VARCHAR(15) - System specifications
	Field453 string   `db:"field453"` // VARCHAR(25) - Equipment descriptions
	Field454 string   `db:"field454"` // VARCHAR(10) - Equipment codes
	Field455 string   `db:"field455"` // VARCHAR(18) - Model specifications
	Field456 *int     `db:"field456"` // INTEGER - Technical parameters (Source: table_info.txt shows integer(32,0))
	Field457 *float64 `db:"field457"` // NUMERIC(5,2) - Performance codes (Source: table_info.txt)
	Field458 *float64 `db:"field458"` // NUMERIC(6,2) - Technical measurements (Source: table_info.txt)
	Field459 *float64 `db:"field459"` // NUMERIC(6,2) - Extended measurements (Source: table_info.txt)
	Field460 *float64 `db:"field460"` // NUMERIC(5,2) - Performance metrics (Source: table_info.txt)
	Field461 *int     `db:"field461"` // INTEGER - Count parameters (Source: table_info.txt)
	Field462 string   `db:"field462"` // VARCHAR(3) - Short codes (Source: table_info.txt)
	Field463 string   `db:"field463"` // VARCHAR(1) - Single flags (Source: table_info.txt)
	Field470 *int     `db:"field470"` // INTEGER - System parameters (Source: table_info.txt)
	Field471 *int     `db:"field471"` // INTEGER - Technical counts (Source: table_info.txt)
	Field472 *int     `db:"field472"` // INTEGER - Performance values (Source: table_info.txt)
	Field473 string   `db:"field473"` // VARCHAR(1) - Status indicators (Source: table_info.txt)

	// 500+ Series - IRAC Notes and Equipment (Source: services.txt, handlers.txt MC4EB compliance)
	Field500 string `db:"field500"` // VARCHAR(4) - Transmitter Make - IRAC Note references (max 10 per MC4EB Pub 7 CHG 1)
	Field501 string `db:"field501"` // VARCHAR(35) - Transmitter Model - IRAC Note codes (max 30 per MC4EB Pub 7 CHG 1)
	Field502 string `db:"field502"` // TEXT - Transmitter S/N - Purpose descriptions (long text)
	Field503 string `db:"field503"` // VARCHAR(35) - Receiver Make - Additional notes
	Field504 string `db:"field504"` // VARCHAR(72) - Receiver Model - Technical notes
	Field505 string `db:"field505"` // Receiver S/N
	Field506 string `db:"field506"` // VARCHAR(11) - Antenna Make/Model - Coordination notes
	Field507 string `db:"field507"` // Antenna Type (Omnidirectional, Directional, Yagi, Parabolic, Helical, Loop, Whip, Other)
	Field508 string `db:"field508"` // Antenna Gain (dBi) - decibels relative to isotropic
	Field509 string `db:"field509"` // Antenna Pattern - radiation pattern description
	Field510 string `db:"field510"` // Antenna Polarization (Horizontal, Vertical, Circular, Elliptical)
	Field511 string `db:"field511"` // VARCHAR(30) - Major Function Identifier (MFI)
	Field512 string `db:"field512"` // VARCHAR(30) - Intermediate Function Identifier (IFI)
	Field513 string `db:"field513"` // VARCHAR(30) - Detailed Function Identifier (DFI) — repeatable up to 5
	Field520 string `db:"field520"` // TEXT - Extended purpose (long text)
	Field521 string `db:"field521"` // VARCHAR(21) - Reference codes
	Field530 string `db:"field530"` // VARCHAR(35) - Classification
	Field531 string `db:"field531"` // VARCHAR(35) - Security information

	// 600+ Series - Operational Information (Source: services.txt)
	Field600 string `db:"field600"` // Hours of Operation (e.g., 24/7, 0800-1700 EST)
	Field601 string `db:"field601"` // Days of Operation (e.g., Mon-Fri, Daily)
	Field602 string `db:"field602"` // Months of Operation - seasonal operation (Source: services.txt)
	Field603 string `db:"field603"` // Number of Transmitters - total in system (Source: services.txt)
	Field604 string `db:"field604"` // Number of Receivers - total in system (Source: services.txt)
	Field605 string `db:"field605"` // Traffic Volume - expected volume or duty cycle (Source: services.txt)
	Field606 string `db:"field606"` // Critical Infrastructure (Yes/No) (Source: services.txt)
	Field607 string `db:"field607"` // Emergency Communications (Yes/No) - Used for emergency communications? (Source: services.txt)
	Field608 string `db:"field608"` // Operational Hours - Additional operational parameters
	Field609 string `db:"field609"` // Backup Systems - Redundancy and backup information

	// 700 Series - Coordination Information (Source: services.txt, table_info.txt)
	Field700 string `db:"field700"` // Coordination Required (Yes/No/Unknown) - Is frequency coordination required? (Source: services.txt)
	Field701 string `db:"field701"` // VARCHAR(3) - Coordination Agency - Agency responsible for coordination (Source: table_info.txt)
	Field702 string `db:"field702"` // VARCHAR(15) - International Coordination (Yes/No) - International coordination required? (Source: table_info.txt)
	Field703 string `db:"field703"` // Border Distance (km) - Distance to nearest international border (Source: services.txt)
	Field704 string `db:"field704"` // VARCHAR(1) - Satellite Coordination (Yes/No) - Satellite coordination required? (Source: table_info.txt)
	Field705 string `db:"field705"` // Coordination Notes - Additional coordination requirements
	Field706 string `db:"field706"` // International Treaties - Applicable treaty references
	Field707 string `db:"field707"` // VARCHAR(8) - Timing information (Source: table_info.txt)
	Field708 string `db:"field708"` // Cross-Border Coordination - Specific cross-border requirements
	Field709 string `db:"field709"` // Coordination Status - Current coordination status
	Field710 string `db:"field710"` // VARCHAR(35) - Operational notes (Source: table_info.txt)
	Field711 string `db:"field711"` // VARCHAR(6) - Service codes (Source: table_info.txt)
	Field712 string `db:"field712"` // Coordination Timeline - Expected coordination timeframe
	Field713 string `db:"field713"` // Stakeholder Agencies - Other agencies involved
	Field714 string `db:"field714"` // Coordination Complexity - Simple/Medium/Complex
	Field715 string `db:"field715"` // Special Requirements - Unique coordination needs
	Field716 string `db:"field716"` // VARCHAR(1) - Status flags (Source: table_info.txt)

	// 800 Series - Administrative Information (Source: services.txt, table_info.txt)
	Field800 string     `db:"field800"` // POC Name - Primary point of contact name (Source: services.txt)
	Field801 string     `db:"field801"` // VARCHAR(60) - POC Title - Point of contact title/position (Source: table_info.txt)
	Field802 string     `db:"field802"` // POC Phone - Point of contact phone number (Source: services.txt)
	Field803 string     `db:"field803"` // VARCHAR(60) - POC Email - Point of contact email address (Source: table_info.txt)
	Field804 string     `db:"field804"` // VARCHAR(60) - Organization - Requesting organization or unit (Source: table_info.txt)
	Field805 *time.Time `db:"field805"` // DATE - Address Line 1 - Organization address (Source: table_info.txt)
	Field806 string     `db:"field806"` // VARCHAR(60) - Address Line 2 - Additional address information (Source: table_info.txt)
	Field807 string     `db:"field807"` // City (Source: services.txt)
	Field808 string     `db:"field808"` // State/Province (Source: services.txt)
	Field809 string     `db:"field809"` // Postal Code - ZIP or postal code (Source: services.txt)
	Field810 string     `db:"field810"` // Country Code - ISO country code
	Field811 string     `db:"field811"` // Time Zone - Operating time zone
	Field812 string     `db:"field812"` // Business Hours - Standard business hours
	Field813 string     `db:"field813"` // Emergency Contact - 24/7 emergency contact
	Field814 string     `db:"field814"` // Alternate Contact - Secondary contact information
	Field815 string     `db:"field815"` // Department Code - Internal department identifier

	// 900 Series - Comments and Special Requirements (Source: services.txt, table_info.txt)
	Field900 string     `db:"field900"` // IRAC Notes - Notes for IRAC review and coordination (Source: services.txt)
	Field901 string     `db:"field901"` // VARCHAR(1) - Technical Comments - Technical notes and specifications (Source: table_info.txt)
	Field902 string     `db:"field902"` // Operational Comments - Operational requirements and constraints (Source: services.txt)
	Field903 string     `db:"field903"` // VARCHAR(4) - Regulatory Comments - Regulatory compliance notes (Source: table_info.txt)
	Field904 *time.Time `db:"field904"` // DATE - General Comments - Additional comments and information (Source: table_info.txt)
	Field905 string     `db:"field905"` // VARCHAR(14) - Processing identifiers (Source: table_info.txt)
	Field906 string     `db:"field906"` // VARCHAR(66) - Extended processing data (Source: table_info.txt)
	Field907 string     `db:"field907"` // VARCHAR(1) - Processing status (Source: table_info.txt)
	Field908 string     `db:"field908"` // Security Classification - Classification level
	Field909 string     `db:"field909"` // Handling Instructions - Special handling requirements
	Field910 string     `db:"field910"` // VARCHAR(20) - Administrative codes (Source: table_info.txt)
	Field911 *time.Time `db:"field911"` // DATE - Administrative dates (Source: table_info.txt)
	Field912 string     `db:"field912"` // Review Status - Current review status
	Field913 string     `db:"field913"` // Approval Authority - Approving authority
	Field914 string     `db:"field914"` // Risk Assessment - Security risk level
	Field915 string     `db:"field915"` // Mitigation Measures - Risk mitigation steps
	Field916 string     `db:"field916"` // Compliance Notes - Regulatory compliance details
	Field917 string     `db:"field917"` // Environmental Impact - Environmental considerations
	Field918 string     `db:"field918"` // Safety Requirements - Safety protocols
	Field919 string     `db:"field919"` // Training Requirements - Operator training needs
	Field920 string     `db:"field920"` // Maintenance Schedule - Equipment maintenance plan
	Field921 string     `db:"field921"` // Backup Procedures - Emergency backup plans
	Field922 string     `db:"field922"` // Quality Assurance - QA procedures
	Field923 string     `db:"field923"` // Performance Metrics - Key performance indicators
	Field924 string     `db:"field924"` // VARCHAR(4) - Classification codes (Source: table_info.txt)
	Field925 string     `db:"field925"` // Audit Trail - Audit and review history
	Field926 *float64   `db:"field926"` // NUMERIC(12,3) - High precision measurements (Source: table_info.txt)
	Field927 *time.Time `db:"field927"` // DATE - Processing dates (Source: table_info.txt)
	Field928 *time.Time `db:"field928"` // DATE - Completion dates (Source: table_info.txt)
	Field929 string     `db:"field929"` // Final Approval - Final approval status

	// 950+ Series - Final Processing Information (Source: table_info.txt)
	Field950 string `db:"field950"` // Final Review Status - Completion of review process
	Field951 string `db:"field951"` // Archive Status - Archive and retention status
	Field952 string `db:"field952"` // VARCHAR(1) - Final status (Source: table_info.txt)
	Field953 string `db:"field953"` // VARCHAR(10) - Completion codes (Source: table_info.txt)
	Field954 string `db:"field954"` // Disposition Instructions - Final disposition
	Field955 string `db:"field955"` // Retention Period - Record retention timeframe
	Field956 string `db:"field956"` // VARCHAR(10) - Reference numbers (Source: table_info.txt)
	Field957 *int   `db:"field957"` // INTEGER - Processing counts (Source: table_info.txt)
	Field958 string `db:"field958"` // VARCHAR(1) - Completion flags (Source: table_info.txt)
	Field959 string `db:"field959"` // VARCHAR(40) - Final notes (Source: table_info.txt)
	Field960 string `db:"field960"` // Legacy System Reference - Reference to legacy systems
	Field961 string `db:"field961"` // Migration Status - System migration status
	Field962 string `db:"field962"` // Data Quality Score - Data completeness rating
	Field963 string `db:"field963"` // VARCHAR(22) - Archive information (Source: table_info.txt)
	Field964 *int   `db:"field964"` // INTEGER - Archive parameters (Source: table_info.txt)
	Field965 *int   `db:"field965"` // INTEGER - Archive counts (Source: table_info.txt)
	Field966 string `db:"field966"` // Verification Status - Data verification status
	Field967 string `db:"field967"` // Exception Handling - Exception processing notes
	Field968 string `db:"field968"` // System Integration - Integration status
	Field969 string `db:"field969"` // Performance Rating - System performance assessment

	// 980+ Series - System and Archive Information (Source: table_info.txt)
	Field980 string `db:"field980"` // System Version - Software/firmware version
	Field981 string `db:"field981"` // Configuration Hash - System configuration checksum
	Field982 string `db:"field982"` // VARCHAR(5) - System codes (Source: table_info.txt)
	Field983 string `db:"field983"` // VARCHAR(16) - System identifiers (Source: table_info.txt)
	Field984 string `db:"field984"` // VARCHAR(11) - Archive codes (Source: table_info.txt)
	Field985 string `db:"field985"` // VARCHAR(1) - Archive flags (Source: table_info.txt)
	Field986 string `db:"field986"` // VARCHAR(15) - System parameters (Source: table_info.txt)
	Field987 string `db:"field987"` // VARCHAR(3) - Configuration codes (Source: table_info.txt)
	Field988 string `db:"field988"` // VARCHAR(5) - System types (Source: table_info.txt)
	Field989 string `db:"field989"` // VARCHAR(16) - Extended system data (Source: table_info.txt)
	Field990 string `db:"field990"` // VARCHAR(2) - Status codes (Source: table_info.txt)
	Field991 string `db:"field991"` // VARCHAR(3) - Processing codes (Source: table_info.txt)
	Field992 string `db:"field992"` // VARCHAR(3) - Archive status (Source: table_info.txt)
	Field993 string `db:"field993"` // VARCHAR(6) - Reference codes (Source: table_info.txt)
	Field994 string `db:"field994"` // VARCHAR(1) - Final flags (Source: table_info.txt)
	Field995 string `db:"field995"` // VARCHAR(15) - Final parameters (Source: table_info.txt)
	Field996 string `db:"field996"` // VARCHAR(8) - Completion codes (Source: table_info.txt)
	Field997 string `db:"field997"` // VARCHAR(10) - Final identifiers (Source: table_info.txt)
	Field998 string `db:"field998"` // VARCHAR(3) - End status (Source: table_info.txt)
	Field999 string `db:"field999"` // VARCHAR(20) - Final notes (Source: table_info.txt)
}

type SFAFFormDefinition struct {
	FieldNumber string   `json:"field_number"`         // Field identifier (e.g., "field100")
	Label       string   `json:"label"`                // Human-readable field name
	Required    bool     `json:"required"`             // Validation requirement
	FieldType   string   `json:"field_type"`           // Input type specification
	Options     []string `json:"options,omitempty"`    // For select/dropdown fields
	Help        string   `json:"help"`                 // User guidance text
	Validation  string   `json:"validation,omitempty"` // Current field value
}

// ✅ DATABASE-ONLY Helper Methods (NO JSON dependencies)
// ToFieldMap converts the typed SFAF struct to map[string]string for API compatibility
func (s *SFAF) ToFieldMap() map[string]string {
	fields := make(map[string]string)

	// Core identification fields (database storage only)
	if s.Field005 != "" {
		fields["field005"] = s.Field005
	}
	if s.Field006 != "" {
		fields["field006"] = s.Field006
	}
	if s.Field007 != "" {
		fields["field007"] = s.Field007
	}
	if s.Field010 != "" {
		fields["field010"] = s.Field010
	}
	if s.Field013 != "" {
		fields["field013"] = s.Field013
	}
	if s.Field014 != "" {
		fields["field014"] = s.Field014
	}
	if s.Field015 != "" {
		fields["field015"] = s.Field015
	}
	if s.Field016 != "" {
		fields["field016"] = s.Field016
	}
	if s.Field017 != "" {
		fields["field017"] = s.Field017
	}
	if s.Field018 != "" {
		fields["field018"] = s.Field018
	}
	if s.Field019 != "" {
		fields["field019"] = s.Field019
	}
	if s.Field020 != "" {
		fields["field020"] = s.Field020
	}

	// 100 Series - Agency Information
	if s.Field102 != "" {
		fields["field102"] = s.Field102
	}
	if s.Field103 != "" {
		fields["field103"] = s.Field103
	}
	if s.Field105 != "" {
		fields["field105"] = s.Field105
	}
	if s.Field106 != "" {
		fields["field106"] = s.Field106
	}
	if s.Field107 != "" {
		fields["field107"] = s.Field107
	}
	if s.Field108 != "" {
		fields["field108"] = s.Field108
	}
	if s.Field110 != "" {
		fields["field110"] = s.Field110
	}
	if s.Field111 != "" {
		fields["field111"] = s.Field111
	}
	if s.Field112 != "" {
		fields["field112"] = s.Field112
	}
	if s.Field113 != "" {
		fields["field113"] = s.Field113
	}
	if s.Field114 != "" {
		fields["field114"] = s.Field114
	}
	if s.Field115 != "" {
		fields["field115"] = s.Field115
	}
	if s.Field116 != "" {
		fields["field116"] = s.Field116
	}
	if s.Field117 != "" {
		fields["field117"] = s.Field117
	}
	if s.Field118 != "" {
		fields["field118"] = s.Field118
	}
	if s.Field130 != "" {
		fields["field130"] = s.Field130
	}
	if s.Field131 != "" {
		fields["field131"] = s.Field131
	}
	if s.Field144 != "" {
		fields["field144"] = s.Field144
	}
	if s.Field145 != "" {
		fields["field145"] = s.Field145
	}
	if s.Field146 != "" {
		fields["field146"] = s.Field146
	}
	if s.Field147 != "" {
		fields["field147"] = s.Field147
	}
	if s.Field151 != "" {
		fields["field151"] = s.Field151
	}
	if s.Field152 != "" {
		fields["field152"] = s.Field152
	}

	// 200 Series - System Information
	if s.Field200 != "" {
		fields["field200"] = s.Field200
	}
	if s.Field201 != "" {
		fields["field201"] = s.Field201
	}
	if s.Field202 != "" {
		fields["field202"] = s.Field202
	}
	if s.Field203 != "" {
		fields["field203"] = s.Field203
	}
	if s.Field204 != "" {
		fields["field204"] = s.Field204
	}
	if s.Field205 != "" {
		fields["field205"] = s.Field205
	}
	if s.Field206 != "" {
		fields["field206"] = s.Field206
	}
	if s.Field207 != "" {
		fields["field207"] = s.Field207
	}
	if s.Field208 != "" {
		fields["field208"] = s.Field208
	}
	if s.Field209 != "" {
		fields["field209"] = s.Field209
	}

	// 300 Series - Location Information
	if s.Field300 != "" {
		fields["field300"] = s.Field300
	}
	if s.Field301 != "" {
		fields["field301"] = s.Field301
	}
	if s.Field302 != "" {
		fields["field302"] = s.Field302
	}
	if s.Field303 != "" {
		fields["field303"] = s.Field303
	}
	if s.Field304 != "" {
		fields["field304"] = s.Field304
	}
	if s.Field305 != "" {
		fields["field305"] = s.Field305
	}
	if s.Field306 != "" {
		fields["field306"] = s.Field306
	}
	if s.Field307 != "" {
		fields["field307"] = s.Field307
	}

	// 300 Series - Equipment
	if s.Field340 != "" {
		fields["field340"] = s.Field340
	}
	if s.Field341 != "" {
		fields["field341"] = s.Field341
	}
	if s.Field342 != "" {
		fields["field342"] = s.Field342
	}
	if s.Field343 != "" {
		fields["field343"] = s.Field343
	}
	if s.Field344 != "" {
		fields["field344"] = s.Field344
	}
	if s.Field345 != "" {
		fields["field345"] = s.Field345
	}
	if s.Field346 != "" {
		fields["field346"] = s.Field346
	}
	if s.Field347 != "" {
		fields["field347"] = s.Field347
	}
	if s.Field348 != "" {
		fields["field348"] = s.Field348
	}
	if s.Field349 != "" {
		fields["field349"] = s.Field349
	}
	if s.Field354 != "" {
		fields["field354"] = s.Field354
	}
	if s.Field355 != "" {
		fields["field355"] = s.Field355
	}
	if s.Field356 != nil {
		fields["field356"] = fmt.Sprintf("%d", *s.Field356)
	}
	if s.Field357 != nil {
		fields["field357"] = fmt.Sprintf("%.2f", *s.Field357)
	}
	if s.Field358 != nil {
		fields["field358"] = fmt.Sprintf("%.2f", *s.Field358)
	}
	if s.Field359 != nil {
		fields["field359"] = fmt.Sprintf("%.2f", *s.Field359)
	}
	if s.Field360 != nil {
		fields["field360"] = fmt.Sprintf("%.2f", *s.Field360)
	}
	if s.Field361 != nil {
		fields["field361"] = fmt.Sprintf("%d", *s.Field361)
	}
	if s.Field362 != "" {
		fields["field362"] = s.Field362
	}
	if s.Field363 != "" {
		fields["field363"] = s.Field363
	}
	if s.Field364 != nil {
		fields["field364"] = fmt.Sprintf("%.2f", *s.Field364)
	}
	if s.Field365 != nil {
		fields["field365"] = fmt.Sprintf("%.2f", *s.Field365)
	}
	if s.Field373 != "" {
		fields["field373"] = s.Field373
	}
	if s.Field374 != "" {
		fields["field374"] = s.Field374
	}

	// 400 Series - Radio/Frequency
	if s.Field400 != "" {
		fields["field400"] = s.Field400
	}
	if s.Field401 != "" {
		fields["field401"] = s.Field401
	}
	if s.Field403 != "" {
		fields["field403"] = s.Field403
	}
	if s.Field406 != "" {
		fields["field406"] = s.Field406
	}
	if s.Field407 != "" {
		fields["field407"] = s.Field407
	}
	if s.Field408 != "" {
		fields["field408"] = s.Field408
	}
	if s.Field415 != nil {
		fields["field415"] = fmt.Sprintf("%.2f", *s.Field415)
	}
	if s.Field416 != nil {
		fields["field416"] = fmt.Sprintf("%d", *s.Field416)
	}
	if s.Field417 != nil {
		fields["field417"] = fmt.Sprintf("%d", *s.Field417)
	}
	if s.Field418 != "" {
		fields["field418"] = s.Field418
	}
	if s.Field419 != nil {
		fields["field419"] = fmt.Sprintf("%d", *s.Field419)
	}
	if s.Field440 != "" {
		fields["field440"] = s.Field440
	}
	if s.Field442 != "" {
		fields["field442"] = s.Field442
	}
	if s.Field443 != "" {
		fields["field443"] = s.Field443
	}
	if s.Field453 != "" {
		fields["field453"] = s.Field453
	}
	if s.Field454 != "" {
		fields["field454"] = s.Field454
	}
	if s.Field455 != "" {
		fields["field455"] = s.Field455
	}
	if s.Field456 != nil {
		fields["field456"] = fmt.Sprintf("%d", *s.Field456)
	}
	if s.Field457 != nil {
		fields["field457"] = fmt.Sprintf("%.2f", *s.Field457)
	}
	if s.Field458 != nil {
		fields["field458"] = fmt.Sprintf("%.2f", *s.Field458)
	}
	if s.Field459 != nil {
		fields["field459"] = fmt.Sprintf("%.2f", *s.Field459)
	}
	if s.Field460 != nil {
		fields["field460"] = fmt.Sprintf("%.2f", *s.Field460)
	}
	if s.Field461 != nil {
		fields["field461"] = fmt.Sprintf("%d", *s.Field461)
	}
	if s.Field462 != "" {
		fields["field462"] = s.Field462
	}
	if s.Field463 != "" {
		fields["field463"] = s.Field463
	}
	if s.Field470 != nil {
		fields["field470"] = fmt.Sprintf("%d", *s.Field470)
	}
	if s.Field471 != nil {
		fields["field471"] = fmt.Sprintf("%d", *s.Field471)
	}
	if s.Field472 != nil {
		fields["field472"] = fmt.Sprintf("%d", *s.Field472)
	}
	if s.Field473 != "" {
		fields["field473"] = s.Field473
	}

	// 500 Series - IRAC Notes
	if s.Field500 != "" {
		fields["field500"] = s.Field500
	}
	if s.Field501 != "" {
		fields["field501"] = s.Field501
	}
	if s.Field502 != "" {
		fields["field502"] = s.Field502
	}
	if s.Field503 != "" {
		fields["field503"] = s.Field503
	}
	if s.Field504 != "" {
		fields["field504"] = s.Field504
	}
	if s.Field506 != "" {
		fields["field506"] = s.Field506
	}
	if s.Field511 != "" {
		fields["field511"] = s.Field511
	}
	if s.Field512 != "" {
		fields["field512"] = s.Field512
	}
	if s.Field513 != "" {
		fields["field513"] = s.Field513
	}
	if s.Field520 != "" {
		fields["field520"] = s.Field520
	}
	if s.Field521 != "" {
		fields["field521"] = s.Field521
	}
	if s.Field530 != "" {
		fields["field530"] = s.Field530
	}
	if s.Field531 != "" {
		fields["field531"] = s.Field531
	}

	// Date field conversion using database-compatible format
	if s.Field140 != nil {
		fields["field140"] = s.Field140.Format("2006-01-02")
	}
	if s.Field141 != nil {
		fields["field141"] = s.Field141.Format("2006-01-02")
	}
	if s.Field142 != nil {
		fields["field142"] = s.Field142.Format("2006-01-02")
	}
	if s.Field143 != nil {
		fields["field143"] = s.Field143.Format("2006-01-02")
	}
	if s.Field805 != nil {
		fields["field805"] = s.Field805.Format("2006-01-02")
	}
	if s.Field904 != nil {
		fields["field904"] = s.Field904.Format("2006-01-02")
	}
	if s.Field911 != nil {
		fields["field911"] = s.Field911.Format("2006-01-02")
	}
	if s.Field927 != nil {
		fields["field927"] = s.Field927.Format("2006-01-02")
	}
	if s.Field928 != nil {
		fields["field928"] = s.Field928.Format("2006-01-02")
	}

	// Numeric field conversion for database compatibility
	if s.Field315 != nil {
		fields["field315"] = fmt.Sprintf("%.2f", *s.Field315)
	}
	if s.Field316 != nil {
		fields["field316"] = fmt.Sprintf("%d", *s.Field316)
	}
	if s.Field317 != nil {
		fields["field317"] = fmt.Sprintf("%d", *s.Field317)
	}
	if s.Field319 != nil {
		fields["field319"] = fmt.Sprintf("%d", *s.Field319)
	}
	if s.Field321 != nil {
		fields["field321"] = fmt.Sprintf("%.2f", *s.Field321)
	}
	if s.Field926 != nil {
		fields["field926"] = fmt.Sprintf("%.3f", *s.Field926)
	} // High precision (Source: table_info.txt shows NUMERIC(12,3))
	if s.Field957 != nil {
		fields["field957"] = fmt.Sprintf("%d", *s.Field957)
	}
	if s.Field964 != nil {
		fields["field964"] = fmt.Sprintf("%d", *s.Field964)
	}
	if s.Field965 != nil {
		fields["field965"] = fmt.Sprintf("%d", *s.Field965)
	}

	// Complete field mapping for ALL remaining fields...
	if s.Field600 != "" {
		fields["field600"] = s.Field600
	}
	if s.Field601 != "" {
		fields["field601"] = s.Field601
	}
	if s.Field602 != "" {
		fields["field602"] = s.Field602
	}
	if s.Field603 != "" {
		fields["field603"] = s.Field603
	}
	if s.Field604 != "" {
		fields["field604"] = s.Field604
	} // Number of Receivers - total in system (Source: services.txt)
	if s.Field605 != "" {
		fields["field605"] = s.Field605
	} // Traffic Volume - expected volume or duty cycle (Source: services.txt)
	if s.Field606 != "" {
		fields["field606"] = s.Field606
	} // Critical Infrastructure (Yes/No) (Source: services.txt)
	if s.Field607 != "" {
		fields["field607"] = s.Field607
	} // Emergency Communications (Yes/No) - Used for emergency communications? (Source: services.txt)
	if s.Field608 != "" {
		fields["field608"] = s.Field608
	} // Operational Hours - Additional operational parameters
	if s.Field609 != "" {
		fields["field609"] = s.Field609
	} // Backup Systems - Redundancy and backup information

	// 700 Series - Coordination Information (Source: services.txt, table_info.txt)
	if s.Field700 != "" {
		fields["field700"] = s.Field700
	} // Coordination Required (Yes/No/Unknown) - Is frequency coordination required? (Source: services.txt)
	if s.Field701 != "" {
		fields["field701"] = s.Field701
	} // VARCHAR(3) - Coordination Agency - Agency responsible for coordination (Source: table_info.txt)
	if s.Field702 != "" {
		fields["field702"] = s.Field702
	} // VARCHAR(15) - International Coordination (Yes/No) - International coordination required? (Source: table_info.txt)
	if s.Field703 != "" {
		fields["field703"] = s.Field703
	} // Border Distance (km) - Distance to nearest international border (Source: services.txt)
	if s.Field704 != "" {
		fields["field704"] = s.Field704
	} // VARCHAR(1) - Satellite Coordination (Yes/No) - Satellite coordination required? (Source: table_info.txt)
	if s.Field705 != "" {
		fields["field705"] = s.Field705
	} // Coordination Notes - Additional coordination requirements
	if s.Field706 != "" {
		fields["field706"] = s.Field706
	} // International Treaties - Applicable treaty references
	if s.Field707 != "" {
		fields["field707"] = s.Field707
	} // VARCHAR(8) - Timing information (Source: table_info.txt)
	if s.Field708 != "" {
		fields["field708"] = s.Field708
	} // Cross-Border Coordination - Specific cross-border requirements
	if s.Field709 != "" {
		fields["field709"] = s.Field709
	} // Coordination Status - Current coordination status
	if s.Field710 != "" {
		fields["field710"] = s.Field710
	} // VARCHAR(35) - Operational notes (Source: table_info.txt)
	if s.Field711 != "" {
		fields["field711"] = s.Field711
	} // VARCHAR(6) - Service codes (Source: table_info.txt)
	if s.Field712 != "" {
		fields["field712"] = s.Field712
	} // Coordination Timeline - Expected coordination timeframe
	if s.Field713 != "" {
		fields["field713"] = s.Field713
	} // Stakeholder Agencies - Other agencies involved
	if s.Field714 != "" {
		fields["field714"] = s.Field714
	} // Coordination Complexity - Simple/Medium/Complex
	if s.Field715 != "" {
		fields["field715"] = s.Field715
	} // Special Requirements - Unique coordination needs
	if s.Field716 != "" {
		fields["field716"] = s.Field716
	} // VARCHAR(1) - Status flags (Source: table_info.txt)

	// 800 Series - Administrative Information (Source: services.txt, table_info.txt)
	if s.Field800 != "" {
		fields["field800"] = s.Field800
	} // POC Name - Primary point of contact name (Source: services.txt)
	if s.Field801 != "" {
		fields["field801"] = s.Field801
	} // VARCHAR(60) - POC Title - Point of contact title/position (Source: table_info.txt)
	if s.Field802 != "" {
		fields["field802"] = s.Field802
	} // POC Phone - Point of contact phone number (Source: services.txt)
	if s.Field803 != "" {
		fields["field803"] = s.Field803
	} // VARCHAR(60) - POC Email - Point of contact email address (Source: table_info.txt)
	if s.Field804 != "" {
		fields["field804"] = s.Field804
	} // VARCHAR(60) - Organization - Requesting organization or unit (Source: table_info.txt)
	if s.Field805 != nil {
		fields["field805"] = s.Field805.Format("2006-01-02")
	} // DATE - Address Line 1 - Organization address (Source: table_info.txt)
	if s.Field806 != "" {
		fields["field806"] = s.Field806
	} // VARCHAR(60) - Address Line 2 - Additional address information (Source: table_info.txt)
	if s.Field807 != "" {
		fields["field807"] = s.Field807
	} // City (Source: services.txt)
	if s.Field808 != "" {
		fields["field808"] = s.Field808
	} // State/Province (Source: services.txt)
	if s.Field809 != "" {
		fields["field809"] = s.Field809
	} // Postal Code - ZIP or postal code (Source: services.txt)
	if s.Field810 != "" {
		fields["field810"] = s.Field810
	} // Country Code - ISO country code
	if s.Field811 != "" {
		fields["field811"] = s.Field811
	} // Time Zone - Operating time zone
	if s.Field812 != "" {
		fields["field812"] = s.Field812
	} // Business Hours - Standard business hours
	if s.Field813 != "" {
		fields["field813"] = s.Field813
	} // Emergency Contact - 24/7 emergency contact
	if s.Field814 != "" {
		fields["field814"] = s.Field814
	} // Alternate Contact - Secondary contact information
	if s.Field815 != "" {
		fields["field815"] = s.Field815
	} // Department Code - Internal department identifier

	// 900 Series - Comments and Special Requirements (Source: services.txt, table_info.txt)
	if s.Field900 != "" {
		fields["field900"] = s.Field900
	} // IRAC Notes - Notes for IRAC review and coordination (Source: services.txt)
	if s.Field901 != "" {
		fields["field901"] = s.Field901
	} // VARCHAR(1) - Technical Comments - Technical notes and specifications (Source: table_info.txt)
	if s.Field902 != "" {
		fields["field902"] = s.Field902
	} // Operational Comments - Operational requirements and constraints (Source: services.txt)
	if s.Field903 != "" {
		fields["field903"] = s.Field903
	} // VARCHAR(4) - Regulatory Comments - Regulatory compliance notes (Source: table_info.txt)
	if s.Field904 != nil {
		fields["field904"] = s.Field904.Format("2006-01-02")
	} // DATE - General Comments - Additional comments and information (Source: table_info.txt)
	if s.Field905 != "" {
		fields["field905"] = s.Field905
	} // VARCHAR(14) - Processing identifiers (Source: table_info.txt)
	if s.Field906 != "" {
		fields["field906"] = s.Field906
	} // VARCHAR(66) - Extended processing data (Source: table_info.txt)
	if s.Field907 != "" {
		fields["field907"] = s.Field907
	} // VARCHAR(1) - Processing status (Source: table_info.txt)
	if s.Field908 != "" {
		fields["field908"] = s.Field908
	} // Security Classification - Classification level
	if s.Field909 != "" {
		fields["field909"] = s.Field909
	} // Handling Instructions - Special handling requirements
	if s.Field910 != "" {
		fields["field910"] = s.Field910
	} // VARCHAR(20) - Administrative codes (Source: table_info.txt)
	if s.Field911 != nil {
		fields["field911"] = s.Field911.Format("2006-01-02")
	} // DATE - Administrative dates (Source: table_info.txt)
	if s.Field912 != "" {
		fields["field912"] = s.Field912
	} // Review Status - Current review status
	if s.Field913 != "" {
		fields["field913"] = s.Field913
	} // Approval Authority - Approving authority
	if s.Field914 != "" {
		fields["field914"] = s.Field914
	} // Risk Assessment - Security risk level
	if s.Field915 != "" {
		fields["field915"] = s.Field915
	} // Mitigation Measures - Risk mitigation steps
	if s.Field916 != "" {
		fields["field916"] = s.Field916
	} // Compliance Notes - Regulatory compliance details
	if s.Field917 != "" {
		fields["field917"] = s.Field917
	} // Environmental Impact - Environmental considerations
	if s.Field918 != "" {
		fields["field918"] = s.Field918
	} // Safety Requirements - Safety protocols
	if s.Field919 != "" {
		fields["field919"] = s.Field919
	} // Training Requirements - Operator training needs
	if s.Field920 != "" {
		fields["field920"] = s.Field920
	} // Maintenance Schedule - Equipment maintenance plan
	if s.Field921 != "" {
		fields["field921"] = s.Field921
	} // Backup Procedures - Emergency backup plans
	if s.Field922 != "" {
		fields["field922"] = s.Field922
	} // Quality Assurance - QA procedures
	if s.Field923 != "" {
		fields["field923"] = s.Field923
	} // Performance Metrics - Key performance indicators
	if s.Field924 != "" {
		fields["field924"] = s.Field924
	} // VARCHAR(4) - Classification codes (Source: table_info.txt)
	if s.Field925 != "" {
		fields["field925"] = s.Field925
	} // Audit Trail - Audit and review history
	if s.Field926 != nil {
		fields["field926"] = fmt.Sprintf("%.3f", *s.Field926)
	} // NUMERIC(12,3) - High precision measurements (Source: table_info.txt)
	if s.Field927 != nil {
		fields["field927"] = s.Field927.Format("2006-01-02")
	} // DATE - Processing dates (Source: table_info.txt)
	if s.Field928 != nil {
		fields["field928"] = s.Field928.Format("2006-01-02")
	} // DATE - Completion dates (Source: table_info.txt)
	if s.Field929 != "" {
		fields["field929"] = s.Field929
	} // Final Approval - Final approval status

	// 950+ Series - Final Processing Information (Source: table_info.txt)
	if s.Field950 != "" {
		fields["field950"] = s.Field950
	} // Final Review Status - Completion of review process
	if s.Field951 != "" {
		fields["field951"] = s.Field951
	} // Archive Status - Archive and retention status
	if s.Field952 != "" {
		fields["field952"] = s.Field952
	} // VARCHAR(1) - Final status (Source: table_info.txt)
	if s.Field953 != "" {
		fields["field953"] = s.Field953
	} // VARCHAR(10) - Completion codes (Source: table_info.txt)
	if s.Field954 != "" {
		fields["field954"] = s.Field954
	} // Disposition Instructions - Final disposition
	if s.Field955 != "" {
		fields["field955"] = s.Field955
	} // Retention Period - Record retention timeframe
	if s.Field956 != "" {
		fields["field956"] = s.Field956
	} // VARCHAR(10) - Reference numbers (Source: table_info.txt)
	if s.Field957 != nil {
		fields["field957"] = fmt.Sprintf("%d", *s.Field957)
	} // INTEGER - Processing counts (Source: table_info.txt)
	if s.Field958 != "" {
		fields["field958"] = s.Field958
	} // VARCHAR(1) - Completion flags (Source: table_info.txt)
	if s.Field959 != "" {
		fields["field959"] = s.Field959
	} // VARCHAR(40) - Final notes (Source: table_info.txt)
	if s.Field960 != "" {
		fields["field960"] = s.Field960
	} // Legacy System Reference - Reference to legacy systems
	if s.Field961 != "" {
		fields["field961"] = s.Field961
	} // Migration Status - System migration status
	if s.Field962 != "" {
		fields["field962"] = s.Field962
	} // Data Quality Score - Data completeness rating
	if s.Field963 != "" {
		fields["field963"] = s.Field963
	} // VARCHAR(22) - Archive information (Source: table_info.txt)
	if s.Field964 != nil {
		fields["field964"] = fmt.Sprintf("%d", *s.Field964)
	} // INTEGER - Archive parameters (Source: table_info.txt)
	if s.Field965 != nil {
		fields["field965"] = fmt.Sprintf("%d", *s.Field965)
	} // INTEGER - Archive counts (Source: table_info.txt)
	if s.Field966 != "" {
		fields["field966"] = s.Field966
	} // Verification Status - Data verification status
	if s.Field967 != "" {
		fields["field967"] = s.Field967
	} // Exception Handling - Exception processing notes
	if s.Field968 != "" {
		fields["field968"] = s.Field968
	} // System Integration - Integration status
	if s.Field969 != "" {
		fields["field969"] = s.Field969
	} // Performance Rating - System performance assessment

	// 980+ Series - System and Archive Information (Source: table_info.txt)
	if s.Field980 != "" {
		fields["field980"] = s.Field980
	} // System Version - Software/firmware version
	if s.Field981 != "" {
		fields["field981"] = s.Field981
	} // Configuration Hash - System configuration checksum
	if s.Field982 != "" {
		fields["field982"] = s.Field982
	} // VARCHAR(5) - System codes (Source: table_info.txt)
	if s.Field983 != "" {
		fields["field983"] = s.Field983
	} // VARCHAR(16) - System identifiers (Source: table_info.txt)
	if s.Field984 != "" {
		fields["field984"] = s.Field984
	} // VARCHAR(11) - Archive codes (Source: table_info.txt)
	if s.Field985 != "" {
		fields["field985"] = s.Field985
	} // VARCHAR(1) - Archive flags (Source: table_info.txt)
	if s.Field986 != "" {
		fields["field986"] = s.Field986
	} // VARCHAR(15) - System parameters (Source: table_info.txt)
	if s.Field987 != "" {
		fields["field987"] = s.Field987
	} // VARCHAR(3) - Configuration codes (Source: table_info.txt)
	if s.Field988 != "" {
		fields["field988"] = s.Field988
	} // VARCHAR(5) - System types (Source: table_info.txt)
	if s.Field989 != "" {
		fields["field989"] = s.Field989
	} // VARCHAR(16) - Extended system data (Source: table_info.txt)
	if s.Field990 != "" {
		fields["field990"] = s.Field990
	} // VARCHAR(2) - Status codes (Source: table_info.txt)
	if s.Field991 != "" {
		fields["field991"] = s.Field991
	} // VARCHAR(3) - Processing codes (Source: table_info.txt)
	if s.Field992 != "" {
		fields["field992"] = s.Field992
	} // VARCHAR(3) - Archive status (Source: table_info.txt)
	if s.Field993 != "" {
		fields["field993"] = s.Field993
	} // VARCHAR(6) - Reference codes (Source: table_info.txt)
	if s.Field994 != "" {
		fields["field994"] = s.Field994
	} // VARCHAR(1) - Final flags (Source: table_info.txt)
	if s.Field995 != "" {
		fields["field995"] = s.Field995
	} // VARCHAR(15) - Final parameters (Source: table_info.txt)
	if s.Field996 != "" {
		fields["field996"] = s.Field996
	} // VARCHAR(8) - Completion codes (Source: table_info.txt)
	if s.Field997 != "" {
		fields["field997"] = s.Field997
	} // VARCHAR(10) - Final identifiers (Source: table_info.txt)
	if s.Field998 != "" {
		fields["field998"] = s.Field998
	} // VARCHAR(3) - End status (Source: table_info.txt)
	if s.Field999 != "" {
		fields["field999"] = s.Field999
	} // VARCHAR(20) - Final notes (Source: table_info.txt)

	return fields
}

// FromFieldMap converts map[string]string back to typed SFAF struct fields
// This enables backward compatibility with existing API handlers (Source: handlers.txt)
func (s *SFAF) FromFieldMap(fields map[string]string) {
	// 000 Series - Basic Information (Source: table_info.txt)
	if val, ok := fields["field005"]; ok {
		s.Field005 = val
	} // VARCHAR(10)
	if val, ok := fields["field006"]; ok {
		s.Field006 = val
	} // VARCHAR(10)
	if val, ok := fields["field007"]; ok {
		s.Field007 = val
	} // VARCHAR(1)
	if val, ok := fields["field010"]; ok {
		s.Field010 = val
	} // VARCHAR(1)
	if val, ok := fields["field013"]; ok {
		s.Field013 = val
	} // VARCHAR(35)
	if val, ok := fields["field014"]; ok {
		s.Field014 = val
	} // VARCHAR(60)
	if val, ok := fields["field015"]; ok {
		s.Field015 = val
	} // VARCHAR(72)
	if val, ok := fields["field016"]; ok {
		s.Field016 = val
	} // VARCHAR(35)
	if val, ok := fields["field017"]; ok {
		s.Field017 = val
	} // VARCHAR(8)
	if val, ok := fields["field018"]; ok {
		s.Field018 = val
	} // VARCHAR(60)
	if val, ok := fields["field019"]; ok {
		s.Field019 = val
	} // VARCHAR(35)
	if val, ok := fields["field020"]; ok {
		s.Field020 = val
	} // VARCHAR(64)

	if val, ok := fields["field102"]; ok {
		s.Field102 = val
	}
	if val, ok := fields["field103"]; ok {
		s.Field103 = val
	}
	if val, ok := fields["field105"]; ok {
		s.Field105 = val
	}
	if val, ok := fields["field106"]; ok {
		s.Field106 = val
	}
	if val, ok := fields["field107"]; ok {
		s.Field107 = val
	}
	if val, ok := fields["field108"]; ok {
		s.Field108 = val
	}
	if val, ok := fields["field110"]; ok {
		s.Field110 = val
	}
	if val, ok := fields["field111"]; ok {
		s.Field111 = val
	}
	if val, ok := fields["field112"]; ok {
		s.Field112 = val
	}
	if val, ok := fields["field113"]; ok {
		s.Field113 = val
	}
	if val, ok := fields["field114"]; ok {
		s.Field114 = val
	}
	if val, ok := fields["field115"]; ok {
		s.Field115 = val
	}
	if val, ok := fields["field116"]; ok {
		s.Field116 = val
	}
	if val, ok := fields["field117"]; ok {
		s.Field117 = val
	}
	if val, ok := fields["field118"]; ok {
		s.Field118 = val
	}
	if val, ok := fields["field130"]; ok {
		s.Field130 = val
	}
	if val, ok := fields["field131"]; ok {
		s.Field131 = val
	}
	if val, ok := fields["field144"]; ok {
		s.Field144 = val
	}
	if val, ok := fields["field145"]; ok {
		s.Field145 = val
	}
	if val, ok := fields["field146"]; ok {
		s.Field146 = val
	}
	if val, ok := fields["field147"]; ok {
		s.Field147 = val
	}
	if val, ok := fields["field151"]; ok {
		s.Field151 = val
	}
	if val, ok := fields["field152"]; ok {
		s.Field152 = val
	}
	if val, ok := fields["field200"]; ok {
		s.Field200 = val
	}
	if val, ok := fields["field201"]; ok {
		s.Field201 = val
	}
	if val, ok := fields["field202"]; ok {
		s.Field202 = val
	}
	if val, ok := fields["field203"]; ok {
		s.Field203 = val
	}
	if val, ok := fields["field204"]; ok {
		s.Field204 = val
	}
	if val, ok := fields["field205"]; ok {
		s.Field205 = val
	}
	if val, ok := fields["field206"]; ok {
		s.Field206 = val
	}
	if val, ok := fields["field207"]; ok {
		s.Field207 = val
	}
	if val, ok := fields["field208"]; ok {
		s.Field208 = val
	}
	if val, ok := fields["field209"]; ok {
		s.Field209 = val
	}
	if val, ok := fields["field300"]; ok {
		s.Field300 = val
	}
	if val, ok := fields["field301"]; ok {
		s.Field301 = val
	}
	if val, ok := fields["field302"]; ok {
		s.Field302 = val
	}
	if val, ok := fields["field303"]; ok {
		s.Field303 = val
	}
	if val, ok := fields["field304"]; ok {
		s.Field304 = val
	}
	if val, ok := fields["field305"]; ok {
		s.Field305 = val
	}
	if val, ok := fields["field306"]; ok {
		s.Field306 = val
	}
	if val, ok := fields["field307"]; ok {
		s.Field307 = val
	}
	if val, ok := fields["field318"]; ok {
		s.Field318 = val
	}
	if val, ok := fields["field340"]; ok {
		s.Field340 = val
	}
	if val, ok := fields["field341"]; ok {
		s.Field341 = val
	}
	if val, ok := fields["field342"]; ok {
		s.Field342 = val
	}
	if val, ok := fields["field343"]; ok {
		s.Field343 = val
	}
	if val, ok := fields["field344"]; ok {
		s.Field344 = val
	}
	if val, ok := fields["field345"]; ok {
		s.Field345 = val
	}
	if val, ok := fields["field346"]; ok {
		s.Field346 = val
	}
	if val, ok := fields["field347"]; ok {
		s.Field347 = val
	}
	if val, ok := fields["field348"]; ok {
		s.Field348 = val
	}
	if val, ok := fields["field349"]; ok {
		s.Field349 = val
	}
	if val, ok := fields["field354"]; ok {
		s.Field354 = val
	}
	if val, ok := fields["field355"]; ok {
		s.Field355 = val
	}
	if val, ok := fields["field356"]; ok && val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			s.Field356 = &intVal
		}
	}
	if val, ok := fields["field357"]; ok && val != "" {
		if floatVal, err := strconv.ParseFloat(val, 64); err == nil {
			s.Field357 = &floatVal
		}
	}
	if val, ok := fields["field358"]; ok && val != "" {
		if floatVal, err := strconv.ParseFloat(val, 64); err == nil {
			s.Field358 = &floatVal
		}
	}
	if val, ok := fields["field359"]; ok && val != "" {
		if floatVal, err := strconv.ParseFloat(val, 64); err == nil {
			s.Field359 = &floatVal
		}
	}
	if val, ok := fields["field360"]; ok && val != "" {
		if floatVal, err := strconv.ParseFloat(val, 64); err == nil {
			s.Field360 = &floatVal
		}
	}
	if val, ok := fields["field361"]; ok && val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			s.Field361 = &intVal
		}
	}
	if val, ok := fields["field362"]; ok {
		s.Field362 = val
	}
	if val, ok := fields["field363"]; ok {
		s.Field363 = val
	}
	if val, ok := fields["field364"]; ok && val != "" {
		if floatVal, err := strconv.ParseFloat(val, 64); err == nil {
			s.Field364 = &floatVal
		}
	}
	if val, ok := fields["field365"]; ok && val != "" {
		if floatVal, err := strconv.ParseFloat(val, 64); err == nil {
			s.Field365 = &floatVal
		}
	}
	if val, ok := fields["field373"]; ok {
		s.Field373 = val
	}
	if val, ok := fields["field374"]; ok {
		s.Field374 = val
	}
	if val, ok := fields["field400"]; ok {
		s.Field400 = val
	}
	if val, ok := fields["field401"]; ok {
		s.Field401 = val
	}
	if val, ok := fields["field402"]; ok {
		s.Field402 = val
	}
	if val, ok := fields["field403"]; ok {
		s.Field403 = val
	}
	if val, ok := fields["field404"]; ok {
		s.Field404 = val
	}
	if val, ok := fields["field405"]; ok {
		s.Field405 = val
	}
	if val, ok := fields["field406"]; ok {
		s.Field406 = val
	}
	if val, ok := fields["field407"]; ok {
		s.Field407 = val
	}
	if val, ok := fields["field408"]; ok {
		s.Field408 = val
	}
	if val, ok := fields["field409"]; ok {
		s.Field409 = val
	}
	if val, ok := fields["field418"]; ok {
		s.Field418 = val
	}
	if val, ok := fields["field440"]; ok {
		s.Field440 = val
	}
	if val, ok := fields["field442"]; ok {
		s.Field442 = val
	}
	if val, ok := fields["field443"]; ok {
		s.Field443 = val
	}
	if val, ok := fields["field453"]; ok {
		s.Field453 = val
	}
	if val, ok := fields["field454"]; ok {
		s.Field454 = val
	}
	if val, ok := fields["field455"]; ok {
		s.Field455 = val
	}
	if val, ok := fields["field462"]; ok {
		s.Field462 = val
	}
	if val, ok := fields["field463"]; ok {
		s.Field463 = val
	}
	if val, ok := fields["field473"]; ok {
		s.Field473 = val
	}
	if val, ok := fields["field500"]; ok {
		s.Field500 = val
	}
	if val, ok := fields["field501"]; ok {
		s.Field501 = val
	}
	if val, ok := fields["field502"]; ok {
		s.Field502 = val
	}
	if val, ok := fields["field503"]; ok {
		s.Field503 = val
	}
	if val, ok := fields["field504"]; ok {
		s.Field504 = val
	}
	if val, ok := fields["field505"]; ok {
		s.Field505 = val
	}
	if val, ok := fields["field506"]; ok {
		s.Field506 = val
	}
	if val, ok := fields["field507"]; ok {
		s.Field507 = val
	}
	if val, ok := fields["field508"]; ok {
		s.Field508 = val
	}
	if val, ok := fields["field509"]; ok {
		s.Field509 = val
	}
	if val, ok := fields["field510"]; ok {
		s.Field510 = val
	}
	if val, ok := fields["field511"]; ok {
		s.Field511 = val
	}
	if val, ok := fields["field512"]; ok {
		s.Field512 = val
	}
	if val, ok := fields["field513"]; ok {
		s.Field513 = val
	}
	if val, ok := fields["field520"]; ok {
		s.Field520 = val
	}
	if val, ok := fields["field521"]; ok {
		s.Field521 = val
	}
	if val, ok := fields["field530"]; ok {
		s.Field530 = val
	}
	if val, ok := fields["field531"]; ok {
		s.Field531 = val
	}
	if val, ok := fields["field600"]; ok {
		s.Field600 = val
	}
	if val, ok := fields["field601"]; ok {
		s.Field601 = val
	}
	if val, ok := fields["field602"]; ok {
		s.Field602 = val
	}
	if val, ok := fields["field603"]; ok {
		s.Field603 = val
	}
	if val, ok := fields["field604"]; ok {
		s.Field604 = val
	}
	if val, ok := fields["field605"]; ok {
		s.Field605 = val
	}
	if val, ok := fields["field606"]; ok {
		s.Field606 = val
	}
	if val, ok := fields["field607"]; ok {
		s.Field607 = val
	}
	if val, ok := fields["field608"]; ok {
		s.Field608 = val
	}
	if val, ok := fields["field609"]; ok {
		s.Field609 = val
	}
	if val, ok := fields["field700"]; ok {
		s.Field700 = val
	}
	if val, ok := fields["field701"]; ok {
		s.Field701 = val
	}
	if val, ok := fields["field702"]; ok {
		s.Field702 = val
	}
	if val, ok := fields["field703"]; ok {
		s.Field703 = val
	}
	if val, ok := fields["field704"]; ok {
		s.Field704 = val
	}
	if val, ok := fields["field705"]; ok {
		s.Field705 = val
	}
	if val, ok := fields["field706"]; ok {
		s.Field706 = val
	}
	if val, ok := fields["field707"]; ok {
		s.Field707 = val
	}
	if val, ok := fields["field708"]; ok {
		s.Field708 = val
	}
	if val, ok := fields["field709"]; ok {
		s.Field709 = val
	}
	if val, ok := fields["field710"]; ok {
		s.Field710 = val
	}
	if val, ok := fields["field711"]; ok {
		s.Field711 = val
	}
	if val, ok := fields["field712"]; ok {
		s.Field712 = val
	}
	if val, ok := fields["field713"]; ok {
		s.Field713 = val
	}
	if val, ok := fields["field714"]; ok {
		s.Field714 = val
	}
	if val, ok := fields["field715"]; ok {
		s.Field715 = val
	}
	if val, ok := fields["field716"]; ok {
		s.Field716 = val
	}
	if val, ok := fields["field800"]; ok {
		s.Field800 = val
	}
	if val, ok := fields["field801"]; ok {
		s.Field801 = val
	}
	if val, ok := fields["field802"]; ok {
		s.Field802 = val
	}
	if val, ok := fields["field803"]; ok {
		s.Field803 = val
	}
	if val, ok := fields["field804"]; ok {
		s.Field804 = val
	}
	if val, ok := fields["field806"]; ok {
		s.Field806 = val
	}
	if val, ok := fields["field807"]; ok {
		s.Field807 = val
	}
	if val, ok := fields["field808"]; ok {
		s.Field808 = val
	}
	if val, ok := fields["field809"]; ok {
		s.Field809 = val
	}
	if val, ok := fields["field810"]; ok {
		s.Field810 = val
	}
	if val, ok := fields["field811"]; ok {
		s.Field811 = val
	}
	if val, ok := fields["field812"]; ok {
		s.Field812 = val
	}
	if val, ok := fields["field813"]; ok {
		s.Field813 = val
	}
	if val, ok := fields["field814"]; ok {
		s.Field814 = val
	}
	if val, ok := fields["field815"]; ok {
		s.Field815 = val
	}
	if val, ok := fields["field900"]; ok {
		s.Field900 = val
	}
	if val, ok := fields["field901"]; ok {
		s.Field901 = val
	}
	if val, ok := fields["field902"]; ok {
		s.Field902 = val
	}
	if val, ok := fields["field903"]; ok {
		s.Field903 = val
	}
	if val, ok := fields["field905"]; ok {
		s.Field905 = val
	}
	if val, ok := fields["field906"]; ok {
		s.Field906 = val
	}
	if val, ok := fields["field907"]; ok {
		s.Field907 = val
	}
	if val, ok := fields["field908"]; ok {
		s.Field908 = val
	}
	if val, ok := fields["field909"]; ok {
		s.Field909 = val
	}
	if val, ok := fields["field910"]; ok {
		s.Field910 = val
	}
	if val, ok := fields["field912"]; ok {
		s.Field912 = val
	}
	if val, ok := fields["field913"]; ok {
		s.Field913 = val
	}
	if val, ok := fields["field914"]; ok {
		s.Field914 = val
	}
	if val, ok := fields["field915"]; ok {
		s.Field915 = val
	}
	if val, ok := fields["field916"]; ok {
		s.Field916 = val
	}
	if val, ok := fields["field917"]; ok {
		s.Field917 = val
	}
	if val, ok := fields["field918"]; ok {
		s.Field918 = val
	}
	if val, ok := fields["field919"]; ok {
		s.Field919 = val
	}
	if val, ok := fields["field920"]; ok {
		s.Field920 = val
	}
	if val, ok := fields["field921"]; ok {
		s.Field921 = val
	}
	if val, ok := fields["field922"]; ok {
		s.Field922 = val
	}
	if val, ok := fields["field923"]; ok {
		s.Field923 = val
	}
	if val, ok := fields["field924"]; ok {
		s.Field924 = val
	}
	if val, ok := fields["field925"]; ok {
		s.Field925 = val
	}
	if val, ok := fields["field929"]; ok {
		s.Field929 = val
	}
	if val, ok := fields["field950"]; ok {
		s.Field950 = val
	}
	if val, ok := fields["field951"]; ok {
		s.Field951 = val
	}
	if val, ok := fields["field952"]; ok {
		s.Field952 = val
	}
	if val, ok := fields["field953"]; ok {
		s.Field953 = val
	}
	if val, ok := fields["field954"]; ok {
		s.Field954 = val
	}
	if val, ok := fields["field955"]; ok {
		s.Field955 = val
	}
	if val, ok := fields["field956"]; ok {
		s.Field956 = val
	}
	if val, ok := fields["field958"]; ok {
		s.Field958 = val
	}
	if val, ok := fields["field959"]; ok {
		s.Field959 = val
	}
	if val, ok := fields["field960"]; ok {
		s.Field960 = val
	}
	if val, ok := fields["field961"]; ok {
		s.Field961 = val
	}
	if val, ok := fields["field962"]; ok {
		s.Field962 = val
	}
	if val, ok := fields["field963"]; ok {
		s.Field963 = val
	}
	if val, ok := fields["field966"]; ok {
		s.Field966 = val
	}
	if val, ok := fields["field967"]; ok {
		s.Field967 = val
	}
	if val, ok := fields["field968"]; ok {
		s.Field968 = val
	}
	if val, ok := fields["field969"]; ok {
		s.Field969 = val
	}
	if val, ok := fields["field980"]; ok {
		s.Field980 = val
	}
	if val, ok := fields["field981"]; ok {
		s.Field981 = val
	}
	if val, ok := fields["field982"]; ok {
		s.Field982 = val
	}
	if val, ok := fields["field983"]; ok {
		s.Field983 = val
	}
	if val, ok := fields["field984"]; ok {
		s.Field984 = val
	}
	if val, ok := fields["field985"]; ok {
		s.Field985 = val
	}
	if val, ok := fields["field986"]; ok {
		s.Field986 = val
	}
	if val, ok := fields["field987"]; ok {
		s.Field987 = val
	}
	if val, ok := fields["field988"]; ok {
		s.Field988 = val
	}
	if val, ok := fields["field989"]; ok {
		s.Field989 = val
	}
	if val, ok := fields["field990"]; ok {
		s.Field990 = val
	}
	if val, ok := fields["field991"]; ok {
		s.Field991 = val
	}
	if val, ok := fields["field992"]; ok {
		s.Field992 = val
	}
	if val, ok := fields["field993"]; ok {
		s.Field993 = val
	}
	if val, ok := fields["field994"]; ok {
		s.Field994 = val
	}
	if val, ok := fields["field995"]; ok {
		s.Field995 = val
	}
	if val, ok := fields["field996"]; ok {
		s.Field996 = val
	}
	if val, ok := fields["field997"]; ok {
		s.Field997 = val
	}
	if val, ok := fields["field998"]; ok {
		s.Field998 = val
	}
	if val, ok := fields["field999"]; ok {
		s.Field999 = val
	}

	// Handle date field conversions (Source: table_info.txt shows DATE type fields)
	// Supports both ISO format (2006-01-02) and SFAF file format (20060102)
	parseDate := func(val string) *time.Time {
		for _, layout := range []string{"2006-01-02", "20060102"} {
			if t, err := time.Parse(layout, val); err == nil {
				return &t
			}
		}
		return nil
	}
	if val, ok := fields["field140"]; ok && val != "" {
		s.Field140 = parseDate(val)
	}
	if val, ok := fields["field141"]; ok && val != "" {
		s.Field141 = parseDate(val)
	}
	if val, ok := fields["field142"]; ok && val != "" {
		s.Field142 = parseDate(val)
	}
	if val, ok := fields["field143"]; ok && val != "" {
		s.Field143 = parseDate(val)
	}
	if val, ok := fields["field805"]; ok && val != "" {
		s.Field805 = parseDate(val)
	}
	if val, ok := fields["field904"]; ok && val != "" {
		s.Field904 = parseDate(val)
	}
	if val, ok := fields["field911"]; ok && val != "" {
		s.Field911 = parseDate(val)
	}
	if val, ok := fields["field927"]; ok && val != "" {
		s.Field927 = parseDate(val)
	}
	if val, ok := fields["field928"]; ok && val != "" {
		s.Field928 = parseDate(val)
	}

	// Handle numeric field conversions (Source: table_info.txt shows NUMERIC and INTEGER types)
	if val, ok := fields["field315"]; ok && val != "" {
		if f, err := strconv.ParseFloat(val, 64); err == nil {
			s.Field315 = &f // NUMERIC(5,2)
		}
	}
	if val, ok := fields["field316"]; ok && val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			s.Field316 = &i // INTEGER
		}
	}
	if val, ok := fields["field317"]; ok && val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			s.Field317 = &i // INTEGER
		}
	}
	if val, ok := fields["field319"]; ok && val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			s.Field319 = &i // INTEGER
		}
	}
	if val, ok := fields["field321"]; ok && val != "" {
		if f, err := strconv.ParseFloat(val, 64); err == nil {
			s.Field321 = &f // NUMERIC(6,2)
		}
	}
	if val, ok := fields["field926"]; ok && val != "" {
		if f, err := strconv.ParseFloat(val, 64); err == nil {
			s.Field926 = &f // NUMERIC(12,3) - High precision measurements
		}
	}
	if val, ok := fields["field957"]; ok && val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			s.Field957 = &i // INTEGER - Processing counts
		}
	}
	if val, ok := fields["field964"]; ok && val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			s.Field964 = &i // INTEGER - Archive parameters
		}
	}
	if val, ok := fields["field965"]; ok && val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			s.Field965 = &i // INTEGER - Archive counts
		}
	}
}

// ===== REQUEST AND RESPONSE MODELS =====

// CreateSFAFRequest represents the request structure for creating a new SFAF record (Source: handlers.txt)
type CreateSFAFRequest struct {
	MarkerID string            `json:"marker_id" binding:"required"`
	Fields   map[string]string `json:"fields"`
}

// ToSFAF converts the CreateSFAFRequest to a complete SFAF model for database storage
func (req *CreateSFAFRequest) ToSFAF() (*SFAF, error) {
	// Parse MarkerID to UUID
	markerUUID, err := uuid.Parse(req.MarkerID)
	if err != nil {
		return nil, fmt.Errorf("invalid marker_id format: %w", err)
	}

	// Create new SFAF with timestamps
	sfaf := &SFAF{
		ID:        uuid.New(),
		MarkerID:  &markerUUID, // Use pointer for nullable marker_id
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Convert fields map to typed struct using FromFieldMap method
	sfaf.FromFieldMap(req.Fields)

	return sfaf, nil
}

// UpdateSFAFRequest represents the request structure for updating an existing SFAF record (Source: handlers.txt)
type UpdateSFAFRequest struct {
	Fields map[string]string `json:"fields"`
}

// ValidationResult represents field validation results (Source: services.txt)
type ValidationResult struct {
	IsValid         bool              `json:"is_valid"`
	Errors          map[string]string `json:"errors"`
	Warnings        map[string]string `json:"warnings"`
	RequiredMissing []string          `json:"required_missing"`
	MCEBCompliant   bool              `json:"mceb_compliant"` // MC4EB Publication 7, Change 1 compliance (Source: handlers.txt)
}

// SFAFImportResult represents the results of a bulk SFAF import operation (Source: services.txt)
type SFAFImportResult struct {
	TotalRecords    int      `json:"total_records"`
	SuccessfulCount int      `json:"successful_count"`
	ErrorCount      int      `json:"error_count"`
	Errors          []string `json:"errors"`
	ImportedIDs     []string `json:"imported_ids"`
	ProcessingTime  string   `json:"processing_time"`
}

// SFAFStatistics represents comprehensive statistics for SFAF records (Source: handlers.txt)
type SFAFStatistics struct {
	TotalRecords       int                    `json:"total_records"`
	AgencyDistribution map[string]int         `json:"agency_distribution"`
	FrequencyBands     map[string]int         `json:"frequency_bands"`
	SystemTypes        map[string]int         `json:"system_types"`
	LocationStats      map[string]int         `json:"location_stats"`
	IRACNotesUsage     map[string]interface{} `json:"irac_notes_usage"`
	FieldCompletion    map[string]interface{} `json:"field_completion"`
	MCEBCompliance     map[string]interface{} `json:"mceb_compliance"` // Source: handlers.txt
}

// CoordinateFormats represents multiple coordinate format representations (Source: services.txt)
type CoordinateFormats struct {
	Decimal string `json:"decimal"` // Decimal degrees format
	DMS     string `json:"dms"`     // Degrees, Minutes, Seconds format
	Compact string `json:"compact"` // Military compact format
}

type ValidateSFAFRequest struct {
	Fields   map[string]string `json:"fields" binding:"required"`
	MarkerID string            `json:"marker_id,omitempty"`
}

type SFAFExportFormat struct {
	Format     string            `json:"format"`     // "csv", "json", "xml"
	Fields     []string          `json:"fields"`     // specific fields to export
	Options    map[string]string `json:"options"`    // export options
	Filename   string            `json:"filename"`   // desired filename
	Compressed bool              `json:"compressed"` // whether to compress output
}
