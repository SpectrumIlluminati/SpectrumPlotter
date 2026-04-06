// utils/response_serializer.go - Add missing function
package utils

import (
	"sfaf-plotter/models"
)

func SerializeSFAFResponseWithCategories(sfaf *models.SFAF) map[string]interface{} {
	// Use ToFieldMap to get all field data (Source: models.txt)
	allFields := sfaf.ToFieldMap()

	// Organize by categories (Source: handlers.txt shows categorization)
	categorizedFields := map[string]map[string]string{
		"agency":      make(map[string]string),
		"system":      make(map[string]string),
		"location":    make(map[string]string),
		"technical":   make(map[string]string),
		"equipment":   make(map[string]string),
		"operational": make(map[string]string),
		"admin":       make(map[string]string),
		"comments":    make(map[string]string),
	}

	// Categorize fields by their number ranges
	for fieldNum, value := range allFields {
		if value == "" {
			continue // Skip empty fields
		}

		switch {
		case fieldNum >= "field100" && fieldNum < "field200":
			categorizedFields["agency"][fieldNum] = value
		case fieldNum >= "field200" && fieldNum < "field300":
			categorizedFields["system"][fieldNum] = value
		case fieldNum >= "field300" && fieldNum < "field400":
			categorizedFields["location"][fieldNum] = value
		case fieldNum >= "field400" && fieldNum < "field500":
			categorizedFields["technical"][fieldNum] = value
		case fieldNum >= "field500" && fieldNum < "field600":
			categorizedFields["equipment"][fieldNum] = value
		case fieldNum >= "field600" && fieldNum < "field800":
			categorizedFields["operational"][fieldNum] = value
		case fieldNum >= "field800" && fieldNum < "field900":
			categorizedFields["admin"][fieldNum] = value
		case fieldNum >= "field900":
			categorizedFields["comments"][fieldNum] = value
		}
	}

	return map[string]interface{}{
		"id":                 sfaf.ID,
		"marker_id":          sfaf.MarkerID,
		"all_fields":         allFields,
		"categorized_fields": categorizedFields,
		"created_at":         sfaf.CreatedAt,
		"updated_at":         sfaf.UpdatedAt,
	}
}
