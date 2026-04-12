// models/pool_assignment_models.go
package models

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/google/uuid"
)

// PoolAssignment represents a frequency pool record that can be subassigned
// Pool assignments are identified by having Field300/301 and Field400/401 set to USA or USP
type PoolAssignment struct {
	SFAF // Embedded SFAF struct contains all standard fields

	// Parsed/computed fields for easier matching
	FrequencyMHz    float64          // Parsed from Field110
	EmissionBandwidth float64        // Parsed bandwidth from Field114 (e.g., 7K00 -> 7.0 kHz)
	EmissionType    string           // Parsed modulation type from Field114 (e.g., A3E)
	PowerWatts      float64          // Parsed from Field115 (e.g., W15 -> 15.0 watts)
	CoverageArea    CoverageAreaType // Parsed from Field300/301 or Field400/401
}

// CoverageAreaType represents the geographic coverage of a pool assignment
type CoverageAreaType string

const (
	CoverageUSA CoverageAreaType = "USA" // CONUS only
	CoverageUSP CoverageAreaType = "USP" // CONUS + US possessions
)

// FrequencyNominationRequest represents a user's request for a temporary frequency
type FrequencyNominationRequest struct {
	ID                uuid.UUID        `json:"id"`

	// Mandatory matching criteria
	FrequencyRangeMin float64          `json:"frequency_range_min"` // MHz
	FrequencyRangeMax float64          `json:"frequency_range_max"` // MHz
	EmissionBandwidth float64          `json:"emission_bandwidth"`  // kHz (requested)
	EmissionType      string           `json:"emission_type"`       // Modulation type (e.g., F3E, A3E)
	PowerWatts        float64          `json:"power_watts"`         // Watts (requested)
	Location          string           `json:"location"`            // Geographic location or area

	// Optional fields for context
	Purpose           string           `json:"purpose,omitempty"`
	StartDate         string           `json:"start_date,omitempty"`
	EndDate           string           `json:"end_date,omitempty"`
	Equipment         string           `json:"equipment,omitempty"`
	IsFactoryTuned    bool             `json:"is_factory_tuned"`     // If true, FrequencyRangeMin/Max should be same specific frequency
}

// PoolMatchResult represents the result of matching a nomination request against a pool
type PoolMatchResult struct {
	PoolAssignment    *PoolAssignment  `json:"pool_assignment"`
	IsMatch           bool             `json:"is_match"`
	MatchDetails      MatchDetails     `json:"match_details"`
}

// MatchDetails provides detailed information about why a pool matched or didn't match
type MatchDetails struct {
	FrequencyMatch    bool   `json:"frequency_match"`
	FrequencyReason   string `json:"frequency_reason,omitempty"`

	EmissionMatch     bool   `json:"emission_match"`
	EmissionReason    string `json:"emission_reason,omitempty"`

	PowerMatch        bool   `json:"power_match"`
	PowerReason       string `json:"power_reason,omitempty"`

	LocationMatch     bool   `json:"location_match"`
	LocationReason    string `json:"location_reason,omitempty"`
}

// NewPoolAssignment creates a PoolAssignment from an SFAF record
// It parses relevant fields and determines if this is a valid pool assignment
func NewPoolAssignment(sfaf SFAF) (*PoolAssignment, error) {
	pool := &PoolAssignment{
		SFAF: sfaf,
	}

	// Check if this is a pool assignment (Field300/301 or Field400/401 = USA or USP)
	if !isPoolRecord(sfaf) {
		return nil, fmt.Errorf("SFAF record is not a pool assignment (Field300/301 and Field400/401 must be USA or USP)")
	}

	// Parse frequency from Field110
	freq, err := parseFrequency(sfaf.Field110)
	if err != nil {
		return nil, fmt.Errorf("failed to parse frequency from Field110: %w", err)
	}
	pool.FrequencyMHz = freq

	// Parse emission designator from Field114
	bandwidth, modType, err := parseEmissionDesignator(sfaf.Field114)
	if err != nil {
		return nil, fmt.Errorf("failed to parse emission designator from Field114: %w", err)
	}
	pool.EmissionBandwidth = bandwidth
	pool.EmissionType = modType

	// Parse power from Field115
	power, err := parsePower(sfaf.Field115)
	if err != nil {
		return nil, fmt.Errorf("failed to parse power from Field115: %w", err)
	}
	pool.PowerWatts = power

	// Determine coverage area
	pool.CoverageArea = parseCoverageArea(sfaf.Field300, sfaf.Field400)

	return pool, nil
}

