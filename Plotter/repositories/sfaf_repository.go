// sfaf_repository.go
package repositories

import (
	"database/sql"
	"fmt"
	"log"
	"sfaf-plotter/models"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type SFAFRepository struct {
	db *sqlx.DB
}

func NewSFAFRepository(db *sqlx.DB) *SFAFRepository {
	return &SFAFRepository{db: db}
}

func (r *SFAFRepository) Create(sfaf *models.SFAF) error {
	sfaf.ID = uuid.New()
	now := time.Now()
	sfaf.CreatedAt = now
	sfaf.UpdatedAt = now

	// Build the complete INSERT query with all fields
	query := `
        INSERT INTO sfafs (
            id, marker_id, created_at, updated_at,
            field005, field006, field007, field010, field013, field014, field015, field016, field017, field018, field019, field020,
            field102, field103, field105, field106, field107, field108,
            field110, field111, field112, field113, field114, field115, field116, field117, field118,
            field130, field131, field140, field141, field142, field143, field144, field145, field146, field147, field151, field152,
            field200, field201, field202, field203, field204, field205, field206, field207, field208, field209,
            field300, field301, field302, field303, field304, field306,
            field315, field316, field317, field318, field319, field321,
            field340, field341, field342, field343, field344, field345, field346, field347, field348, field349,
            field354, field355, field356, field357, field358, field359, field360, field361, field362, field363, field364, field365, field373, field374,
            field400, field401, field403, field406, field407, field408,
            field415, field416, field417, field418, field419,
            field440, field442, field443,
            field453, field454, field455, field456, field457, field458, field459, field460, field461, field462, field463, field470, field471, field472, field473,
            field500, field501, field502, field503, field504, field506, field511, field512, field513, field520, field521, field530, field531,
            field701, field702, field704, field707, field710, field711, field716,
            field801, field803, field804, field805, field806,
            field901, field903, field904, field905, field906, field907, field910, field911, field924, field926, field927, field928,
            field952, field953, field956, field957, field958, field959, field963, field964, field965,
            field982, field983, field984, field985, field986, field987, field988, field989, field990, field991, field992, field993, field994, field995, field996, field997, field998, field999
        ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21, $22,
            $23, $24, $25, $26, $27, $28, $29, $30, $31,
            $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43,
            $44, $45, $46, $47, $48, $49, $50, $51, $52, $53,
            $54, $55, $56, $57, $58, $59,
            $60, $61, $62, $63, $64, $65,
            $66, $67, $68, $69, $70, $71, $72, $73, $74, $75,
            $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89,
            $90, $91, $92, $93, $94, $95,
            $96, $97, $98, $99, $100,
            $101, $102, $103,
            $104, $105, $106, $107, $108, $109, $110, $111, $112, $113, $114, $115, $116, $117, $118,
            $119, $120, $121, $122, $123, $124, $125, $126, $127, $128, $129, $130, $131,
            $132, $133, $134, $135, $136, $137, $138,
            $139, $140, $141, $142, $143,
            $144, $145, $146, $147, $148, $149, $150, $151, $152, $153, $154, $155,
            $156, $157, $158, $159, $160, $161, $162, $163, $164,
            $165, $166, $167, $168, $169, $170, $171, $172, $173, $174, $175, $176, $177, $178, $179, $180, $181, $182
        )`

	_, err := r.db.Exec(query,
		sfaf.ID, sfaf.MarkerID, sfaf.CreatedAt, sfaf.UpdatedAt,
		// 000 Series - Basic Information
		sfaf.Field005, sfaf.Field006, sfaf.Field007, sfaf.Field010, sfaf.Field013, sfaf.Field014, sfaf.Field015, sfaf.Field016, sfaf.Field017, sfaf.Field018, sfaf.Field019, sfaf.Field020,
		// 100 Series - Agency Information
		sfaf.Field102, sfaf.Field103, sfaf.Field105, sfaf.Field106, sfaf.Field107, sfaf.Field108,
		sfaf.Field110, sfaf.Field111, sfaf.Field112, sfaf.Field113, sfaf.Field114, sfaf.Field115, sfaf.Field116, sfaf.Field117, sfaf.Field118,
		// 100 Series Continued + Date Fields
		sfaf.Field130, sfaf.Field131, sfaf.Field140, sfaf.Field141, sfaf.Field142, sfaf.Field143, sfaf.Field144, sfaf.Field145, sfaf.Field146, sfaf.Field147, sfaf.Field151, sfaf.Field152,
		// 200 Series - System Information
		sfaf.Field200, sfaf.Field201, sfaf.Field202, sfaf.Field203, sfaf.Field204, sfaf.Field205, sfaf.Field206, sfaf.Field207, sfaf.Field208, sfaf.Field209,
		// 300 Series - Location Information
		sfaf.Field300, sfaf.Field301, sfaf.Field302, sfaf.Field303, sfaf.Field304, sfaf.Field306,
		// Technical Parameters (NUMERIC and INTEGER types)
		sfaf.Field315, sfaf.Field316, sfaf.Field317, sfaf.Field318, sfaf.Field319, sfaf.Field321,
		// Equipment Information
		sfaf.Field340, sfaf.Field341, sfaf.Field342, sfaf.Field343, sfaf.Field344, sfaf.Field345, sfaf.Field346, sfaf.Field347, sfaf.Field348, sfaf.Field349,
		// Advanced Technical Parameters
		sfaf.Field354, sfaf.Field355, sfaf.Field356, sfaf.Field357, sfaf.Field358, sfaf.Field359, sfaf.Field360, sfaf.Field361, sfaf.Field362, sfaf.Field363, sfaf.Field364, sfaf.Field365, sfaf.Field373, sfaf.Field374,
		// 400 Series - Radio/Frequency Parameters
		sfaf.Field400, sfaf.Field401, sfaf.Field403, sfaf.Field406, sfaf.Field407, sfaf.Field408,
		sfaf.Field415, sfaf.Field416, sfaf.Field417, sfaf.Field418, sfaf.Field419,
		// System Configuration
		sfaf.Field440, sfaf.Field442, sfaf.Field443,
		// Extended Equipment
		sfaf.Field453, sfaf.Field454, sfaf.Field455, sfaf.Field456, sfaf.Field457, sfaf.Field458, sfaf.Field459, sfaf.Field460, sfaf.Field461, sfaf.Field462, sfaf.Field463, sfaf.Field470, sfaf.Field471, sfaf.Field472, sfaf.Field473,
		// 500 Series - IRAC Notes and Equipment
		sfaf.Field500, sfaf.Field501, sfaf.Field502, sfaf.Field503, sfaf.Field504, sfaf.Field506, sfaf.Field511, sfaf.Field512, sfaf.Field513, sfaf.Field520, sfaf.Field521, sfaf.Field530, sfaf.Field531,
		// 700 Series - Coordination Information
		sfaf.Field701, sfaf.Field702, sfaf.Field704, sfaf.Field707, sfaf.Field710, sfaf.Field711, sfaf.Field716,
		// 800 Series - Administrative Information
		sfaf.Field801, sfaf.Field803, sfaf.Field804, sfaf.Field805, sfaf.Field806,
		// 900 Series - Comments and Processing
		sfaf.Field901, sfaf.Field903, sfaf.Field904, sfaf.Field905, sfaf.Field906, sfaf.Field907, sfaf.Field910, sfaf.Field911, sfaf.Field924, sfaf.Field926, sfaf.Field927, sfaf.Field928,
		// 950+ Series - Final Processing
		sfaf.Field952, sfaf.Field953, sfaf.Field956, sfaf.Field957, sfaf.Field958, sfaf.Field959, sfaf.Field963, sfaf.Field964, sfaf.Field965,
		// 980+ Series - System and Archive Information
		sfaf.Field982, sfaf.Field983, sfaf.Field984, sfaf.Field985, sfaf.Field986, sfaf.Field987, sfaf.Field988, sfaf.Field989, sfaf.Field990, sfaf.Field991, sfaf.Field992, sfaf.Field993, sfaf.Field994, sfaf.Field995, sfaf.Field996, sfaf.Field997, sfaf.Field998, sfaf.Field999,
	)

	return err
}

func (r *SFAFRepository) GetByID(id string) (*models.SFAF, error) {
	sfafID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid UUID: %v", err)
	}

	var sfaf models.SFAF

	// ✅ CORRECT: Use individual field columns from sfafs table (Source: table_info.txt)
	query := `
        SELECT id, marker_id, created_at, updated_at,
               COALESCE(field005, ''), COALESCE(field006, ''), COALESCE(field007, ''), COALESCE(field010, ''), COALESCE(field013, ''), COALESCE(field014, ''), COALESCE(field015, ''), COALESCE(field016, ''), COALESCE(field017, ''), COALESCE(field018, ''), COALESCE(field019, ''), COALESCE(field020, ''),
               COALESCE(field102, ''), COALESCE(field103, ''), COALESCE(field105, ''), COALESCE(field106, ''), COALESCE(field107, ''), COALESCE(field108, ''), COALESCE(field110, ''), COALESCE(field111, ''), COALESCE(field112, ''), COALESCE(field113, ''), COALESCE(field114, ''), COALESCE(field115, ''), COALESCE(field116, ''), COALESCE(field117, ''), COALESCE(field118, ''),
               COALESCE(field130, ''), COALESCE(field131, ''), field140, field141, field142, field143, COALESCE(field144, ''), COALESCE(field145, ''), COALESCE(field146, ''), COALESCE(field147, ''), COALESCE(field151, ''), COALESCE(field152, ''),
               COALESCE(field200, ''), COALESCE(field201, ''), COALESCE(field202, ''), COALESCE(field203, ''), COALESCE(field204, ''), COALESCE(field205, ''), COALESCE(field206, ''), COALESCE(field207, ''), COALESCE(field208, ''), COALESCE(field209, ''),
               COALESCE(field300, ''), COALESCE(field301, ''), COALESCE(field302, ''), COALESCE(field303, ''), COALESCE(field304, ''), COALESCE(field306, ''),
               field315, field316, field317, COALESCE(field318, ''), field319, field321,
               COALESCE(field340, ''), COALESCE(field341, ''), COALESCE(field342, ''), COALESCE(field343, ''), COALESCE(field344, ''), COALESCE(field345, ''), COALESCE(field346, ''), COALESCE(field347, ''), COALESCE(field348, ''), COALESCE(field349, ''),
               COALESCE(field354, ''), COALESCE(field355, ''), field356, field357, field358, field359, field360, field361, COALESCE(field362, ''), COALESCE(field363, ''), field364, field365, COALESCE(field373, ''), COALESCE(field374, ''),
               COALESCE(field400, ''), COALESCE(field401, ''), COALESCE(field403, ''), COALESCE(field406, ''), COALESCE(field407, ''), COALESCE(field408, ''), field415, field416, field417, COALESCE(field418, ''), field419,
               COALESCE(field440, ''), COALESCE(field442, ''), COALESCE(field443, ''),
               COALESCE(field453, ''), COALESCE(field454, ''), COALESCE(field455, ''), field456, field457, field458, field459, field460, field461, COALESCE(field462, ''), COALESCE(field463, ''), field470, field471, field472, COALESCE(field473, ''),
               COALESCE(field500, ''), COALESCE(field501, ''), COALESCE(field502, ''), COALESCE(field503, ''), COALESCE(field504, ''), COALESCE(field506, ''), COALESCE(field511, ''), COALESCE(field512, ''), COALESCE(field513, ''), COALESCE(field520, ''), COALESCE(field521, ''), COALESCE(field530, ''), COALESCE(field531, ''),
               COALESCE(field701, ''), COALESCE(field702, ''), COALESCE(field704, ''), COALESCE(field707, ''), COALESCE(field710, ''), COALESCE(field711, ''), COALESCE(field716, ''),
               COALESCE(field801, ''), COALESCE(field803, ''), COALESCE(field804, ''), field805, COALESCE(field806, ''),
               COALESCE(field901, ''), COALESCE(field903, ''), field904, COALESCE(field905, ''), COALESCE(field906, ''), COALESCE(field907, ''), COALESCE(field910, ''), field911, COALESCE(field924, ''), field926, field927, field928,
               COALESCE(field952, ''), COALESCE(field953, ''), COALESCE(field956, ''), field957, COALESCE(field958, ''), COALESCE(field959, ''), COALESCE(field963, ''), field964, field965,
               COALESCE(field982, ''), COALESCE(field983, ''), COALESCE(field984, ''), COALESCE(field985, ''), COALESCE(field986, ''), COALESCE(field987, ''), COALESCE(field988, ''), COALESCE(field989, ''), COALESCE(field990, ''), COALESCE(field991, ''), COALESCE(field992, ''), COALESCE(field993, ''), COALESCE(field994, ''), COALESCE(field995, ''), COALESCE(field996, ''), COALESCE(field997, ''), COALESCE(field998, ''), COALESCE(field999, '')
        FROM sfafs 
        WHERE id = $1`

	// ✅ CORRECT: Scan individual fields directly into struct fields (Source: models.txt)
	err = r.db.QueryRow(query, sfafID).Scan(
		&sfaf.ID, &sfaf.MarkerID, &sfaf.CreatedAt, &sfaf.UpdatedAt,
		&sfaf.Field005, &sfaf.Field006, &sfaf.Field007, &sfaf.Field010, &sfaf.Field013, &sfaf.Field014, &sfaf.Field015, &sfaf.Field016, &sfaf.Field017, &sfaf.Field018, &sfaf.Field019, &sfaf.Field020,
		&sfaf.Field102, &sfaf.Field103, &sfaf.Field105, &sfaf.Field106, &sfaf.Field107, &sfaf.Field108, &sfaf.Field110, &sfaf.Field111, &sfaf.Field112, &sfaf.Field113, &sfaf.Field114, &sfaf.Field115, &sfaf.Field116, &sfaf.Field117, &sfaf.Field118,
		&sfaf.Field130, &sfaf.Field131, &sfaf.Field140, &sfaf.Field141, &sfaf.Field142, &sfaf.Field143, &sfaf.Field144, &sfaf.Field145, &sfaf.Field146, &sfaf.Field147, &sfaf.Field151, &sfaf.Field152,
		&sfaf.Field200, &sfaf.Field201, &sfaf.Field202, &sfaf.Field203, &sfaf.Field204, &sfaf.Field205, &sfaf.Field206, &sfaf.Field207, &sfaf.Field208, &sfaf.Field209,
		&sfaf.Field300, &sfaf.Field301, &sfaf.Field302, &sfaf.Field303, &sfaf.Field304, &sfaf.Field306,
		&sfaf.Field315, &sfaf.Field316, &sfaf.Field317, &sfaf.Field318, &sfaf.Field319, &sfaf.Field321,
		&sfaf.Field340, &sfaf.Field341, &sfaf.Field342, &sfaf.Field343, &sfaf.Field344, &sfaf.Field345, &sfaf.Field346, &sfaf.Field347, &sfaf.Field348, &sfaf.Field349,
		&sfaf.Field354, &sfaf.Field355, &sfaf.Field356, &sfaf.Field357, &sfaf.Field358, &sfaf.Field359, &sfaf.Field360, &sfaf.Field361, &sfaf.Field362, &sfaf.Field363, &sfaf.Field364, &sfaf.Field365, &sfaf.Field373, &sfaf.Field374,
		&sfaf.Field400, &sfaf.Field401, &sfaf.Field403, &sfaf.Field406, &sfaf.Field407, &sfaf.Field408, &sfaf.Field415, &sfaf.Field416, &sfaf.Field417, &sfaf.Field418, &sfaf.Field419,
		&sfaf.Field440, &sfaf.Field442, &sfaf.Field443,
		&sfaf.Field453, &sfaf.Field454, &sfaf.Field455, &sfaf.Field456, &sfaf.Field457, &sfaf.Field458, &sfaf.Field459, &sfaf.Field460, &sfaf.Field461, &sfaf.Field462, &sfaf.Field463, &sfaf.Field470, &sfaf.Field471, &sfaf.Field472, &sfaf.Field473,
		&sfaf.Field500, &sfaf.Field501, &sfaf.Field502, &sfaf.Field503, &sfaf.Field504, &sfaf.Field506, &sfaf.Field511, &sfaf.Field512, &sfaf.Field513, &sfaf.Field520, &sfaf.Field521, &sfaf.Field530, &sfaf.Field531,
		&sfaf.Field701, &sfaf.Field702, &sfaf.Field704, &sfaf.Field707, &sfaf.Field710, &sfaf.Field711, &sfaf.Field716,
		&sfaf.Field801, &sfaf.Field803, &sfaf.Field804, &sfaf.Field805, &sfaf.Field806,
		&sfaf.Field901, &sfaf.Field903, &sfaf.Field904, &sfaf.Field905, &sfaf.Field906, &sfaf.Field907, &sfaf.Field910, &sfaf.Field911, &sfaf.Field924, &sfaf.Field926, &sfaf.Field927, &sfaf.Field928,
		&sfaf.Field952, &sfaf.Field953, &sfaf.Field956, &sfaf.Field957, &sfaf.Field958, &sfaf.Field959, &sfaf.Field963, &sfaf.Field964, &sfaf.Field965,
		&sfaf.Field982, &sfaf.Field983, &sfaf.Field984, &sfaf.Field985, &sfaf.Field986, &sfaf.Field987, &sfaf.Field988, &sfaf.Field989, &sfaf.Field990, &sfaf.Field991, &sfaf.Field992, &sfaf.Field993, &sfaf.Field994, &sfaf.Field995, &sfaf.Field996, &sfaf.Field997, &sfaf.Field998, &sfaf.Field999)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get SFAF: %w", err)
	}

	return &sfaf, nil
}

