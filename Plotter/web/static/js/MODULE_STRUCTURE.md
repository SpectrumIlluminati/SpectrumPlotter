# JavaScript Module Structure

## Overview

The original `map.js` (1700+ lines) has been refactored into focused, maintainable modules.

## Module Organization

```
web/static/js/
├── map.js                      (Main initialization - 200 lines)
├── modules/
│   ├── api-client.js          (API communication)
│   ├── marker-manager.js      (Marker CRUD operations)
│   ├── tooltip-manager.js     (Tooltip rendering)
│   ├── circle-manager.js      (Circle/geometry operations)
│   ├── sfaf-integration.js    (SFAF form integration)
│   └── ui-helpers.js          (Sidebar, tabs, notifications)
└── legacy/
    └── map-original.js        (Original monolithic file - backup)
```

## Module Responsibilities

### 1. **api-client.js** (~150 lines)
**Purpose**: Centralized API communication layer

**Exports**:
- `fetchMarkers()` - GET /api/markers
- `createMarker(data)` - POST /api/markers
- `updateMarker(id, data)` - PUT /api/markers/:id
- `deleteMarker(id)` - DELETE /api/markers/:id
- `convertCoordinates(lat, lng)` - GET /api/convert-coords
- `fetchSFAFData(markerId)` - GET /api/sfaf/object-data/:marker_id
- `saveSFAFData(markerId, fields)` - POST /api/sfaf
- `createCircle(data)` - POST /api/geometry/circle
- `updateCircle(id, data)` - PUT /api/geometry/circle/:id

**Benefits**:
- Single source of truth for API endpoints
- Easy to mock for testing
- Centralized error handling
- Request/response logging

---

### 2. **marker-manager.js** (~250 lines)
**Purpose**: Marker lifecycle management

**Exports**:
- `loadExistingMarkers()` - Load markers from API
- `createMarkerOnMap(markerData)` - Add marker to map
- `updateMarkerPosition(marker, lat, lng)` - Update position
- `deleteMarkerFromMap(markerId)` - Remove marker
- `getMarkerById(id)` - Retrieve marker
- `clearAllMarkers()` - Remove all markers

**Global State**:
- `markers` - Map of marker ID to Leaflet marker
- `currentSelectedMarker` - Currently selected marker

**Events**:
- Marker click handlers
- Marker drag handlers
- Marker creation/deletion

---

### 3. **tooltip-manager.js** (~200 lines)
**Purpose**: Tooltip rendering and caching

**Exports**:
- `updateMarkerTooltip(marker)` - Update marker tooltip
- `updateCircleTooltip(circle, coords)` - Update circle tooltip
- `createCircleTooltipContent(circle, coords)` - Generate tooltip HTML
- `hideMarkerTooltip(marker)` - Hide tooltip
- `showMarkerTooltip(marker)` - Show tooltip

**Features**:
- Coordinate caching (DMS conversions)
- Tooltip visibility management
- Circle vs marker tooltip logic
- Field 306 formatting

---

### 4. **circle-manager.js** (~300 lines)
**Purpose**: Circle and geometry operations

**Exports**:
- `createCircle(center, radius, unit, serial)` - Create circle
- `updateCircle(circle, data)` - Update circle properties
- `deleteCircle(circleId)` - Remove circle
- `promptCircleRadius(coords)` - Show radius input dialog
- `linkCircleToMarker(circle, marker)` - Associate circle with marker
- `updateCircleFromField306(circle, radiusValue)` - Sync from SFAF field

**Global State**:
- `geometries` - Map of geometry ID to Leaflet layer
- `authorizationCircle` - Temporary authorization radius circle

**Events**:
- Circle creation
- Circle editing (move/resize)
- Circle deletion

---

### 5. **sfaf-integration.js** (~400 lines)
**Purpose**: SFAF form integration and validation

**Exports**:
- `openSidebar(markerId)` - Load and display SFAF data
- `closeSidebar()` - Close sidebar
- `populateSFAFForm(data)` - Fill form with data
- `collectSFAFFormData()` - Gather form values
- `validateSFAF()` - Validate SFAF fields
- `saveSFAF()` - Save SFAF to backend
- `exportSFAF()` - Export SFAF to JSON
- `deleteSFAF()` - Delete SFAF record
- `setupAuthorizationRadius()` - Field 306 integration
- `updateCircleFromField306(circle, value)` - Sync circle with field

**Features**:
- MC4EB Pub 7 CHG 1 field mapping
- Form population
- Validation with visual feedback
- Authorization circle sync
- Compliance notifications

---

### 6. **ui-helpers.js** (~150 lines)
**Purpose**: UI component management

**Exports**:
- `openPersistentSidebar()` - Show sidebar
- `closePersistentSidebar()` - Hide sidebar
- `switchTab(tabId)` - Switch sidebar tabs
- `manageObjectTabVisibility(show)` - Show/hide object tab
- `showNotification(message, type)` - Display notification
- `showComplianceNotification(success, skipped)` - MC4EB notification
- `showSFAFStatusMessage(message, type)` - SFAF status notification

**Features**:
- Tab management
- Notification system
- Sidebar visibility
- Status messages

---

### 7. **map.js** (Main file - ~200 lines)
**Purpose**: Application initialization and coordination

**Responsibilities**:
- Initialize Leaflet map
- Configure base layers
- Setup drawing controls
- Wire up event handlers
- Coordinate between modules
- Initialize global state

**Global Exports**:
- `map` - Leaflet map instance
- `drawnItems` - Feature group for drawn items
- `baseMaps` - Available base map layers

---

## Import Order

```html
<!-- Core dependencies -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js"></script>

<!-- Application modules (load in dependency order) -->
<script src="/js/modules/api-client.js"></script>
<script src="/js/modules/tooltip-manager.js"></script>
<script src="/js/modules/ui-helpers.js"></script>
<script src="/js/modules/marker-manager.js"></script>
<script src="/js/modules/circle-manager.js"></script>
<script src="/js/modules/sfaf-integration.js"></script>

<!-- Main application -->
<script src="/js/map.js"></script>
```

## Module Communication

```
┌─────────────────────────────────────────────────┐
│                    map.js                       │
│         (Initialization & Coordination)         │
└─────────────────┬───────────────────────────────┘
                  │
    ┌─────────────┼─────────────┬─────────────┐
    │             │             │             │
    ▼             ▼             ▼             ▼
┌────────┐  ┌───────────┐  ┌─────────┐  ┌──────────┐
│Marker  │  │  Circle   │  │  SFAF   │  │    UI    │
│Manager │  │  Manager  │  │Integration│ │ Helpers  │
└───┬────┘  └─────┬─────┘  └────┬────┘  └────┬─────┘
    │             │              │            │
    └─────────────┴──────────────┴────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  Tooltip Mgr   │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │   API Client   │
         └────────────────┘
```

## Migration Strategy

1. **Phase 1**: Create module files with exports
2. **Phase 2**: Update map.js to import modules
3. **Phase 3**: Update HTML to load modules
4. **Phase 4**: Test functionality
5. **Phase 5**: Remove original map.js (keep as backup)

## Benefits

### Before (Monolithic)
- ❌ 1700+ lines in single file
- ❌ Difficult to navigate
- ❌ Hard to test
- ❌ Merge conflicts
- ❌ Global variable pollution

### After (Modular)
- ✅ ~200 lines per module
- ✅ Easy to find code
- ✅ Testable in isolation
- ✅ Clear dependencies
- ✅ Encapsulated state
- ✅ Reusable components