// isPoolRecord checks if an SFAF record is a pool assignment
// Pool records have Field300/301 and Field400/401 set to USA or USP
func isPoolRecord(sfaf SFAF) bool {
	field300 := strings.TrimSpace(sfaf.Field300)
	field400 := strings.TrimSpace(sfaf.Field400)

	// Check if both 300 and 400 series indicate USA or USP
	is300Pool := field300 == "USA" || field300 == "USP"
	is400Pool := field400 == "USA" || field400 == "USP"

	return is300Pool && is400Pool
}

// parseFrequency extracts frequency in MHz from Field110
// Examples: "M298.325" -> 298.325 MHz
func parseFrequency(field110 string) (float64, error) {
	field110 = strings.TrimSpace(field110)
	if field110 == "" {
		return 0, fmt.Errorf("Field110 is empty")
	}

	// Remove 'M' prefix if present (indicates MHz)
	freqStr := strings.TrimPrefix(field110, "M")

	freq, err := strconv.ParseFloat(freqStr, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid frequency format '%s': %w", field110, err)
	}

	return freq, nil
}

// parseEmissionDesignator extracts bandwidth (kHz) and modulation type from Field114
// Examples:
//   "7K00A3E" -> bandwidth: 7.0 kHz, type: "A3E"
//   "16K0F3E" -> bandwidth: 16.0 kHz, type: "F3E"
//   "25K0F3E" -> bandwidth: 25.0 kHz, type: "F3E"
func parseEmissionDesignator(field114 string) (bandwidth float64, modulationType string, err error) {
	field114 = strings.TrimSpace(field114)
	if field114 == "" {
		return 0, "", fmt.Errorf("Field114 is empty")
	}

	// Find the position where bandwidth ends (look for alphabetic character after digits)
	// Format: <bandwidth><unit><modulation>
	// Example: 7K00A3E = 7 + K + 00 + A3E
	//          16K0F3E = 16 + K + 0 + F3E

	// Find 'K' (kHz), 'M' (MHz), or 'H' (Hz)
	var unitPos int = -1
	for i, ch := range field114 {
		if ch == 'K' || ch == 'M' || ch == 'H' {
			unitPos = i
			break
		}
	}

	if unitPos == -1 {
		return 0, "", fmt.Errorf("invalid emission designator format '%s': no unit found", field114)
	}

	// Extract bandwidth value (before unit)
	bandwidthStr := field114[:unitPos]
	unit := field114[unitPos : unitPos+1]

	// Parse bandwidth value
	bw, err := strconv.ParseFloat(bandwidthStr, 64)
	if err != nil {
		return 0, "", fmt.Errorf("invalid bandwidth in emission designator '%s': %w", field114, err)
	}

	// Convert to kHz for consistent comparison
	switch unit {
	case "H":
		bandwidth = bw / 1000.0 // Hz to kHz
	case "K":
		bandwidth = bw // Already in kHz
	case "M":
		bandwidth = bw * 1000.0 // MHz to kHz
	default:
		return 0, "", fmt.Errorf("unknown unit '%s' in emission designator", unit)
	}

	// Find where modulation type starts
	// After unit, there may be additional digits (e.g., "00" in "7K00A3E")
	// Modulation type starts at first letter after unit
	modStart := unitPos + 1
	for modStart < len(field114) && (field114[modStart] >= '0' && field114[modStart] <= '9') {
		modStart++
	}

	if modStart >= len(field114) {
		return 0, "", fmt.Errorf("invalid emission designator format '%s': no modulation type found", field114)
	}

	modulationType = field114[modStart:]

	return bandwidth, modulationType, nil
}

// parsePower extracts power in watts from Field115
// Examples: "W15" -> 15.0 watts, "W100" -> 100.0 watts
func parsePower(field115 string) (float64, error) {
	field115 = strings.TrimSpace(field115)
	if field115 == "" {
		return 0, fmt.Errorf("Field115 is empty")
	}

	// Remove 'W' prefix (indicates watts)
	powerStr := strings.TrimPrefix(field115, "W")

	power, err := strconv.ParseFloat(powerStr, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid power format '%s': %w", field115, err)
	}

	return power, nil
}

// parseCoverageArea determines coverage area from Field300 and Field400
func parseCoverageArea(field300, field400 string) CoverageAreaType {
	field300 = strings.TrimSpace(field300)
	field400 = strings.TrimSpace(field400)

	// Priority: use Field300, fallback to Field400
	if field300 == "USP" || field400 == "USP" {
		return CoverageUSP
	}

	return CoverageUSA
}