func (r *SFAFRepository) GetByMarkerID(markerID string) (*models.SFAF, error) {
	markerUUID, err := uuid.Parse(markerID)
	if err != nil {
		return nil, fmt.Errorf("invalid marker ID: %v", err)
	}

	var sfaf models.SFAF

	// ✅ CORRECT: Use individual field columns from sfafs table (Source: table_info.txt)
	query := `
        SELECT id, marker_id, created_at, updated_at,
               COALESCE(field005, ''), COALESCE(field006, ''), COALESCE(field007, ''), COALESCE(field010, ''), COALESCE(field013, ''), COALESCE(field014, ''), COALESCE(field015, ''), COALESCE(field016, ''), COALESCE(field017, ''), COALESCE(field018, ''), COALESCE(field019, ''), COALESCE(field020, ''),
               COALESCE(field102, ''), COALESCE(field103, ''), COALESCE(field105, ''), COALESCE(field106, ''), COALESCE(field107, ''), COALESCE(field108, ''), COALESCE(field110, ''), COALESCE(field111, ''), COALESCE(field112, ''), COALESCE(field113, ''), COALESCE(field114, ''), COALESCE(field115, ''), COALESCE(field116, ''), COALESCE(field117, ''), COALESCE(field118, ''),
               COALESCE(field130, ''), COALESCE(field131, ''), field140, field141, field142, field143, COALESCE(field144, ''), COALESCE(field145, ''), COALESCE(field146, ''), COALESCE(field147, ''), COALESCE(field151, ''), COALESCE(field152, ''),
               COALESCE(field200, ''), COALESCE(field201, ''), COALESCE(field202, ''), COALESCE(field203, ''), COALESCE(field204, ''), COALESCE(field205, ''), COALESCE(field206, ''), COALESCE(field207, ''), COALESCE(field208, ''), COALESCE(field209, ''),
               COALESCE(field300, ''), COALESCE(field301, ''), COALESCE(field302, ''), COALESCE(field303, ''), COALESCE(field304, ''), COALESCE(field306, ''),
               field315, field316, field317, COALESCE(field318, ''), field319, field321,
               COALESCE(field340, ''), COALESCE(field341, ''), COALESCE(field342, ''), COALESCE(field343, ''), COALESCE(field344, ''), COALESCE(field345, ''), COALESCE(field346, ''), COALESCE(field347, ''), COALESCE(field348, ''), COALESCE(field349, ''),
               COALESCE(field354, ''), COALESCE(field355, ''), field356, field357, field358, field359, field360, field361, COALESCE(field362, ''), COALESCE(field363, ''), field364, field365, COALESCE(field373, ''), COALESCE(field374, ''),
               COALESCE(field400, ''), COALESCE(field401, ''), COALESCE(field403, ''), COALESCE(field406, ''), COALESCE(field407, ''), COALESCE(field408, ''), field415, field416, field417, COALESCE(field418, ''), field419,
               COALESCE(field440, ''), COALESCE(field442, ''), COALESCE(field443, ''),
               COALESCE(field453, ''), COALESCE(field454, ''), COALESCE(field455, ''), field456, field457, field458, field459, field460, field461, COALESCE(field462, ''), COALESCE(field463, ''), field470, field471, field472, COALESCE(field473, ''),
               COALESCE(field500, ''), COALESCE(field501, ''), COALESCE(field502, ''), COALESCE(field503, ''), COALESCE(field504, ''), COALESCE(field506, ''), COALESCE(field511, ''), COALESCE(field512, ''), COALESCE(field513, ''), COALESCE(field520, ''), COALESCE(field521, ''), COALESCE(field530, ''), COALESCE(field531, ''),
               COALESCE(field701, ''), COALESCE(field702, ''), COALESCE(field704, ''), COALESCE(field707, ''), COALESCE(field710, ''), COALESCE(field711, ''), COALESCE(field716, ''),
               COALESCE(field801, ''), COALESCE(field803, ''), COALESCE(field804, ''), field805, COALESCE(field806, ''),
               COALESCE(field901, ''), COALESCE(field903, ''), field904, COALESCE(field905, ''), COALESCE(field906, ''), COALESCE(field907, ''), COALESCE(field910, ''), field911, COALESCE(field924, ''), field926, field927, field928,
               COALESCE(field952, ''), COALESCE(field953, ''), COALESCE(field956, ''), field957, COALESCE(field958, ''), COALESCE(field959, ''), COALESCE(field963, ''), field964, field965,
               COALESCE(field982, ''), COALESCE(field983, ''), COALESCE(field984, ''), COALESCE(field985, ''), COALESCE(field986, ''), COALESCE(field987, ''), COALESCE(field988, ''), COALESCE(field989, ''), COALESCE(field990, ''), COALESCE(field991, ''), COALESCE(field992, ''), COALESCE(field993, ''), COALESCE(field994, ''), COALESCE(field995, ''), COALESCE(field996, ''), COALESCE(field997, ''), COALESCE(field998, ''), COALESCE(field999, '')
        FROM sfafs 
        WHERE marker_id = $1`

	// ✅ CORRECT: Scan individual fields directly into struct fields (Source: models.txt)
	err = r.db.QueryRow(query, markerUUID).Scan(
		&sfaf.ID, &sfaf.MarkerID, &sfaf.CreatedAt, &sfaf.UpdatedAt,
		&sfaf.Field005, &sfaf.Field006, &sfaf.Field007, &sfaf.Field010, &sfaf.Field013, &sfaf.Field014, &sfaf.Field015, &sfaf.Field016, &sfaf.Field017, &sfaf.Field018, &sfaf.Field019, &sfaf.Field020,
		&sfaf.Field102, &sfaf.Field103, &sfaf.Field105, &sfaf.Field106, &sfaf.Field107, &sfaf.Field108, &sfaf.Field110, &sfaf.Field111, &sfaf.Field112, &sfaf.Field113, &sfaf.Field114, &sfaf.Field115, &sfaf.Field116, &sfaf.Field117, &sfaf.Field118,
		&sfaf.Field130, &sfaf.Field131, &sfaf.Field140, &sfaf.Field141, &sfaf.Field142, &sfaf.Field143, &sfaf.Field144, &sfaf.Field145, &sfaf.Field146, &sfaf.Field147, &sfaf.Field151, &sfaf.Field152,
		&sfaf.Field200, &sfaf.Field201, &sfaf.Field202, &sfaf.Field203, &sfaf.Field204, &sfaf.Field205, &sfaf.Field206, &sfaf.Field207, &sfaf.Field208, &sfaf.Field209,
		&sfaf.Field300, &sfaf.Field301, &sfaf.Field302, &sfaf.Field303, &sfaf.Field304, &sfaf.Field306,
		&sfaf.Field315, &sfaf.Field316, &sfaf.Field317, &sfaf.Field318, &sfaf.Field319, &sfaf.Field321,
		&sfaf.Field340, &sfaf.Field341, &sfaf.Field342, &sfaf.Field343, &sfaf.Field344, &sfaf.Field345, &sfaf.Field346, &sfaf.Field347, &sfaf.Field348, &sfaf.Field349,
		&sfaf.Field354, &sfaf.Field355, &sfaf.Field356, &sfaf.Field357, &sfaf.Field358, &sfaf.Field359, &sfaf.Field360, &sfaf.Field361, &sfaf.Field362, &sfaf.Field363, &sfaf.Field364, &sfaf.Field365, &sfaf.Field373, &sfaf.Field374,
		&sfaf.Field400, &sfaf.Field401, &sfaf.Field403, &sfaf.Field406, &sfaf.Field407, &sfaf.Field408, &sfaf.Field415, &sfaf.Field416, &sfaf.Field417, &sfaf.Field418, &sfaf.Field419,
		&sfaf.Field440, &sfaf.Field442, &sfaf.Field443,
		&sfaf.Field453, &sfaf.Field454, &sfaf.Field455, &sfaf.Field456, &sfaf.Field457, &sfaf.Field458, &sfaf.Field459, &sfaf.Field460, &sfaf.Field461, &sfaf.Field462, &sfaf.Field463, &sfaf.Field470, &sfaf.Field471, &sfaf.Field472, &sfaf.Field473,
		&sfaf.Field500, &sfaf.Field501, &sfaf.Field502, &sfaf.Field503, &sfaf.Field504, &sfaf.Field506, &sfaf.Field511, &sfaf.Field512, &sfaf.Field513, &sfaf.Field520, &sfaf.Field521, &sfaf.Field530, &sfaf.Field531,
		&sfaf.Field701, &sfaf.Field702, &sfaf.Field704, &sfaf.Field707, &sfaf.Field710, &sfaf.Field711, &sfaf.Field716,
		&sfaf.Field801, &sfaf.Field803, &sfaf.Field804, &sfaf.Field805, &sfaf.Field806,
		&sfaf.Field901, &sfaf.Field903, &sfaf.Field904, &sfaf.Field905, &sfaf.Field906, &sfaf.Field907, &sfaf.Field910, &sfaf.Field911, &sfaf.Field924, &sfaf.Field926, &sfaf.Field927, &sfaf.Field928,
		&sfaf.Field952, &sfaf.Field953, &sfaf.Field956, &sfaf.Field957, &sfaf.Field958, &sfaf.Field959, &sfaf.Field963, &sfaf.Field964, &sfaf.Field965,
		&sfaf.Field982, &sfaf.Field983, &sfaf.Field984, &sfaf.Field985, &sfaf.Field986, &sfaf.Field987, &sfaf.Field988, &sfaf.Field989, &sfaf.Field990, &sfaf.Field991, &sfaf.Field992, &sfaf.Field993, &sfaf.Field994, &sfaf.Field995, &sfaf.Field996, &sfaf.Field997, &sfaf.Field998, &sfaf.Field999)

	if err == sql.ErrNoRows {
		return nil, nil // No SFAF record found for this marker
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get SFAF by marker ID: %w", err)
	}

	return &sfaf, nil
}

