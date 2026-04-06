// handlers/equipment_handler.go
package handlers

import (
	"bytes"
	"encoding/xml"
	"fmt"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// ── SSRF XML structs ──────────────────────────────────────────────────────────
// We strip the default namespace before unmarshalling so we can use bare tags.

type ssrfRoot struct {
	Transmitters []ssrfTransmitter `xml:"Transmitter"`
	Antennas     []ssrfAntenna     `xml:"Antenna"`
}

type ssrfTransmitter struct {
	Nomenclatures []ssrfNomenclature `xml:"Nomenclature"`
	Deployments   []ssrfDeployment   `xml:"Deployment"`
	TxModes       []ssrfTxMode       `xml:"TxMode"`
}

type ssrfNomenclature struct {
	Type         string           `xml:"Type"`
	Name         string           `xml:"Name"`
	Manufacturer *ssrfManufacturer `xml:"Manufacturer"`
}

type ssrfManufacturer struct {
	Name string `xml:"Name"`
}

type ssrfDeployment struct {
	Type         string `xml:"Type"`
	Installation string `xml:"Installation"`
}

type ssrfTxMode struct {
	Description string           `xml:"Description"`
	NecessaryBw string           `xml:"NecessaryBw"`
	OccBw       string           `xml:"OccBw"`
	EmsClass    string           `xml:"EmsClass"`
	Powers      []ssrfPower      `xml:"Power"`
	Tunings     []ssrfTxTuning   `xml:"TxSignalTuning"`
}

type ssrfPower struct {
	PowerMin  string `xml:"PowerMin"`
	PowerMax  string `xml:"PowerMax"`
	PowerType string `xml:"PowerType"`
}

type ssrfTxTuning struct {
	FreqMin string `xml:"FreqMin"`
	FreqMax string `xml:"FreqMax"`
}

type ssrfAntenna struct {
	AntType       string             `xml:"AntType"`
	Remarks       string             `xml:"Remarks"`
	Nomenclatures []ssrfNomenclature `xml:"Nomenclature"`
	AntModes      []ssrfAntMode      `xml:"AntMode"`
}

type ssrfAntMode struct {
	PolarisationType string       `xml:"PolarisationType"`
	HorzScanType     string       `xml:"HorzScanType"`
	HorzBwMin        string       `xml:"HorzBwMin"`
	AntGain          *ssrfAntGain `xml:"AntGain"`
	AntFreqs         *ssrfAntFreqs `xml:"AntFreqs"`
}

type ssrfAntGain struct {
	Gain string `xml:"Gain"`
}

type ssrfAntFreqs struct {
	FreqMin string `xml:"FreqMin"`
	FreqMax string `xml:"FreqMax"`
}

// ── API response types ────────────────────────────────────────────────────────

type EquipmentListItem struct {
	ID   string `json:"id"`   // filename without extension
	Name string `json:"name"` // human-readable display name
}

type EquipmentDetail struct {
	ID           string              `json:"id"`
	Transmitters []TransmitterDetail `json:"transmitters"`
	Antennas     []AntennaDetail     `json:"antennas"`
}

type AntennaDetail struct {
	Name        string   `json:"name"`
	Mfg         string   `json:"mfg,omitempty"`
	AntType     string   `json:"ant_type"`      // raw SSRF value
	Sfaf354     string   `json:"sfaf_354"`      // mapped SFAF 354 code
	GainDbi     *float64 `json:"gain_dbi,omitempty"`
	Polarization string  `json:"polarization"`  // V / H / C / E / M
	Orientation  string  `json:"orientation"`   // ND / SSH / SSV / ""
	FreqMin     *float64 `json:"freq_min,omitempty"`
	FreqMax     *float64 `json:"freq_max,omitempty"`
}

type TransmitterDetail struct {
	Name   string       `json:"name"`
	Mfg    string       `json:"mfg,omitempty"`
	Deploy string       `json:"deploy,omitempty"`
	Modes  []ModeDetail `json:"modes"`
}

type ModeDetail struct {
	Description  string       `json:"description,omitempty"`
	EmsClass     string       `json:"ems_class"`
	BwMhz        float64      `json:"bw_mhz,omitempty"`
	EmDesignator string       `json:"em_designator,omitempty"`
	PowerW       *float64     `json:"power_w,omitempty"`
	FreqRanges   []FreqRangeD `json:"freq_ranges"`
}

type FreqRangeD struct {
	Min float64 `json:"min"`
	Max float64 `json:"max"`
}

// ── Handler ───────────────────────────────────────────────────────────────────

type EquipmentHandler struct {
	xmlDir string
}

func NewEquipmentHandler(xmlDir string) *EquipmentHandler {
	return &EquipmentHandler{xmlDir: xmlDir}
}

// ListEquipment returns all SSRF XML files found in the xml directory.
// GET /api/equipment
func (h *EquipmentHandler) ListEquipment(c *gin.Context) {
	entries, err := os.ReadDir(h.xmlDir)
	if err != nil {
		if os.IsNotExist(err) {
			c.JSON(http.StatusOK, gin.H{"equipment": []EquipmentListItem{}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot read equipment directory"})
		return
	}

	items := []EquipmentListItem{}
	for _, e := range entries {
		if e.IsDir() || !strings.EqualFold(filepath.Ext(e.Name()), ".xml") {
			continue
		}
		id := strings.TrimSuffix(e.Name(), filepath.Ext(e.Name()))
		// Try to get a friendly name from the first transmitter in the file
		name := friendlyName(id)
		if fullName, err := primaryName(filepath.Join(h.xmlDir, e.Name())); err == nil && fullName != "" {
			name = fullName
		}
		items = append(items, EquipmentListItem{ID: id, Name: name})
	}

	c.JSON(http.StatusOK, gin.H{"equipment": items})
}

// GetEquipment parses an SSRF XML file and returns transmitters with modes.
// GET /api/equipment/:id
func (h *EquipmentHandler) GetEquipment(c *gin.Context) {
	id := c.Param("id")
	// Sanitize — only allow simple filenames, no path traversal
	if strings.Contains(id, "/") || strings.Contains(id, "\\") || strings.Contains(id, "..") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	path := filepath.Join(h.xmlDir, id+".xml")
	raw, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "equipment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot read file"})
		return
	}

	txs, ants, err := parseSSRF(raw)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse SSRF XML: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, EquipmentDetail{ID: id, Transmitters: txs, Antennas: ants})
}

