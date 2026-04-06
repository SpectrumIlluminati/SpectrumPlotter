package repositories

import (
	"database/sql"
	"encoding/json"

	"fmt"
	"sfaf-plotter/models"

	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type GeometryRepository struct {
	db *sqlx.DB
}

func NewGeometryRepository(db *sqlx.DB) *GeometryRepository {
	return &GeometryRepository{db: db}
}

func (r *GeometryRepository) Create(geometry *models.Geometry) error {
	if geometry.ID == uuid.Nil {
		geometry.ID = uuid.New()
	}
	now := time.Now()
	geometry.CreatedAt = now
	geometry.UpdatedAt = now

	// Create coordinates JSONB
	coordinatesJSON, err := json.Marshal(map[string]interface{}{
		"latitude":  geometry.Latitude,
		"longitude": geometry.Longitude,
	})
	if err != nil {
		return fmt.Errorf("failed to serialize coordinates: %w", err)
	}

	// Create properties JSONB based on geometry type
	var propertiesJSON []byte
	switch geometry.Type {
	case models.GeometryTypeCircle:
		if geometry.CircleProps != nil {
			propertiesJSON, err = json.Marshal(geometry.CircleProps)
		}
	case models.GeometryTypePolygon:
		if geometry.PolygonProps != nil {
			propertiesJSON, err = json.Marshal(geometry.PolygonProps)
		}
	case models.GeometryTypeRectangle:
		if geometry.RectangleProps != nil {
			propertiesJSON, err = json.Marshal(geometry.RectangleProps)
		}
	}

	if err != nil {
		return fmt.Errorf("failed to serialize properties: %w", err)
	}

	// CORRECTED: Use actual database schema
	query := `
        INSERT INTO geometries (
            id, marker_id, type, color, coordinates, properties,
            created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err = r.db.Exec(query,
		geometry.ID, geometry.MarkerID, geometry.Type, geometry.Color,
		coordinatesJSON, propertiesJSON,
		geometry.CreatedAt, geometry.UpdatedAt)

	return err
}

// Enhanced Update method using the new serialization
func (r *GeometryRepository) Update(geometry *models.Geometry) error {
	geometry.UpdatedAt = time.Now()

	// FIXED: Correct method call with proper variable assignment
	circlePropsJSON, polygonPropsJSON, rectanglePropsJSON, err := r.serializeGeometryProperties(geometry)
	if err != nil {
		return fmt.Errorf("failed to serialize geometry properties for update: %w", err)
	}

	// Create coordinates JSONB
	coordinatesJSON, err := json.Marshal(map[string]interface{}{
		"latitude":  geometry.Latitude,
		"longitude": geometry.Longitude,
	})
	if err != nil {
		return fmt.Errorf("failed to serialize coordinates: %w", err)
	}

	// Select appropriate properties based on type
	var propertiesJSON []byte
	switch geometry.Type {
	case models.GeometryTypeCircle:
		propertiesJSON = circlePropsJSON
	case models.GeometryTypePolygon:
		propertiesJSON = polygonPropsJSON
	case models.GeometryTypeRectangle:
		propertiesJSON = rectanglePropsJSON
	}

	query := `
        UPDATE geometries
        SET type = $2, color = $3, coordinates = $4, properties = $5, updated_at = $6
        WHERE id = $1`

	result, err := r.db.Exec(query,
		geometry.ID, geometry.Type, geometry.Color, coordinatesJSON, propertiesJSON, geometry.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to update geometry in database: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("geometry with ID %s not found", geometry.ID)
	}

	return nil
}

func (r *GeometryRepository) GetByID(id string) (*models.Geometry, error) {
	geometryID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid geometry ID format: %w", err)
	}

	var geometry models.Geometry
	var coordinatesJSON, propertiesJSON []byte

	// FIXED: Include marker_id in SELECT statement
	query := `
        SELECT id, marker_id, type, color, coordinates, properties, created_at, updated_at
        FROM geometries
        WHERE id = $1`

	err = r.db.QueryRow(query, geometryID).Scan(
		&geometry.ID, &geometry.MarkerID, &geometry.Type, &geometry.Color,
		&coordinatesJSON, &propertiesJSON,
		&geometry.CreatedAt, &geometry.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get geometry: %w", err)
	}

	// ... existing deserialization logic

	return &geometry, nil
}

func (r *GeometryRepository) GetAll() ([]*models.Geometry, error) {
	query := `
        SELECT id, marker_id, type, color, coordinates, properties,
               created_at, updated_at
        FROM geometries
        ORDER BY created_at DESC`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query geometries: %w", err)
	}
	defer rows.Close()

	var geometries []*models.Geometry
	for rows.Next() {
		var geometry models.Geometry
		var coordinatesJSON, propertiesJSON []byte

		err := rows.Scan(
			&geometry.ID, &geometry.MarkerID, &geometry.Type, &geometry.Color,
			&coordinatesJSON, &propertiesJSON,
			&geometry.CreatedAt, &geometry.UpdatedAt)

		if err != nil {
			return nil, fmt.Errorf("failed to scan geometry row: %w", err)
		}

		// Deserialize coordinates
		var coords map[string]float64
		if err := json.Unmarshal(coordinatesJSON, &coords); err != nil {
			return nil, fmt.Errorf("failed to unmarshal coordinates: %w", err)
		}
		geometry.Latitude = coords["latitude"]
		geometry.Longitude = coords["longitude"]

		// Deserialize properties based on type
		switch geometry.Type {
		case models.GeometryTypeCircle:
			var circleProps models.CircleGeometry
			if err := json.Unmarshal(propertiesJSON, &circleProps); err != nil {
				return nil, fmt.Errorf("failed to unmarshal circle properties: %w", err)
			}
			geometry.CircleProps = &circleProps

		case models.GeometryTypePolygon:
			var polygonProps models.PolygonGeometry
			if err := json.Unmarshal(propertiesJSON, &polygonProps); err != nil {
				return nil, fmt.Errorf("failed to unmarshal polygon properties: %w", err)
			}
			geometry.PolygonProps = &polygonProps

		case models.GeometryTypeRectangle:
			var rectangleProps models.RectangleGeometry
			if err := json.Unmarshal(propertiesJSON, &rectangleProps); err != nil {
				return nil, fmt.Errorf("failed to unmarshal rectangle properties: %w", err)
			}
			geometry.RectangleProps = &rectangleProps
		}

		geometries = append(geometries, &geometry)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over geometry rows: %w", err)
	}

	return geometries, nil
}

func (r *GeometryRepository) GetByType(geometryType models.GeometryType) ([]*models.Geometry, error) {
	query := `
        SELECT id, marker_id, type, color, coordinates, properties,
               created_at, updated_at
        FROM geometries
        WHERE type = $1
        ORDER BY created_at DESC`

	rows, err := r.db.Query(query, geometryType)
	if err != nil {
		return nil, fmt.Errorf("failed to query geometries by type: %w", err)
	}
	defer rows.Close()

	var geometries []*models.Geometry
	for rows.Next() {
		var geometry models.Geometry
		var coordinatesJSON, propertiesJSON []byte

		err := rows.Scan(
			&geometry.ID, &geometry.MarkerID, &geometry.Type, &geometry.Color,
			&coordinatesJSON, &propertiesJSON,
			&geometry.CreatedAt, &geometry.UpdatedAt)

		if err != nil {
			return nil, fmt.Errorf("failed to scan geometry row: %w", err)
		}

		var coords map[string]float64
		if err := json.Unmarshal(coordinatesJSON, &coords); err != nil {
			return nil, fmt.Errorf("failed to unmarshal coordinates: %w", err)
		}
		geometry.Latitude = coords["latitude"]
		geometry.Longitude = coords["longitude"]

		switch geometry.Type {
		case models.GeometryTypeCircle:
			var circleProps models.CircleGeometry
			if err := json.Unmarshal(propertiesJSON, &circleProps); err != nil {
				return nil, fmt.Errorf("failed to unmarshal circle properties: %w", err)
			}
			geometry.CircleProps = &circleProps
		case models.GeometryTypePolygon:
			var polygonProps models.PolygonGeometry
			if err := json.Unmarshal(propertiesJSON, &polygonProps); err != nil {
				return nil, fmt.Errorf("failed to unmarshal polygon properties: %w", err)
			}
			geometry.PolygonProps = &polygonProps
		case models.GeometryTypeRectangle:
			var rectangleProps models.RectangleGeometry
			if err := json.Unmarshal(propertiesJSON, &rectangleProps); err != nil {
				return nil, fmt.Errorf("failed to unmarshal rectangle properties: %w", err)
			}
			geometry.RectangleProps = &rectangleProps
		}

		geometries = append(geometries, &geometry)
	}

	return geometries, nil
}

func (r *GeometryRepository) Delete(id string) error {
	geometryID, err := uuid.Parse(id)
	if err != nil {
		return fmt.Errorf("invalid geometry ID format: %w", err)
	}

	query := `DELETE FROM geometries WHERE id = $1`
	result, err := r.db.Exec(query, geometryID)
	if err != nil {
		return fmt.Errorf("failed to delete geometry: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("geometry with ID %s not found", id)
	}

	return nil
}

func (r *GeometryRepository) DeleteByType(geometryType models.GeometryType) error {
	query := `DELETE FROM geometries WHERE type = $1`
	_, err := r.db.Exec(query, geometryType)
	if err != nil {
		return fmt.Errorf("failed to delete geometries by type: %w", err)
	}

	return nil
}

func (r *GeometryRepository) DeleteAll() error {
	query := `DELETE FROM geometries`
	_, err := r.db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to delete all geometries: %w", err)
	}

	return nil
}

func (r *GeometryRepository) GetByMarkerID(markerID string) ([]*models.Geometry, error) {
	query := `
        SELECT id, marker_id, type, color, coordinates, properties,
               created_at, updated_at
        FROM geometries
        WHERE marker_id = $1
        ORDER BY created_at DESC`

	rows, err := r.db.Query(query, markerID)
	if err != nil {
		return nil, fmt.Errorf("failed to query geometries by marker_id: %w", err)
	}
	defer rows.Close()

	var geometries []*models.Geometry
	for rows.Next() {
		var geometry models.Geometry
		var coordinatesJSON, propertiesJSON []byte

		err := rows.Scan(
			&geometry.ID, &geometry.MarkerID, &geometry.Type, &geometry.Color,
			&coordinatesJSON, &propertiesJSON,
			&geometry.CreatedAt, &geometry.UpdatedAt)

		if err != nil {
			return nil, fmt.Errorf("failed to scan geometry row: %w", err)
		}

		var coords map[string]float64
		if err := json.Unmarshal(coordinatesJSON, &coords); err != nil {
			return nil, fmt.Errorf("failed to unmarshal coordinates: %w", err)
		}
		geometry.Latitude = coords["latitude"]
		geometry.Longitude = coords["longitude"]

		switch geometry.Type {
		case models.GeometryTypeCircle:
			var circleProps models.CircleGeometry
			if err := json.Unmarshal(propertiesJSON, &circleProps); err != nil {
				return nil, fmt.Errorf("failed to unmarshal circle properties: %w", err)
			}
			geometry.CircleProps = &circleProps
		case models.GeometryTypePolygon:
			var polygonProps models.PolygonGeometry
			if err := json.Unmarshal(propertiesJSON, &polygonProps); err != nil {
				return nil, fmt.Errorf("failed to unmarshal polygon properties: %w", err)
			}
			geometry.PolygonProps = &polygonProps
		case models.GeometryTypeRectangle:
			var rectangleProps models.RectangleGeometry
			if err := json.Unmarshal(propertiesJSON, &rectangleProps); err != nil {
				return nil, fmt.Errorf("failed to unmarshal rectangle properties: %w", err)
			}
			geometry.RectangleProps = &rectangleProps
		}

		geometries = append(geometries, &geometry)
	}

	return geometries, nil
}

func (r *GeometryRepository) Count() (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM geometries`
	err := r.db.QueryRow(query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count geometries: %w", err)
	}

	return count, nil
}

func (r *GeometryRepository) CountByType(geometryType models.GeometryType) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM geometries WHERE type = $1`
	err := r.db.QueryRow(query, geometryType).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count geometries by type: %w", err)
	}

	return count, nil
}

// Helper method to deserialize properties based on geometry type
func (r *GeometryRepository) deserializeProperties(
	geometry *models.Geometry,
	circlePropsJSON, polygonPropsJSON, rectanglePropsJSON []byte,
) error {
	// Validate geometry object
	if geometry == nil {
		return fmt.Errorf("geometry object cannot be nil")
	}

	// Handle properties based on geometry type with enhanced error reporting
	switch geometry.Type {
	case models.GeometryTypeCircle:
		if len(circlePropsJSON) > 0 {
			var circleProps models.CircleGeometry
			if err := json.Unmarshal(circlePropsJSON, &circleProps); err != nil {
				return fmt.Errorf("failed to unmarshal circle properties for geometry ID %s: %w",
					geometry.ID, err)
			}

			// Validate circle properties
			if err := r.validateCircleProperties(&circleProps); err != nil {
				return fmt.Errorf("invalid circle properties for geometry ID %s: %w",
					geometry.ID, err)
			}

			geometry.CircleProps = &circleProps
		}

	case models.GeometryTypePolygon:
		if len(polygonPropsJSON) > 0 {
			var polygonProps models.PolygonGeometry
			if err := json.Unmarshal(polygonPropsJSON, &polygonProps); err != nil {
				return fmt.Errorf("failed to unmarshal polygon properties for geometry ID %s: %w",
					geometry.ID, err)
			}

			// Validate polygon properties
			if err := r.validatePolygonProperties(&polygonProps); err != nil {
				return fmt.Errorf("invalid polygon properties for geometry ID %s: %w",
					geometry.ID, err)
			}

			geometry.PolygonProps = &polygonProps
		}

	case models.GeometryTypeRectangle:
		if len(rectanglePropsJSON) > 0 {
			var rectangleProps models.RectangleGeometry
			if err := json.Unmarshal(rectanglePropsJSON, &rectangleProps); err != nil {
				return fmt.Errorf("failed to unmarshal rectangle properties for geometry ID %s: %w",
					geometry.ID, err)
			}

			// Validate rectangle properties
			if err := r.validateRectangleProperties(&rectangleProps); err != nil {
				return fmt.Errorf("invalid rectangle properties for geometry ID %s: %w",
					geometry.ID, err)
			}

			geometry.RectangleProps = &rectangleProps
		}

	default:
		return fmt.Errorf("unsupported geometry type: %s for geometry ID %s",
			geometry.Type, geometry.ID)
	}

	return nil
}

// SaveGeometry is an alias for Create to maintain compatibility
func (r *GeometryRepository) SaveGeometry(geometry *models.Geometry) error {
	return r.Create(geometry)
}

// Enhanced validation methods for database integrity
func (r *GeometryRepository) validateCircleProperties(props *models.CircleGeometry) error {
	if props.Radius <= 0 {
		return fmt.Errorf("circle radius must be positive, got: %f", props.Radius)
	}
	if props.RadiusKm <= 0 {
		return fmt.Errorf("circle radius in km must be positive, got: %f", props.RadiusKm)
	}
	if props.RadiusNm <= 0 {
		return fmt.Errorf("circle radius in nautical miles must be positive, got: %f", props.RadiusNm)
	}
	if props.Area < 0 {
		return fmt.Errorf("circle area cannot be negative, got: %f", props.Area)
	}
	return nil
}

func (r *GeometryRepository) validatePolygonProperties(props *models.PolygonGeometry) error {
	if len(props.Points) < 3 {
		return fmt.Errorf("polygon must have at least 3 points, got: %d", len(props.Points))
	}
	if props.Vertices != len(props.Points) {
		return fmt.Errorf("vertex count mismatch: expected %d, got %d", len(props.Points), props.Vertices)
	}
	if props.Area < 0 {
		return fmt.Errorf("polygon area cannot be negative, got: %f", props.Area)
	}
	return nil
}

func (r *GeometryRepository) validateRectangleProperties(props *models.RectangleGeometry) error {
	if len(props.Bounds) != 2 {
		return fmt.Errorf("rectangle must have exactly 2 boundary points, got: %d", len(props.Bounds))
	}
	if props.Area < 0 {
		return fmt.Errorf("rectangle area cannot be negative, got: %f", props.Area)
	}
	return nil
}

func (r *GeometryRepository) serializeGeometryProperties(geometry *models.Geometry) ([]byte, []byte, []byte, error) {
	var circleJSON, polygonJSON, rectangleJSON []byte
	var err error

	// Serialize based on geometry type (Source: table_info.txt shows separate JSONB columns)
	switch geometry.Type {
	case models.GeometryTypeCircle:
		if geometry.CircleProps != nil {
			circleJSON, err = json.Marshal(geometry.CircleProps)
			if err != nil {
				return nil, nil, nil, fmt.Errorf("failed to serialize circle properties: %w", err)
			}
		}
	case models.GeometryTypePolygon:
		if geometry.PolygonProps != nil {
			polygonJSON, err = json.Marshal(geometry.PolygonProps)
			if err != nil {
				return nil, nil, nil, fmt.Errorf("failed to serialize polygon properties: %w", err)
			}
		}
	case models.GeometryTypeRectangle:
		if geometry.RectangleProps != nil {
			rectangleJSON, err = json.Marshal(geometry.RectangleProps)
			if err != nil {
				return nil, nil, nil, fmt.Errorf("failed to serialize rectangle properties: %w", err)
			}
		}
	default:
		return nil, nil, nil, fmt.Errorf("unsupported geometry type: %s", geometry.Type)
	}

	return circleJSON, polygonJSON, rectangleJSON, nil
}