func (r *SFAFRepository) GetBySerial(serial string) (*models.SFAF, error) {
	var sfaf models.SFAF

	query := `
        SELECT id, marker_id, created_at, updated_at,
               COALESCE(field005, ''), COALESCE(field006, ''), COALESCE(field007, ''), COALESCE(field010, ''), COALESCE(field013, ''), COALESCE(field014, ''), COALESCE(field015, ''), COALESCE(field016, ''), COALESCE(field017, ''), COALESCE(field018, ''), COALESCE(field019, ''), COALESCE(field020, ''),
               COALESCE(field102, ''), COALESCE(field103, ''), COALESCE(field105, ''), COALESCE(field106, ''), COALESCE(field107, ''), COALESCE(field108, ''), COALESCE(field110, ''), COALESCE(field111, ''), COALESCE(field112, ''), COALESCE(field113, ''), COALESCE(field114, ''), COALESCE(field115, ''), COALESCE(field116, ''), COALESCE(field117, ''), COALESCE(field118, ''),
               COALESCE(field130, ''), COALESCE(field131, ''), field140, field141, field142, field143, COALESCE(field144, ''), COALESCE(field145, ''), COALESCE(field146, ''), COALESCE(field147, ''), COALESCE(field151, ''), COALESCE(field152, ''),
               COALESCE(field200, ''), COALESCE(field201, ''), COALESCE(field202, ''), COALESCE(field203, ''), COALESCE(field204, ''), COALESCE(field205, ''), COALESCE(field206, ''), COALESCE(field207, ''), COALESCE(field208, ''), COALESCE(field209, ''),
               COALESCE(field300, ''), COALESCE(field301, ''), COALESCE(field302, ''), COALESCE(field303, ''), COALESCE(field304, ''), COALESCE(field306, ''),
               field315, field316, field317, COALESCE(field318, ''), field319, field321,
               COALESCE(field340, ''), COALESCE(field341, ''), COALESCE(field342, ''), COALESCE(field343, ''), COALESCE(field344, ''), COALESCE(field345, ''), COALESCE(field346, ''), COALESCE(field347, ''), COALESCE(field348, ''), COALESCE(field349, ''),
               COALESCE(field354, ''), COALESCE(field355, ''), field356, field357, field358, field359, field360, field361, COALESCE(field362, ''), COALESCE(field363, ''), field364, field365, COALESCE(field373, ''), COALESCE(field374, ''),
               COALESCE(field400, ''), COALESCE(field401, ''), COALESCE(field403, ''), COALESCE(field406, ''), COALESCE(field407, ''), COALESCE(field408, ''), field415, field416, field417, COALESCE(field418, ''), field419,
               COALESCE(field440, ''), COALESCE(field442, ''), COALESCE(field443, ''),
               COALESCE(field453, ''), COALESCE(field454, ''), COALESCE(field455, ''), field456, field457, field458, field459, field460, field461, COALESCE(field462, ''), COALESCE(field463, ''), field470, field471, field472, COALESCE(field473, ''),
               COALESCE(field500, ''), COALESCE(field501, ''), COALESCE(field502, ''), COALESCE(field503, ''), COALESCE(field504, ''), COALESCE(field506, ''), COALESCE(field511, ''), COALESCE(field512, ''), COALESCE(field513, ''), COALESCE(field520, ''), COALESCE(field521, ''), COALESCE(field530, ''), COALESCE(field531, ''),
               COALESCE(field701, ''), COALESCE(field702, ''), COALESCE(field704, ''), COALESCE(field707, ''), COALESCE(field710, ''), COALESCE(field711, ''), COALESCE(field716, ''),
               COALESCE(field801, ''), COALESCE(field803, ''), COALESCE(field804, ''), field805, COALESCE(field806, ''),
               COALESCE(field901, ''), COALESCE(field903, ''), field904, COALESCE(field905, ''), COALESCE(field906, ''), COALESCE(field907, ''), COALESCE(field910, ''), field911, COALESCE(field924, ''), field926, field927, field928,
               COALESCE(field952, ''), COALESCE(field953, ''), COALESCE(field956, ''), field957, COALESCE(field958, ''), COALESCE(field959, ''), COALESCE(field963, ''), field964, field965,
               COALESCE(field982, ''), COALESCE(field983, ''), COALESCE(field984, ''), COALESCE(field985, ''), COALESCE(field986, ''), COALESCE(field987, ''), COALESCE(field988, ''), COALESCE(field989, ''), COALESCE(field990, ''), COALESCE(field991, ''), COALESCE(field992, ''), COALESCE(field993, ''), COALESCE(field994, ''), COALESCE(field995, ''), COALESCE(field996, ''), COALESCE(field997, ''), COALESCE(field998, ''), COALESCE(field999, '')
        FROM sfafs
        WHERE field102 = $1
        LIMIT 1`

	err := r.db.QueryRow(query, serial).Scan(
		&sfaf.ID, &sfaf.MarkerID, &sfaf.CreatedAt, &sfaf.UpdatedAt,
		&sfaf.Field005, &sfaf.Field006, &sfaf.Field007, &sfaf.Field010, &sfaf.Field013, &sfaf.Field014, &sfaf.Field015, &sfaf.Field016, &sfaf.Field017, &sfaf.Field018, &sfaf.Field019, &sfaf.Field020,
		&sfaf.Field102, &sfaf.Field103, &sfaf.Field105, &sfaf.Field106, &sfaf.Field107, &sfaf.Field108, &sfaf.Field110, &sfaf.Field111, &sfaf.Field112, &sfaf.Field113, &sfaf.Field114, &sfaf.Field115, &sfaf.Field116, &sfaf.Field117, &sfaf.Field118,
		&sfaf.Field130, &sfaf.Field131, &sfaf.Field140, &sfaf.Field141, &sfaf.Field142, &sfaf.Field143, &sfaf.Field144, &sfaf.Field145, &sfaf.Field146, &sfaf.Field147, &sfaf.Field151, &sfaf.Field152,
		&sfaf.Field200, &sfaf.Field201, &sfaf.Field202, &sfaf.Field203, &sfaf.Field204, &sfaf.Field205, &sfaf.Field206, &sfaf.Field207, &sfaf.Field208, &sfaf.Field209,
		&sfaf.Field300, &sfaf.Field301, &sfaf.Field302, &sfaf.Field303, &sfaf.Field304, &sfaf.Field306,
		&sfaf.Field315, &sfaf.Field316, &sfaf.Field317, &sfaf.Field318, &sfaf.Field319, &sfaf.Field321,
		&sfaf.Field340, &sfaf.Field341, &sfaf.Field342, &sfaf.Field343, &sfaf.Field344, &sfaf.Field345, &sfaf.Field346, &sfaf.Field347, &sfaf.Field348, &sfaf.Field349,
		&sfaf.Field354, &sfaf.Field355, &sfaf.Field356, &sfaf.Field357, &sfaf.Field358, &sfaf.Field359, &sfaf.Field360, &sfaf.Field361, &sfaf.Field362, &sfaf.Field363, &sfaf.Field364, &sfaf.Field365, &sfaf.Field373, &sfaf.Field374,
		&sfaf.Field400, &sfaf.Field401, &sfaf.Field403, &sfaf.Field406, &sfaf.Field407, &sfaf.Field408, &sfaf.Field415, &sfaf.Field416, &sfaf.Field417, &sfaf.Field418, &sfaf.Field419,
		&sfaf.Field440, &sfaf.Field442, &sfaf.Field443,
		&sfaf.Field453, &sfaf.Field454, &sfaf.Field455, &sfaf.Field456, &sfaf.Field457, &sfaf.Field458, &sfaf.Field459, &sfaf.Field460, &sfaf.Field461, &sfaf.Field462, &sfaf.Field463, &sfaf.Field470, &sfaf.Field471, &sfaf.Field472, &sfaf.Field473,
		&sfaf.Field500, &sfaf.Field501, &sfaf.Field502, &sfaf.Field503, &sfaf.Field504, &sfaf.Field506, &sfaf.Field511, &sfaf.Field512, &sfaf.Field513, &sfaf.Field520, &sfaf.Field521, &sfaf.Field530, &sfaf.Field531,
		&sfaf.Field701, &sfaf.Field702, &sfaf.Field704, &sfaf.Field707, &sfaf.Field710, &sfaf.Field711, &sfaf.Field716,
		&sfaf.Field801, &sfaf.Field803, &sfaf.Field804, &sfaf.Field805, &sfaf.Field806,
		&sfaf.Field901, &sfaf.Field903, &sfaf.Field904, &sfaf.Field905, &sfaf.Field906, &sfaf.Field907, &sfaf.Field910, &sfaf.Field911, &sfaf.Field924, &sfaf.Field926, &sfaf.Field927, &sfaf.Field928,
		&sfaf.Field952, &sfaf.Field953, &sfaf.Field956, &sfaf.Field957, &sfaf.Field958, &sfaf.Field959, &sfaf.Field963, &sfaf.Field964, &sfaf.Field965,
		&sfaf.Field982, &sfaf.Field983, &sfaf.Field984, &sfaf.Field985, &sfaf.Field986, &sfaf.Field987, &sfaf.Field988, &sfaf.Field989, &sfaf.Field990, &sfaf.Field991, &sfaf.Field992, &sfaf.Field993, &sfaf.Field994, &sfaf.Field995, &sfaf.Field996, &sfaf.Field997, &sfaf.Field998, &sfaf.Field999)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get SFAF by serial: %w", err)
	}

	return &sfaf, nil
}

