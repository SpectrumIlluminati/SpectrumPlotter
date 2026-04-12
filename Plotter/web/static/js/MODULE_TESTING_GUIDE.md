# Module Refactoring - Testing Guide

## Summary of Changes

### Before Refactoring
- **map.js**: 1,602 lines (monolithic file)
- All functionality in one file

### After Refactoring
- **map.js**: 415 lines (**74% reduction**)
- **6 focused modules**: 2,020 lines extracted
- Total: 2,435 lines (modular architecture)

## Module Architecture

```
Leaflet & External Libraries
        │
        ▼
┌────────────────────────────────┐
│   APIClient (272 lines)        │ ← All API communication
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│   TooltipManager (213 lines)   │ ← Tooltip rendering & caching
└────────────┬───────────────────┘
             │
    ┌────────┴────────┬──────────────────┬
    ▼                 ▼                  ▼
┌─────────┐    ┌──────────────┐   ┌─────────────┐
│UIHelpers│    │MarkerManager │   │CircleManager│
│265 lines│    │280 lines     │   │410 lines    │
└─────────┘    └──────────────┘   └─────────────┘
    │                 │                  │
    └─────────────────┴──────────────────┘
                      │
                      ▼
            ┌──────────────────────┐
            │  SFAFIntegration     │
            │  580 lines           │
            └──────────────────────┘
                      │
                      ▼
            ┌──────────────────────┐
            │  map.js (Main App)   │
            │  415 lines           │
            └──────────────────────┘
```

## Testing Checklist

### ✅ Phase 1: Module Loading (Critical)

Open browser console (F12) and verify:

1. **No console errors on page load**
   ```
   Expected: No red errors
   Look for: "🗺️ Initializing SFAF Plotter..."
   ```

2. **All modules loaded successfully**
   ```javascript
   // Test in browser console:
   console.log(window.APIClient);        // Should show object
   console.log(window.TooltipManager);   // Should show object
   console.log(window.UIHelpers);        // Should show object
   console.log(window.MarkerManager);    // Should show object
   console.log(window.CircleManager);    // Should show object
   console.log(window.SFAFIntegration);  // Should show object
   ```

3. **Backward compatibility maintained**
   ```javascript
   // Test in browser console:
   console.log(window.markers);              // Should show Map
   console.log(window.geometries);           // Should show Map
   console.log(window.currentSelectedMarker); // Should show null or marker
   ```

### ✅ Phase 2: Marker Functionality

1. **Existing markers load on page load**
   - Check console for: "✅ Markers loaded"
   - Verify markers appear on map
   - Verify marker tooltips show DMS coordinates
   - Expected: ~32 markers with tooltips

2. **Create new marker**
   - Use Leaflet Draw marker tool
   - Click on map to place marker
   - Verify marker appears with green icon
   - Verify tooltip appears with coordinates

3. **Drag marker**
   - Drag existing marker to new location
   - Verify tooltip updates immediately
   - Check console for: "✅ Marker position saved to server" (after 500ms)

4. **Click marker**
   - Click on any marker
   - Verify sidebar opens
   - Verify "Object" tab appears
   - Verify SFAF form is populated

### ✅ Phase 3: Circle Functionality

1. **Create authorization circle**
   - Use Leaflet Draw circle tool
   - Draw circle on map
   - **Verify modal dialog appears** with:
     - Center coordinates (Decimal & DMS)
     - Radius input field
     - Unit selection (km/NM radio buttons)
     - Cancel and Create buttons

2. **Circle creation**
   - Enter radius (e.g., 5)
   - Select unit (km or NM)
   - Click "Create Circle"
   - Verify:
     - Modal closes
     - Circle appears with correct size
     - Circle tooltip shows:
       - Serial number
       - Center coordinates (Dec & DMS)
       - Radius in both km and NM
       - Area in square miles
       - Field 306 value
     - Center marker appears
     - **Marker tooltip is hidden** (circle tooltip takes precedence)

3. **Edit circle**
   - Click Edit tool (pencil icon)
   - Move circle or resize
   - Click Save
   - Verify:
     - Tooltip updates with new coordinates
     - Console shows: "✅ Circle updated"

4. **Click circle**
   - Click on circle
   - Verify sidebar opens with SFAF form
   - Verify Field 306 is populated (e.g., "5B" for 5km, "5T" for 5NM)

### ✅ Phase 4: SFAF Integration

1. **Open SFAF form**
   - Click marker or circle
   - Verify sidebar opens
   - Verify "Object" tab is visible and active
   - Verify Field 303 (Antenna Coordinates) is auto-populated
   - Verify Field 403 (Receiver Coordinates) is auto-populated

2. **Field 306 Authorization Radius**
   - Enter value in Field 306 (e.g., "10B" for 10km)
   - Verify:
     - Preview circle appears (dashed red)
     - Preview circle has correct radius
   - Clear Field 306
   - Verify preview circle disappears