// ── Parsing helpers ───────────────────────────────────────────────────────────

// primaryName opens an XML file and returns the first Nomenclature/Name found.
func primaryName(path string) (string, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	txs, _, err := parseSSRF(raw)
	if err != nil || len(txs) == 0 {
		return "", err
	}
	return txs[0].Name, nil
}

// parseSSRF strips the SSRF namespace declaration and unmarshals transmitters and antennas.
func parseSSRF(raw []byte) ([]TransmitterDetail, []AntennaDetail, error) {
	// Strip default namespace so bare element names work in encoding/xml
	clean := bytes.ReplaceAll(raw, []byte(` xmlns="urn:us:gov:dod:standard:ssrf:3.0.1"`), nil)
	clean = bytes.ReplaceAll(clean, []byte(` xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`), nil)
	// Remove xsi:nil="true" attributes to avoid unmarshal noise
	clean = bytes.ReplaceAll(clean, []byte(` xsi:nil="true"`), nil)

	var root ssrfRoot
	if err := xml.Unmarshal(clean, &root); err != nil {
		return nil, nil, err
	}

	antennas := parseAntennas(root.Antennas)

	var result []TransmitterDetail
	for _, tx := range root.Transmitters {
		name, mfg, deploy := txMeta(tx)
		modes := parseModes(tx.TxModes)
		if len(modes) == 0 {
			continue
		}
		result = append(result, TransmitterDetail{
			Name:   name,
			Mfg:    mfg,
			Deploy: deploy,
			Modes:  modes,
		})
	}
	return result, antennas, nil
}

func txMeta(tx ssrfTransmitter) (name, mfg, deploy string) {
	for _, n := range tx.Nomenclatures {
		if n.Name != "" {
			name = n.Name
			if n.Manufacturer != nil {
				mfg = strings.TrimSpace(n.Manufacturer.Name)
			}
			break
		}
	}
	for _, d := range tx.Deployments {
		if d.Type != "" {
			deploy = d.Type
			break
		}
		if d.Installation != "" {
			deploy = d.Installation
			break
		}
	}
	return
}