func (r *SFAFRepository) LinkMarker(sfafID uuid.UUID, markerID uuid.UUID) error {
	_, err := r.db.Exec(`UPDATE sfafs SET marker_id = $1 WHERE id = $2`, markerID, sfafID)
	return err
}

func (r *SFAFRepository) Update(sfaf *models.SFAF) error {
	// Update timestamp
	now := time.Now()
	sfaf.UpdatedAt = now

	// ✅ CORRECT: Use individual field columns from sfafs table (Source: table_info.txt)
	query := `
        UPDATE sfafs 
        SET updated_at = $1,
            field005 = $2, field006 = $3, field007 = $4, field010 = $5, field013 = $6, field014 = $7, field015 = $8, field016 = $9, field017 = $10, field018 = $11, field019 = $12, field020 = $13,
            field102 = $14, field103 = $15, field105 = $16, field106 = $17, field107 = $18, field108 = $19, field110 = $20, field111 = $21, field112 = $22, field113 = $23, field114 = $24, field115 = $25, field116 = $26, field117 = $27, field118 = $28,
            field130 = $29, field131 = $30, field140 = $31, field141 = $32, field142 = $33, field143 = $34, field144 = $35, field145 = $36, field146 = $37, field147 = $38, field151 = $39, field152 = $40,
            field200 = $41, field201 = $42, field202 = $43, field203 = $44, field204 = $45, field205 = $46, field206 = $47, field207 = $48, field208 = $49, field209 = $50,
            field300 = $51, field301 = $52, field302 = $53, field303 = $54, field304 = $55, field306 = $56,
            field315 = $57, field316 = $58, field317 = $59, field318 = $60, field319 = $61, field321 = $62,
            field340 = $63, field341 = $64, field342 = $65, field343 = $66, field344 = $67, field345 = $68, field346 = $69, field347 = $70, field348 = $71, field349 = $72,
            field354 = $73, field355 = $74, field356 = $75, field357 = $76, field358 = $77, field359 = $78, field360 = $79, field361 = $80, field362 = $81, field363 = $82, field364 = $83, field365 = $84, field373 = $85, field374 = $86,
            field400 = $87, field401 = $88, field403 = $89, field406 = $90, field407 = $91, field408 = $92, field415 = $93, field416 = $94, field417 = $95, field418 = $96, field419 = $97,
            field440 = $98, field442 = $99, field443 = $100,
            field453 = $101, field454 = $102, field455 = $103, field456 = $104, field457 = $105, field458 = $106, field459 = $107, field460 = $108, field461 = $109, field462 = $110, field463 = $111, field470 = $112, field471 = $113, field472 = $114, field473 = $115,
            field500 = $116, field501 = $117, field502 = $118, field503 = $119, field504 = $120, field506 = $121, field511 = $122, field512 = $123, field513 = $124, field520 = $125, field521 = $126, field530 = $127, field531 = $128,
            field701 = $129, field702 = $130, field704 = $131, field707 = $132, field710 = $133, field711 = $134, field716 = $135,
            field801 = $136, field803 = $137, field804 = $138, field805 = $139, field806 = $140,
            field901 = $141, field903 = $142, field904 = $143, field905 = $144, field906 = $145, field907 = $146, field910 = $147, field911 = $148, field924 = $149, field926 = $150, field927 = $151, field928 = $152,
            field952 = $153, field953 = $154, field956 = $155, field957 = $156, field958 = $157, field959 = $158, field963 = $159, field964 = $160, field965 = $161,
            field982 = $162, field983 = $163, field984 = $164, field985 = $165, field986 = $166, field987 = $167, field988 = $168, field989 = $169, field990 = $170, field991 = $171, field992 = $172, field993 = $173, field994 = $174, field995 = $175, field996 = $176, field997 = $177, field998 = $178, field999 = $179
        WHERE id = $180`

	// ✅ CORRECT: Use individual field values directly from struct fields (Source: models.txt)
	result, err := r.db.Exec(query,
		now, // $1 - updated_at
		sfaf.Field005, sfaf.Field006, sfaf.Field007, sfaf.Field010, sfaf.Field013, sfaf.Field014, sfaf.Field015, sfaf.Field016, sfaf.Field017, sfaf.Field018, sfaf.Field019, sfaf.Field020,
		sfaf.Field102, sfaf.Field103, sfaf.Field105, sfaf.Field106, sfaf.Field107, sfaf.Field108, sfaf.Field110, sfaf.Field111, sfaf.Field112, sfaf.Field113, sfaf.Field114, sfaf.Field115, sfaf.Field116, sfaf.Field117, sfaf.Field118,
		sfaf.Field130, sfaf.Field131, sfaf.Field140, sfaf.Field141, sfaf.Field142, sfaf.Field143, sfaf.Field144, sfaf.Field145, sfaf.Field146, sfaf.Field147, sfaf.Field151, sfaf.Field152,
		sfaf.Field200, sfaf.Field201, sfaf.Field202, sfaf.Field203, sfaf.Field204, sfaf.Field205, sfaf.Field206, sfaf.Field207, sfaf.Field208, sfaf.Field209,
		sfaf.Field300, sfaf.Field301, sfaf.Field302, sfaf.Field303, sfaf.Field304, sfaf.Field306,
		sfaf.Field315, sfaf.Field316, sfaf.Field317, sfaf.Field318, sfaf.Field319, sfaf.Field321,
		sfaf.Field340, sfaf.Field341, sfaf.Field342, sfaf.Field343, sfaf.Field344, sfaf.Field345, sfaf.Field346, sfaf.Field347, sfaf.Field348, sfaf.Field349,
		sfaf.Field354, sfaf.Field355, sfaf.Field356, sfaf.Field357, sfaf.Field358, sfaf.Field359, sfaf.Field360, sfaf.Field361, sfaf.Field362, sfaf.Field363, sfaf.Field364, sfaf.Field365, sfaf.Field373, sfaf.Field374,
		sfaf.Field400, sfaf.Field401, sfaf.Field403, sfaf.Field406, sfaf.Field407, sfaf.Field408, sfaf.Field415, sfaf.Field416, sfaf.Field417, sfaf.Field418, sfaf.Field419,
		sfaf.Field440, sfaf.Field442, sfaf.Field443,
		sfaf.Field453, sfaf.Field454, sfaf.Field455, sfaf.Field456, sfaf.Field457, sfaf.Field458, sfaf.Field459, sfaf.Field460, sfaf.Field461, sfaf.Field462, sfaf.Field463, sfaf.Field470, sfaf.Field471, sfaf.Field472, sfaf.Field473,
		sfaf.Field500, sfaf.Field501, sfaf.Field502, sfaf.Field503, sfaf.Field504, sfaf.Field506, sfaf.Field511, sfaf.Field512, sfaf.Field513, sfaf.Field520, sfaf.Field521, sfaf.Field530, sfaf.Field531,
		sfaf.Field701, sfaf.Field702, sfaf.Field704, sfaf.Field707, sfaf.Field710, sfaf.Field711, sfaf.Field716,
		sfaf.Field801, sfaf.Field803, sfaf.Field804, sfaf.Field805, sfaf.Field806,
		sfaf.Field901, sfaf.Field903, sfaf.Field904, sfaf.Field905, sfaf.Field906, sfaf.Field907, sfaf.Field910, sfaf.Field911, sfaf.Field924, sfaf.Field926, sfaf.Field927, sfaf.Field928,
		sfaf.Field952, sfaf.Field953, sfaf.Field956, sfaf.Field957, sfaf.Field958, sfaf.Field959, sfaf.Field963, sfaf.Field964, sfaf.Field965,
		sfaf.Field982, sfaf.Field983, sfaf.Field984, sfaf.Field985, sfaf.Field986, sfaf.Field987, sfaf.Field988, sfaf.Field989, sfaf.Field990, sfaf.Field991, sfaf.Field992, sfaf.Field993, sfaf.Field994, sfaf.Field995, sfaf.Field996, sfaf.Field997, sfaf.Field998, sfaf.Field999,
		sfaf.ID) // $180 - WHERE clause

	if err != nil {
		return fmt.Errorf("failed to update SFAF: %w", err)
	}

	// Check if any rows were affected
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("SFAF with ID %s not found", sfaf.ID)
	}

	return nil
}