3. **Save SFAF data**
   - Fill in form fields
   - Click "Save SFAF" button
   - Verify notification: "✅ SFAF data saved successfully!"

4. **Validate SFAF data**
   - Click "Validate SFAF" button
   - Verify:
     - Valid fields show green borders
     - Invalid fields show red borders with error messages

5. **Export SFAF data**
   - Click "Export SFAF" button
   - Verify JSON file downloads
   - File name format: `SFAF_<serial>_<date>.json`

6. **Delete SFAF/marker**
   - Click "Delete Object" button
   - Verify confirmation dialog
   - Click OK
   - Verify:
     - Marker removed from map
     - Sidebar closes
     - Notification: "✅ Object deleted successfully!"

### ✅ Phase 5: UI Components

1. **Sidebar**
   - Click marker → sidebar opens
   - Click X button → sidebar closes
   - Click empty map → sidebar closes

2. **Tab switching**
   - Click "Overview" tab → Overview content shows
   - Click "Object" tab → Object form shows
   - Verify active tab has blue underline

3. **Notifications**
   - Perform actions (save, delete, etc.)
   - Verify notifications appear:
     - Top-right corner
     - Color-coded (green=success, red=error)
     - Auto-dismiss after 4 seconds

4. **MC4EB Pub 7 CHG 1 Compliance Notification**
   - Import SFAF data (if import feature exists)
   - Verify compliance notification shows:
     - Center of screen
     - Blue gradient background
     - Success/skipped counts
     - "MC4EB Pub 7 CHG 1 (08 May 2025)" reference

### ✅ Phase 6: Performance & Caching

1. **Coordinate caching**
   ```javascript
   // Test in console:
   TooltipManager.getCacheStats()
   // Should show: { size: <number>, maxSize: 1000 }
   ```

2. **No duplicate API calls**
   - Open Network tab in DevTools
   - Hover over same marker multiple times
   - Verify `/api/convert-coords` is NOT called repeatedly for same coordinates

3. **Debounced marker drag**
   - Drag marker quickly across map
   - Release
   - Verify only ONE `/api/markers/<id>` PUT request (after 500ms delay)

### ✅ Phase 7: Error Handling

1. **API failures**
   - Stop the backend server
   - Try to create marker
   - Verify error appears in console
   - Restart server

2. **Invalid input**
   - Try to create circle with negative radius
   - Verify red border on input
   - Verify circle not created

## Common Issues & Solutions

### Issue: "ReferenceError: APIClient is not defined"
**Solution**: Check that `/js/modules/api-client.js` is loaded before map.js

### Issue: Markers load but no tooltips
**Solution**:
- Check console for coordinate conversion errors
- Verify `/api/convert-coords` endpoint is working
- Test: `APIClient.convertCoordinates(30.43, -86.695)`

### Issue: Modal doesn't appear when creating circle
**Solution**:
- Verify `CircleManager.promptCircleRadius` is defined
- Check for z-index conflicts in CSS

### Issue: SFAF form doesn't populate
**Solution**:
- Verify field IDs match SFAF_FIELD_MAPPING
- Check `/api/sfaf/object-data/<id>` response
- Test: `SFAFIntegration.openSidebar(<marker_id>)`

## Performance Benchmarks

### Expected Performance

- **Initial load**: < 2 seconds
- **Marker creation**: < 500ms
- **Circle modal display**: < 100ms
- **SFAF form population**: < 300ms
- **Tooltip cache hit**: < 1ms
- **Tooltip cache miss**: < 100ms (API call)

### Memory Usage

- **Coordinate cache**: Max 1000 entries (~100KB)
- **Markers Map**: ~50 entries typical (~10KB)
- **Geometries Map**: ~10 entries typical (~5KB)

## Success Criteria

### ✅ All tests pass
### ✅ No console errors
### ✅ No broken functionality from original map.js
### ✅ Performance is equivalent or better
### ✅ Code is more maintainable (74% reduction in main file)

## Rollback Plan

If critical issues are found:

1. **Immediate rollback**:
   ```bash
   # Restore original map.js from git/backup
   git checkout web/static/js/map.js

   # Comment out module imports in map_viewer.html
   # Reload page
   ```

2. **Gradual rollback**:
   - Keep modules loaded
   - Add back missing functions to map.js
   - Debug specific module

## Next Steps After Testing

1. **Documentation**:
   - Add JSDoc comments to all public functions
   - Create API documentation for each module

2. **Testing**:
   - Write unit tests for each module
   - Create integration tests

3. **Optimization**:
   - Implement service worker for offline support
   - Add module bundling/minification

## Notes

- Server must be running on port 8080
- All endpoints must be accessible
- Database must be populated with test data
- Browser: Chrome/Firefox/Edge (modern versions)