// Matches checks if this pool assignment matches a nomination request
func (p *PoolAssignment) Matches(req *FrequencyNominationRequest) *PoolMatchResult {
	result := &PoolMatchResult{
		PoolAssignment: p,
		IsMatch:        false,
		MatchDetails:   MatchDetails{},
	}

	// 1. Check frequency match
	// Pool's single frequency must fall within requested range
	if p.FrequencyMHz >= req.FrequencyRangeMin && p.FrequencyMHz <= req.FrequencyRangeMax {
		result.MatchDetails.FrequencyMatch = true
		result.MatchDetails.FrequencyReason = fmt.Sprintf("Pool frequency %.3f MHz falls within requested range %.3f-%.3f MHz",
			p.FrequencyMHz, req.FrequencyRangeMin, req.FrequencyRangeMax)
	} else {
		result.MatchDetails.FrequencyMatch = false
		result.MatchDetails.FrequencyReason = fmt.Sprintf("Pool frequency %.3f MHz is outside requested range %.3f-%.3f MHz",
			p.FrequencyMHz, req.FrequencyRangeMin, req.FrequencyRangeMax)
	}

	// 2. Check emission designator match
	// Pool bandwidth must be >= requested bandwidth
	// Pool modulation type must exactly match requested type
	bandwidthMatch := p.EmissionBandwidth >= req.EmissionBandwidth
	modulationMatch := p.EmissionType == req.EmissionType

	if bandwidthMatch && modulationMatch {
		result.MatchDetails.EmissionMatch = true
		result.MatchDetails.EmissionReason = fmt.Sprintf("Pool emission %.1fK%s meets requested %.1fK%s",
			p.EmissionBandwidth, p.EmissionType, req.EmissionBandwidth, req.EmissionType)
	} else if !bandwidthMatch {
		result.MatchDetails.EmissionMatch = false
		result.MatchDetails.EmissionReason = fmt.Sprintf("Pool bandwidth %.1f kHz is less than requested %.1f kHz",
			p.EmissionBandwidth, req.EmissionBandwidth)
	} else { // !modulationMatch
		result.MatchDetails.EmissionMatch = false
		result.MatchDetails.EmissionReason = fmt.Sprintf("Pool modulation type %s does not match requested %s",
			p.EmissionType, req.EmissionType)
	}

	// 3. Check power match
	// Requested power must be <= pool power (pool power is maximum)
	if req.PowerWatts <= p.PowerWatts {
		result.MatchDetails.PowerMatch = true
		result.MatchDetails.PowerReason = fmt.Sprintf("Requested power %.1f W is within pool maximum %.1f W",
			req.PowerWatts, p.PowerWatts)
	} else {
		result.MatchDetails.PowerMatch = false
		result.MatchDetails.PowerReason = fmt.Sprintf("Requested power %.1f W exceeds pool maximum %.1f W",
			req.PowerWatts, p.PowerWatts)
	}

	// 4. Check location match
	// For now, simple check: if pool is USP or USA, and location is in CONUS, it matches
	// TODO: Implement more sophisticated location matching
	locationMatch, locationReason := checkLocationMatch(p.CoverageArea, req.Location)
	result.MatchDetails.LocationMatch = locationMatch
	result.MatchDetails.LocationReason = locationReason

	// Overall match: all criteria must match
	result.IsMatch = result.MatchDetails.FrequencyMatch &&
		result.MatchDetails.EmissionMatch &&
		result.MatchDetails.PowerMatch &&
		result.MatchDetails.LocationMatch

	return result
}

// checkLocationMatch determines if a requested location is within pool coverage
// TODO: Implement proper geographic matching logic
func checkLocationMatch(coverage CoverageAreaType, location string) (bool, string) {
	location = strings.TrimSpace(strings.ToUpper(location))

	// Simple implementation: assume any location matches USA/USP coverage
	// In production, this should validate against actual geographic data

	switch coverage {
	case CoverageUSP:
		// USP covers CONUS + US possessions (includes everything)
		return true, fmt.Sprintf("Location '%s' is covered by USP (CONUS + US possessions)", location)
	case CoverageUSA:
		// USA covers CONUS only
		// TODO: Validate that location is actually in CONUS
		return true, fmt.Sprintf("Location '%s' is covered by USA (CONUS)", location)
	default:
		return false, fmt.Sprintf("Unknown coverage area: %s", coverage)
	}
}