func (r *SFAFRepository) Delete(id string) error {
	log.Printf("🗑️ Delete called for SFAF ID: %s", id)

	sfafID, err := uuid.Parse(id)
	if err != nil {
		log.Printf("❌ Failed to parse UUID: %v", err)
		return err
	}
	log.Printf("✓ Parsed UUID: %s", sfafID)

	// First, get the SFAF record to find its serial number and marker_id
	var serial string
	var markerID sql.NullString
	getSerialQuery := `
		SELECT field102, marker_id
		FROM sfafs
		WHERE id = $1
	`
	log.Printf("🔍 Querying for SFAF serial and marker with ID: %s", sfafID)
	err = r.db.QueryRow(getSerialQuery, sfafID).Scan(&serial, &markerID)
	if err != nil {
		// If record doesn't exist, that's okay - nothing to delete
		if err.Error() == "sql: no rows in result set" {
			log.Printf("⚠️ SFAF record not found (already deleted?): %s", sfafID)
			return nil
		}
		log.Printf("❌ Error getting SFAF serial: %v", err)
		return fmt.Errorf("failed to get SFAF serial: %w", err)
	}
	log.Printf("✓ Found SFAF with serial: %s, marker_id: %v", serial, markerID)

	// Delete related frequency assignments with this serial
	deleteFreqAssignmentsQuery := `DELETE FROM frequency_assignments WHERE serial = $1`
	log.Printf("🗑️ Deleting frequency assignments for serial: %s", serial)
	result, err := r.db.Exec(deleteFreqAssignmentsQuery, serial)
	if err != nil {
		log.Printf("❌ Error deleting frequency assignments: %v", err)
		return fmt.Errorf("failed to delete frequency assignments: %w", err)
	}
	rowsAffected, _ := result.RowsAffected()
	log.Printf("✓ Deleted %d frequency assignments", rowsAffected)

	// Delete the SFAF record first (must be deleted before marker due to foreign key)
	query := `DELETE FROM sfafs WHERE id = $1`
	log.Printf("🗑️ Deleting SFAF record: %s", sfafID)
	result, err = r.db.Exec(query, sfafID)
	if err != nil {
		log.Printf("❌ Error deleting SFAF record: %v", err)
		return err
	}
	rowsAffected, _ = result.RowsAffected()
	log.Printf("✓ Successfully deleted SFAF record (rows affected: %d)", rowsAffected)

	// Delete associated marker if it exists
	if markerID.Valid {
		deleteMarkerQuery := `DELETE FROM markers WHERE id = $1`
		log.Printf("🗑️ Deleting associated marker: %s", markerID.String)
		result, err = r.db.Exec(deleteMarkerQuery, markerID.String)
		if err != nil {
			log.Printf("❌ Error deleting marker: %v", err)
			return fmt.Errorf("failed to delete marker: %w", err)
		}
		rowsAffected, _ = result.RowsAffected()
		log.Printf("✓ Successfully deleted marker (rows affected: %d)", rowsAffected)
	} else {
		log.Printf("ℹ️ No marker associated with this SFAF (Pool Assignment?)")
	}

	return nil
}