func parseModes(modes []ssrfTxMode) []ModeDetail {
	var result []ModeDetail
	for _, m := range modes {
		emsClass := strings.TrimSpace(m.EmsClass)
		if emsClass == "" {
			continue
		}

		bwMhz, _ := strconv.ParseFloat(strings.TrimSpace(m.NecessaryBw), 64)
		var emDes string
		if bwMhz > 0 {
			emDes = mhzToITUBw(bwMhz) + emsClass
		}

		// Power: prefer Mean type, fall back to first non-zero PowerMax
		var powerW *float64
		for _, p := range m.Powers {
			v, err := strconv.ParseFloat(strings.TrimSpace(p.PowerMax), 64)
			if err != nil || v == 0 {
				continue
			}
			if p.PowerType == "Mean" || powerW == nil {
				vv := v
				powerW = &vv
			}
			if p.PowerType == "Mean" {
				break
			}
		}

		// Frequency tuning ranges
		var ranges []FreqRangeD
		for _, t := range m.Tunings {
			fMin, e1 := strconv.ParseFloat(strings.TrimSpace(t.FreqMin), 64)
			fMax, e2 := strconv.ParseFloat(strings.TrimSpace(t.FreqMax), 64)
			if e1 == nil && e2 == nil && fMin > 0 && fMax > 0 {
				ranges = append(ranges, FreqRangeD{Min: fMin, Max: fMax})
			}
		}

		result = append(result, ModeDetail{
			Description:  strings.TrimSpace(m.Description),
			EmsClass:     emsClass,
			BwMhz:        bwMhz,
			EmDesignator: emDes,
			PowerW:       powerW,
			FreqRanges:   ranges,
		})
	}
	// Deduplicate by emission designator (keep first occurrence)
	seen := map[string]bool{}
	deduped := result[:0]
	for _, m := range result {
		key := m.EmDesignator + "|" + m.EmsClass
		if !seen[key] {
			seen[key] = true
			deduped = append(deduped, m)
		}
	}
	return deduped
}

// mhzToITUBw converts a bandwidth in MHz to the ITU 4-character emission
// designator bandwidth code (e.g., 0.016 → "16K0", 2.5 → "2M50").
func mhzToITUBw(mhz float64) string {
	hz := mhz * 1e6
	var v float64
	var unit string
	switch {
	case hz >= 1e9:
		v, unit = hz/1e9, "G"
	case hz >= 1e6:
		v, unit = hz/1e6, "M"
	case hz >= 1e3:
		v, unit = hz/1e3, "K"
	default:
		v, unit = hz, "H"
	}
	// Round to 3 significant figures
	r, _ := strconv.ParseFloat(fmt.Sprintf("%.3g", v), 64)
	switch {
	case r >= 100:
		return fmt.Sprintf("%d%s", int(math.Round(r)), unit)
	case r >= 10:
		i := int(math.Floor(r))
		d := int(math.Round((r - float64(i)) * 10))
		return fmt.Sprintf("%d%s%d", i, unit, d)
	default:
		i := int(math.Floor(r))
		d := int(math.Round((r-float64(i))*100))
		return fmt.Sprintf("%d%s%02d", i, unit, d)
	}
}

// reGainDbi matches numeric dBi values in free-text Remarks, e.g. "-15 dBi", "16 dBi".
var reGainDbi = regexp.MustCompile(`(-?\d+(?:\.\d+)?)\s*dBi`)

// gainFromRemarks extracts all dBi values from a remarks string and returns
// their average, or nil if none are found.
func gainFromRemarks(remarks string) *float64 {
	matches := reGainDbi.FindAllStringSubmatch(remarks, -1)
	if len(matches) == 0 {
		return nil
	}
	sum := 0.0
	for _, m := range matches {
		v, err := strconv.ParseFloat(m[1], 64)
		if err != nil {
			continue
		}
		sum += v
	}
	avg := math.Round((sum/float64(len(matches)))*10) / 10
	return &avg
}

// parseAntennas converts raw SSRF Antenna elements into AntennaDetail records.
func parseAntennas(ants []ssrfAntenna) []AntennaDetail {
	var result []AntennaDetail
	for _, a := range ants {
		antType := strings.TrimSpace(a.AntType)
		if antType == "" {
			continue
		}
		name, mfg := antNomMeta(a.Nomenclatures)

		for _, m := range a.AntModes {
			pol   := mapPolarization(strings.TrimSpace(m.PolarisationType))
			orient := mapOrientation(strings.TrimSpace(m.HorzScanType), strings.TrimSpace(m.HorzBwMin))

			var gainDbi *float64
			if m.AntGain != nil {
				if g, err := strconv.ParseFloat(strings.TrimSpace(m.AntGain.Gain), 64); err == nil {
					gainDbi = &g
				}
			}
			// Fallback: parse gain from free-text Remarks if not in structured field
			if gainDbi == nil {
				gainDbi = gainFromRemarks(strings.TrimSpace(a.Remarks))
			}

			var freqMin, freqMax *float64
			if m.AntFreqs != nil {
				if v, err := strconv.ParseFloat(strings.TrimSpace(m.AntFreqs.FreqMin), 64); err == nil && v > 0 {
					freqMin = &v
				}
				if v, err := strconv.ParseFloat(strings.TrimSpace(m.AntFreqs.FreqMax), 64); err == nil && v > 0 {
					freqMax = &v
				}
			}

			result = append(result, AntennaDetail{
				Name:         name,
				Mfg:          mfg,
				AntType:      antType,
				Sfaf354:      mapAntType(antType),
				GainDbi:      gainDbi,
				Polarization: pol,
				Orientation:  orient,
				FreqMin:      freqMin,
				FreqMax:      freqMax,
			})
			// Each antenna typically has one AntMode; break after first useful one
			break
		}
	}

	// Deduplicate by (name + sfaf354) to avoid listing the same antenna multiple times
	seen := map[string]bool{}
	deduped := result[:0]
	for _, a := range result {
		key := a.Name + "|" + a.Sfaf354
		if !seen[key] {
			seen[key] = true
			deduped = append(deduped, a)
		}
	}
	return deduped
}