// DeleteAll deletes all SFAF records and their associated markers
func (r *SFAFRepository) DeleteAll() (int, error) {
	log.Printf("🗑️ Delete All SFAFs called")

	// Count total records before deletion
	var count int
	countQuery := `SELECT COUNT(*) FROM sfafs`
	err := r.db.QueryRow(countQuery).Scan(&count)
	if err != nil {
		log.Printf("❌ Failed to count SFAFs: %v", err)
		return 0, fmt.Errorf("failed to count SFAFs: %w", err)
	}
	log.Printf("📊 Found %d SFAF records to delete", count)

	// Delete all SFAFs (cascading deletes will handle field occurrences)
	deleteQuery := `DELETE FROM sfafs`
	log.Printf("🗑️ Deleting all SFAF records...")
	result, err := r.db.Exec(deleteQuery)
	if err != nil {
		log.Printf("❌ Error deleting all SFAF records: %v", err)
		return 0, fmt.Errorf("failed to delete all SFAFs: %w", err)
	}
	rowsAffected, _ := result.RowsAffected()
	log.Printf("✓ Successfully deleted %d SFAF records", rowsAffected)

	// Delete all markers (SFAFs are deleted first, so no FK constraint issues)
	deleteMarkersQuery := `DELETE FROM markers`
	log.Printf("🗑️ Deleting all marker records...")
	result, err = r.db.Exec(deleteMarkersQuery)
	if err != nil {
		log.Printf("❌ Error deleting all markers: %v", err)
		return int(rowsAffected), fmt.Errorf("deleted SFAFs but failed to delete markers: %w", err)
	}
	markersAffected, _ := result.RowsAffected()
	log.Printf("✓ Successfully deleted %d markers", markersAffected)

	log.Printf("✅ Delete All completed: %d SFAFs and %d markers deleted", rowsAffected, markersAffected)
	return count, nil
}

func (r *SFAFRepository) SaveSFAF(sfaf *models.SFAF) error {
	// Check if exists, then update or create
	existing, err := r.GetByID(sfaf.ID.String())
	if err != nil {
		return err
	}

	if existing != nil {
		return r.Update(sfaf)
	}

	return r.Create(sfaf)
}

func (r *SFAFRepository) GetPaginated(offset, limit int) ([]*models.SFAF, error) {
	// ✅ CORRECT: Use individual field columns from sfafs table with COALESCE to handle NULLs
	query := `
        SELECT id, marker_id, created_at, updated_at,
               COALESCE(field005, ''), COALESCE(field006, ''), COALESCE(field007, ''), COALESCE(field010, ''), COALESCE(field013, ''), COALESCE(field014, ''), COALESCE(field015, ''), COALESCE(field016, ''), COALESCE(field017, ''), COALESCE(field018, ''), COALESCE(field019, ''), COALESCE(field020, ''),
               COALESCE(field102, ''), COALESCE(field103, ''), COALESCE(field105, ''), COALESCE(field106, ''), COALESCE(field107, ''), COALESCE(field108, ''), COALESCE(field110, ''), COALESCE(field111, ''), COALESCE(field112, ''), COALESCE(field113, ''), COALESCE(field114, ''), COALESCE(field115, ''), COALESCE(field116, ''), COALESCE(field117, ''), COALESCE(field118, ''),
               COALESCE(field130, ''), COALESCE(field131, ''), field140, field141, field142, field143, COALESCE(field144, ''), COALESCE(field145, ''), COALESCE(field146, ''), COALESCE(field147, ''), COALESCE(field151, ''), COALESCE(field152, ''),
               COALESCE(field200, ''), COALESCE(field201, ''), COALESCE(field202, ''), COALESCE(field203, ''), COALESCE(field204, ''), COALESCE(field205, ''), COALESCE(field206, ''), COALESCE(field207, ''), COALESCE(field208, ''), COALESCE(field209, ''),
               COALESCE(field300, ''), COALESCE(field301, ''), COALESCE(field302, ''), COALESCE(field303, ''), COALESCE(field304, ''), COALESCE(field306, ''),
               field315, field316, field317, COALESCE(field318, ''), field319, field321,
               COALESCE(field340, ''), COALESCE(field341, ''), COALESCE(field342, ''), COALESCE(field343, ''), COALESCE(field344, ''), COALESCE(field345, ''), COALESCE(field346, ''), COALESCE(field347, ''), COALESCE(field348, ''), COALESCE(field349, ''),
               COALESCE(field354, ''), COALESCE(field355, ''), field356, field357, field358, field359, field360, field361, COALESCE(field362, ''), COALESCE(field363, ''), field364, field365, COALESCE(field373, ''), COALESCE(field374, ''),
               COALESCE(field400, ''), COALESCE(field401, ''), COALESCE(field403, ''), COALESCE(field406, ''), COALESCE(field407, ''), COALESCE(field408, ''), field415, field416, field417, COALESCE(field418, ''), field419,
               COALESCE(field440, ''), COALESCE(field442, ''), COALESCE(field443, ''),
               COALESCE(field453, ''), COALESCE(field454, ''), COALESCE(field455, ''), field456, field457, field458, field459, field460, field461, COALESCE(field462, ''), COALESCE(field463, ''), field470, field471, field472, COALESCE(field473, ''),
               COALESCE(field500, ''), COALESCE(field501, ''), COALESCE(field502, ''), COALESCE(field503, ''), COALESCE(field504, ''), COALESCE(field506, ''), COALESCE(field511, ''), COALESCE(field512, ''), COALESCE(field513, ''), COALESCE(field520, ''), COALESCE(field521, ''), COALESCE(field530, ''), COALESCE(field531, ''),
               COALESCE(field701, ''), COALESCE(field702, ''), COALESCE(field704, ''), COALESCE(field707, ''), COALESCE(field710, ''), COALESCE(field711, ''), COALESCE(field716, ''),
               COALESCE(field801, ''), COALESCE(field803, ''), COALESCE(field804, ''), field805, COALESCE(field806, ''),
               COALESCE(field901, ''), COALESCE(field903, ''), field904, COALESCE(field905, ''), COALESCE(field906, ''), COALESCE(field907, ''), COALESCE(field910, ''), field911, COALESCE(field924, ''), field926, field927, field928,
               COALESCE(field952, ''), COALESCE(field953, ''), COALESCE(field956, ''), field957, COALESCE(field958, ''), COALESCE(field959, ''), COALESCE(field963, ''), field964, field965,
               COALESCE(field982, ''), COALESCE(field983, ''), COALESCE(field984, ''), COALESCE(field985, ''), COALESCE(field986, ''), COALESCE(field987, ''), COALESCE(field988, ''), COALESCE(field989, ''), COALESCE(field990, ''), COALESCE(field991, ''), COALESCE(field992, ''), COALESCE(field993, ''), COALESCE(field994, ''), COALESCE(field995, ''), COALESCE(field996, ''), COALESCE(field997, ''), COALESCE(field998, ''), COALESCE(field999, '')
        FROM sfafs
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2`

	rows, err := r.db.Query(query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query paginated SFAF records: %w", err)
	}
	defer rows.Close()

	var sfafs []*models.SFAF
	for rows.Next() {
		var sfaf models.SFAF

		// ✅ CORRECT: Scan all individual fields directly into struct fields (Source: models.txt)
		err := rows.Scan(
			&sfaf.ID, &sfaf.MarkerID, &sfaf.CreatedAt, &sfaf.UpdatedAt,
			&sfaf.Field005, &sfaf.Field006, &sfaf.Field007, &sfaf.Field010, &sfaf.Field013, &sfaf.Field014, &sfaf.Field015, &sfaf.Field016, &sfaf.Field017, &sfaf.Field018, &sfaf.Field019, &sfaf.Field020,
			&sfaf.Field102, &sfaf.Field103, &sfaf.Field105, &sfaf.Field106, &sfaf.Field107, &sfaf.Field108, &sfaf.Field110, &sfaf.Field111, &sfaf.Field112, &sfaf.Field113, &sfaf.Field114, &sfaf.Field115, &sfaf.Field116, &sfaf.Field117, &sfaf.Field118,
			&sfaf.Field130, &sfaf.Field131, &sfaf.Field140, &sfaf.Field141, &sfaf.Field142, &sfaf.Field143, &sfaf.Field144, &sfaf.Field145, &sfaf.Field146, &sfaf.Field147, &sfaf.Field151, &sfaf.Field152,
			&sfaf.Field200, &sfaf.Field201, &sfaf.Field202, &sfaf.Field203, &sfaf.Field204, &sfaf.Field205, &sfaf.Field206, &sfaf.Field207, &sfaf.Field208, &sfaf.Field209,
			&sfaf.Field300, &sfaf.Field301, &sfaf.Field302, &sfaf.Field303, &sfaf.Field304, &sfaf.Field306,
			&sfaf.Field315, &sfaf.Field316, &sfaf.Field317, &sfaf.Field318, &sfaf.Field319, &sfaf.Field321,
			&sfaf.Field340, &sfaf.Field341, &sfaf.Field342, &sfaf.Field343, &sfaf.Field344, &sfaf.Field345, &sfaf.Field346, &sfaf.Field347, &sfaf.Field348, &sfaf.Field349,
			&sfaf.Field354, &sfaf.Field355, &sfaf.Field356, &sfaf.Field357, &sfaf.Field358, &sfaf.Field359, &sfaf.Field360, &sfaf.Field361, &sfaf.Field362, &sfaf.Field363, &sfaf.Field364, &sfaf.Field365, &sfaf.Field373, &sfaf.Field374,
			&sfaf.Field400, &sfaf.Field401, &sfaf.Field403, &sfaf.Field406, &sfaf.Field407, &sfaf.Field408, &sfaf.Field415, &sfaf.Field416, &sfaf.Field417, &sfaf.Field418, &sfaf.Field419,
			&sfaf.Field440, &sfaf.Field442, &sfaf.Field443,
			&sfaf.Field453, &sfaf.Field454, &sfaf.Field455, &sfaf.Field456, &sfaf.Field457, &sfaf.Field458, &sfaf.Field459, &sfaf.Field460, &sfaf.Field461, &sfaf.Field462, &sfaf.Field463, &sfaf.Field470, &sfaf.Field471, &sfaf.Field472, &sfaf.Field473,
			&sfaf.Field500, &sfaf.Field501, &sfaf.Field502, &sfaf.Field503, &sfaf.Field504, &sfaf.Field506, &sfaf.Field511, &sfaf.Field512, &sfaf.Field513, &sfaf.Field520, &sfaf.Field521, &sfaf.Field530, &sfaf.Field531,
			&sfaf.Field701, &sfaf.Field702, &sfaf.Field704, &sfaf.Field707, &sfaf.Field710, &sfaf.Field711, &sfaf.Field716,
			&sfaf.Field801, &sfaf.Field803, &sfaf.Field804, &sfaf.Field805, &sfaf.Field806,
			&sfaf.Field901, &sfaf.Field903, &sfaf.Field904, &sfaf.Field905, &sfaf.Field906, &sfaf.Field907, &sfaf.Field910, &sfaf.Field911, &sfaf.Field924, &sfaf.Field926, &sfaf.Field927, &sfaf.Field928,
			&sfaf.Field952, &sfaf.Field953, &sfaf.Field956, &sfaf.Field957, &sfaf.Field958, &sfaf.Field959, &sfaf.Field963, &sfaf.Field964, &sfaf.Field965,
			&sfaf.Field982, &sfaf.Field983, &sfaf.Field984, &sfaf.Field985, &sfaf.Field986, &sfaf.Field987, &sfaf.Field988, &sfaf.Field989, &sfaf.Field990, &sfaf.Field991, &sfaf.Field992, &sfaf.Field993, &sfaf.Field994, &sfaf.Field995, &sfaf.Field996, &sfaf.Field997, &sfaf.Field998, &sfaf.Field999,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan SFAF record: %w", err)
		}

		sfafs = append(sfafs, &sfaf)
	}

	// Check for iteration errors
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over SFAF rows: %w", err)
	}

	return sfafs, nil
}