func antNomMeta(noms []ssrfNomenclature) (name, mfg string) {
	for _, n := range noms {
		if n.Name != "" {
			name = strings.TrimSpace(n.Name)
			if n.Manufacturer != nil {
				mfg = strings.TrimSpace(n.Manufacturer.Name)
			}
			return
		}
	}
	return
}

// mapPolarization maps SSRF PolarisationType → SFAF field 363 code.
func mapPolarization(p string) string {
	lower := strings.ToLower(p)
	switch {
	case strings.Contains(lower, "vertical"):
		return "V"
	case strings.Contains(lower, "horizontal"):
		return "H"
	case strings.Contains(lower, "circular"), strings.Contains(lower, "right-hand"), strings.Contains(lower, "left-hand"):
		return "C"
	case strings.Contains(lower, "elliptical"):
		return "E"
	case strings.Contains(lower, "mixed"), strings.Contains(lower, "slant"):
		return "M"
	case strings.Contains(lower, "linear"):
		return "V" // unqualified "linear" defaults to vertical for tactical radios
	}
	return ""
}

// mapOrientation maps SSRF HorzScanType + HorzBwMin → SFAF field 362 code.
func mapOrientation(scanType, horzBw string) string {
	bw, _ := strconv.ParseFloat(horzBw, 64)
	lower := strings.ToLower(scanType)
	if bw >= 360 {
		return "ND"
	}
	switch {
	case strings.Contains(lower, "sector"), strings.Contains(lower, "continuous"):
		return "SSH"
	case strings.Contains(lower, "nodding"), strings.Contains(lower, "vertical"):
		return "SSV"
	}
	return "" // fixed directional — azimuth unknown, leave blank
}

// mapAntType maps an SSRF AntType string → the nearest SFAF 354 option value.
func mapAntType(t string) string {
	lower := strings.ToLower(t)
	switch {
	case strings.Contains(lower, "monopole"):
		return "MONOPOLE"
	case strings.Contains(lower, "dipole"):
		return "DIPOLE"
	case strings.Contains(lower, "helix"):
		return "HELIX"
	case strings.Contains(lower, "patch"):
		return "PATCH"
	case strings.Contains(lower, "whip"):
		return "WHIP"
	case strings.Contains(lower, "blade"):
		return "BLADE"
	case strings.Contains(lower, "yagi"):
		return "YAGI"
	case strings.Contains(lower, "horn"):
		return "HORN"
	case strings.Contains(lower, "loop"):
		return "LOOP"
	case strings.Contains(lower, "parabolic"), strings.Contains(lower, "dish"):
		return "PARABOLIC"
	case strings.Contains(lower, "panel"):
		return "PANEL"
	case strings.Contains(lower, "corner"):
		return "CORNER"
	case strings.Contains(lower, "log periodic"), strings.Contains(lower, "log per"):
		return "LOG PER"
	case strings.Contains(lower, "discone"):
		return "DISCONE"
	case strings.Contains(lower, "rhombic"):
		return "RHOMBIC"
	case strings.Contains(lower, "sleeve"):
		return "SLEEVE"
	case strings.Contains(lower, "biconical"):
		return "BICONICAL"
	case strings.Contains(lower, "collinear"), strings.Contains(lower, "omni"):
		return "OMNI"
	}
	return "OTHER"
}

// friendlyName turns a filename stem into a display name.
// e.g., "prc-209" → "AN/PRC-209", "harris-falcon-iii" → "Harris Falcon III"
func friendlyName(stem string) string {
	upper := strings.ToUpper(stem)
	// Looks like a MIL designator (e.g., prc-152, anprc-117)
	if strings.HasPrefix(upper, "PRC-") || strings.HasPrefix(upper, "PRC") ||
		strings.HasPrefix(upper, "ANPRC") || strings.HasPrefix(upper, "AN-PRC") {
		return "AN/" + upper
	}
	// General case: Title-case with hyphens as spaces
	parts := strings.Split(stem, "-")
	for i, p := range parts {
		if len(p) > 0 {
			parts[i] = strings.ToUpper(p[:1]) + strings.ToLower(p[1:])
		}
	}
	return strings.Join(parts, " ")
}