func (r *SFAFRepository) GetCount() (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM sfafs`
	err := r.db.QueryRow(query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count SFAF records: %w", err)
	}
	return count, nil
}

// CreateSFAFField inserts a multi-occurrence field into the sfaf_fields table
func (r *SFAFRepository) CreateSFAFField(field *models.SFAFField) error {
	query := `INSERT INTO sfaf_fields (id, marker_id, field_number, field_value, occurrence_number, created_at)
	          VALUES ($1, $2, $3, $4, $5, $6)`
	_, err := r.db.Exec(query,
		field.ID, field.MarkerID, field.FieldNumber,
		field.FieldValue, field.OccurrenceNumber, field.CreatedAt)
	return err
}

func (r *SFAFRepository) GetAllWithMarkers() ([]*models.SFAF, error) {
	query := `
        SELECT 
            s.id, s.marker_id, s.created_at, s.updated_at,
            s.field005, s.field006, s.field007, s.field010, s.field013, s.field014, s.field015, s.field016, s.field017, s.field018, s.field019, s.field020,
            s.field102, s.field103, s.field105, s.field106, s.field107, s.field108, s.field110, s.field111, s.field112, s.field113, s.field114, s.field115, s.field116, s.field117, s.field118,
            -- ... all other SFAF fields from repositories.txt ...
            s.field999,
            m.serial, m.frequency, m.latitude, m.longitude, m.notes
        FROM sfafs s 
        INNER JOIN markers m ON s.marker_id = m.id
        ORDER BY s.created_at DESC`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query SFAF records with markers: %w", err)
	}
	defer rows.Close()

	var sfafs []*models.SFAF
	for rows.Next() {
		var sfaf models.SFAF
		var markerSerial, markerFreq, markerNotes string
		var markerLat, markerLng float64

		// Scan SFAF fields and marker data (Source: repositories.txt scan pattern)
		err := rows.Scan(
			&sfaf.ID, &sfaf.MarkerID, &sfaf.CreatedAt, &sfaf.UpdatedAt,
			&sfaf.Field005, &sfaf.Field006, &sfaf.Field007, &sfaf.Field010, &sfaf.Field013, &sfaf.Field014, &sfaf.Field015, &sfaf.Field016, &sfaf.Field017, &sfaf.Field018, &sfaf.Field019, &sfaf.Field020,
			// ... continue with all SFAF fields from repositories.txt ...
			&sfaf.Field999,
			&markerSerial, &markerFreq, &markerLat, &markerLng, &markerNotes,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan SFAF record with marker: %w", err)
		}

		// Store marker data in SFAF for convenience (optional enhancement)
		// This would require adding marker fields to SFAF model or using a separate struct

		sfafs = append(sfafs, &sfaf)
	}

	return sfafs, nil
}

// GetSFAFFieldsByMarkerAndField retrieves all occurrences of a specific field for a marker
// Used for Field 530 polygon coordinates (530, 530/2, 530/3, etc.)
func (r *SFAFRepository) GetSFAFFieldsByMarkerAndField(markerID uuid.UUID, fieldNumber string) ([]models.SFAFField, error) {
	query := `
		SELECT id, marker_id, field_number, field_value, occurrence_number, created_at
		FROM sfaf_fields
		WHERE marker_id = $1 AND field_number = $2
		ORDER BY occurrence_number ASC
	`
	var fields []models.SFAFField
	err := r.db.Select(&fields, query, markerID, fieldNumber)
	return fields, err
}

// GetMarkersWithField retrieves all marker IDs that have a specific field number
// Used to find all markers with Field 530 polygon data
func (r *SFAFRepository) GetMarkersWithField(fieldNumber string) ([]uuid.UUID, error) {
	query := `
		SELECT DISTINCT marker_id
		FROM sfaf_fields
		WHERE field_number = $1
		ORDER BY marker_id
	`
	var markerIDs []uuid.UUID
	err := r.db.Select(&markerIDs, query, fieldNumber)
	return markerIDs, err
}

// GetMarkerByID retrieves a marker by its ID
// Used to get marker details (serial number, etc.) for polygon responses
func (r *SFAFRepository) GetMarkerByID(markerID uuid.UUID) (*models.Marker, error) {
	var marker models.Marker
	query := `
		SELECT id, serial, latitude, longitude, frequency, notes, marker_type,
		       is_draggable, created_at, updated_at
		FROM markers
		WHERE id = $1
	`
	err := r.db.Get(&marker, query, markerID)
	return &marker, err
}

// BatchCreate inserts each SFAF record individually. It returns a slice of errors
// (one per input, nil on success) so callers can skip failed records and continue.
func (r *SFAFRepository) BatchCreate(sfafs []*models.SFAF) []error {
	errs := make([]error, len(sfafs))
	now := time.Now()
	for i, sfaf := range sfafs {
		if sfaf.ID == uuid.Nil {
			sfaf.ID = uuid.New()
		}
		sfaf.CreatedAt = now
		sfaf.UpdatedAt = now

		tx, err := r.db.Beginx()
		if err != nil {
			errs[i] = fmt.Errorf("failed to begin transaction: %w", err)
			continue
		}
		err = r.execCreateInTransaction(tx, sfaf)
		if err != nil {
			tx.Rollback()
			errs[i] = err
			continue
		}
		if err = tx.Commit(); err != nil {
			errs[i] = fmt.Errorf("failed to commit: %w", err)
		}
	}
	return errs
}

// execCreateInTransaction performs the actual insert within a transaction
func (r *SFAFRepository) execCreateInTransaction(tx *sqlx.Tx, sfaf *models.SFAF) error {
	query := `
        INSERT INTO sfafs (
            id, marker_id, created_at, updated_at,
            field005, field006, field007, field010, field013, field014, field015, field016, field017, field018, field019, field020,
            field102, field103, field105, field106, field107, field108,
            field110, field111, field112, field113, field114, field115, field116, field117, field118,
            field130, field131, field140, field141, field142, field143, field144, field145, field146, field147, field151, field152,
            field200, field201, field202, field203, field204, field205, field206, field207, field208, field209,
            field300, field301, field302, field303, field304, field306,
            field315, field316, field317, field318, field319, field321,
            field340, field341, field342, field343, field344, field345, field346, field347, field348, field349,
            field354, field355, field356, field357, field358, field359, field360, field361, field362, field363, field364, field365, field373, field374,
            field400, field401, field403, field406, field407, field408,
            field415, field416, field417, field418, field419,
            field440, field442, field443,
            field453, field454, field455, field456, field457, field458, field459, field460, field461, field462, field463, field470, field471, field472, field473,
            field500, field501, field502, field503, field504, field506, field511, field512, field513, field520, field521, field530, field531,
            field701, field702, field704, field707, field710, field711, field716,
            field801, field803, field804, field805, field806,
            field901, field903, field904, field905, field906, field907, field910, field911, field924, field926, field927, field928,
            field952, field953, field956, field957, field958, field959, field963, field964, field965,
            field990, field991
        ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21, $22,
            $23, $24, $25, $26, $27, $28, $29, $30, $31,
            $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43,
            $44, $45, $46, $47, $48, $49, $50, $51, $52, $53,
            $54, $55, $56, $57, $58, $59,
            $60, $61, $62, $63, $64, $65,
            $66, $67, $68, $69, $70, $71, $72, $73, $74, $75,
            $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89,
            $90, $91, $92, $93, $94, $95,
            $96, $97, $98, $99, $100,
            $101, $102, $103,
            $104, $105, $106, $107, $108, $109, $110, $111, $112, $113, $114, $115, $116, $117, $118,
            $119, $120, $121, $122, $123, $124, $125, $126, $127, $128, $129, $130, $131,
            $132, $133, $134, $135, $136, $137, $138,
            $139, $140, $141, $142, $143,
            $144, $145, $146, $147, $148, $149, $150, $151, $152, $153, $154, $155,
            $156, $157, $158, $159, $160, $161, $162, $163, $164,
            $165, $166
        )
    `

	_, err := tx.Exec(query,
		sfaf.ID, sfaf.MarkerID, sfaf.CreatedAt, sfaf.UpdatedAt,
		sfaf.Field005, sfaf.Field006, sfaf.Field007, sfaf.Field010, sfaf.Field013, sfaf.Field014, sfaf.Field015, sfaf.Field016, sfaf.Field017, sfaf.Field018, sfaf.Field019, sfaf.Field020,
		sfaf.Field102, sfaf.Field103, sfaf.Field105, sfaf.Field106, sfaf.Field107, sfaf.Field108,
		sfaf.Field110, sfaf.Field111, sfaf.Field112, sfaf.Field113, sfaf.Field114, sfaf.Field115, sfaf.Field116, sfaf.Field117, sfaf.Field118,
		sfaf.Field130, sfaf.Field131, sfaf.Field140, sfaf.Field141, sfaf.Field142, sfaf.Field143, sfaf.Field144, sfaf.Field145, sfaf.Field146, sfaf.Field147, sfaf.Field151, sfaf.Field152,
		sfaf.Field200, sfaf.Field201, sfaf.Field202, sfaf.Field203, sfaf.Field204, sfaf.Field205, sfaf.Field206, sfaf.Field207, sfaf.Field208, sfaf.Field209,
		sfaf.Field300, sfaf.Field301, sfaf.Field302, sfaf.Field303, sfaf.Field304, sfaf.Field306,
		sfaf.Field315, sfaf.Field316, sfaf.Field317, sfaf.Field318, sfaf.Field319, sfaf.Field321,
		sfaf.Field340, sfaf.Field341, sfaf.Field342, sfaf.Field343, sfaf.Field344, sfaf.Field345, sfaf.Field346, sfaf.Field347, sfaf.Field348, sfaf.Field349,
		sfaf.Field354, sfaf.Field355, sfaf.Field356, sfaf.Field357, sfaf.Field358, sfaf.Field359, sfaf.Field360, sfaf.Field361, sfaf.Field362, sfaf.Field363, sfaf.Field364, sfaf.Field365, sfaf.Field373, sfaf.Field374,
		sfaf.Field400, sfaf.Field401, sfaf.Field403, sfaf.Field406, sfaf.Field407, sfaf.Field408,
		sfaf.Field415, sfaf.Field416, sfaf.Field417, sfaf.Field418, sfaf.Field419,
		sfaf.Field440, sfaf.Field442, sfaf.Field443,
		sfaf.Field453, sfaf.Field454, sfaf.Field455, sfaf.Field456, sfaf.Field457, sfaf.Field458, sfaf.Field459, sfaf.Field460, sfaf.Field461, sfaf.Field462, sfaf.Field463, sfaf.Field470, sfaf.Field471, sfaf.Field472, sfaf.Field473,
		sfaf.Field500, sfaf.Field501, sfaf.Field502, sfaf.Field503, sfaf.Field504, sfaf.Field506, sfaf.Field511, sfaf.Field512, sfaf.Field513, sfaf.Field520, sfaf.Field521, sfaf.Field530, sfaf.Field531,
		sfaf.Field701, sfaf.Field702, sfaf.Field704, sfaf.Field707, sfaf.Field710, sfaf.Field711, sfaf.Field716,
		sfaf.Field801, sfaf.Field803, sfaf.Field804, sfaf.Field805, sfaf.Field806,
		sfaf.Field901, sfaf.Field903, sfaf.Field904, sfaf.Field905, sfaf.Field906, sfaf.Field907, sfaf.Field910, sfaf.Field911, sfaf.Field924, sfaf.Field926, sfaf.Field927, sfaf.Field928,
		sfaf.Field952, sfaf.Field953, sfaf.Field956, sfaf.Field957, sfaf.Field958, sfaf.Field959, sfaf.Field963, sfaf.Field964, sfaf.Field965,
		sfaf.Field990, sfaf.Field991,
	)

	return err
}
